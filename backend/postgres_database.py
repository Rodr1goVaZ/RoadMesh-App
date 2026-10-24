"""PostgreSQL repository for the existing RoadMesh service layer.

Records live in the relational roadmesh tables, including normalized item rows.
The small query/update vocabulary below is the one used by the service layer;
unsupported operations fail explicitly. All filtering and aggregation run in SQL.
Identifiers are allowlisted/quoted and values are always bound parameters.
"""
from __future__ import annotations

import asyncio
import copy
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid4

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool
from pymongo.errors import DuplicateKeyError

TABLES = frozenset('workshops clients users vehicles products appointments quotes work_orders '
    'work_order_items quote_items purchase_orders purchase_order_items stock_movements '
    'media photos damages invoices counters revoked_sessions login_limits support_sessions admin_support_audit suppliers financial_movements order_receipts reorder_needs password_resets stand_inventory stand_leads stand_sales'.split())
CHILDREN = {'work_orders': ('work_order_items', 'work_order_id'),
            'quotes': ('quote_items', 'quote_id'),
            'purchase_orders': ('purchase_order_items', 'purchase_order_id')}
# A transaction-scoped lock serializes writes across API workers and pooler
# connections. Conservative for the testing rollout; reads remain concurrent.
WRITE_LOCK = 8247263981027


def json_default(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(type(value).__name__)


def json_value(value):
    return Jsonb(value, dumps=lambda obj: json.dumps(obj, default=json_default, allow_nan=False))


def project(doc, fields):
    if not fields:
        return doc
    include = {key for key, value in fields.items() if value and key != '_id'}
    if include:
        return {key: value for key, value in doc.items() if key in include}
    return {key: value for key, value in doc.items() if fields.get(key, 1)}


class PostgresDatabase:
    is_postgres = True

    def __init__(self, url):
        options = conninfo_to_dict(url)
        host = options.get('host', '')
        if host not in ('localhost', '127.0.0.1', '::1') and not host.startswith('/'):
            # Require encrypted transport for remote databases, including Supabase.
            if options.get('sslmode') not in ('verify-ca', 'verify-full'):
                url = make_conninfo(url, sslmode='require')
        # Supavisor transaction mode cannot rely on session prepared statements.
        self.pool = AsyncConnectionPool(url, open=False, min_size=0,
            max_size=int(os.environ.get('DATABASE_POOL_SIZE', '4')), timeout=15,
            kwargs={'prepare_threshold': None, 'row_factory': dict_row, 'connect_timeout': 10})
        self.columns = {}

    def __getitem__(self, name):
        if name not in TABLES:
            raise ValueError(f'Unsupported RoadMesh table: {name}')
        return Collection(self, name)

    def __getattr__(self, name):
        if name in TABLES:
            return self[name]
        raise AttributeError(name)

    async def initialize(self):
        await self.pool.open()
        async with self.connection() as conn:
            rows = await (await conn.execute("SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_schema='roadmesh'")).fetchall()
            for row in rows:
                self.columns.setdefault(row['table_name'], {})[row['column_name']] = row['udt_name']
            if any('metadata' not in self.columns.get(name, {}) for name in TABLES) or self.columns.get('work_orders', {}).get('number') != 'text':
                raise RuntimeError('Apply backend/sql/001_initial.sql 002_backend_compatibility.sql 003_business_modules.sql and 005_company_modules_stand.sql before starting PostgreSQL mode.')
            # SQL expiry checks are authoritative. Cleanup is bounded to startup.
            for name in ('revoked_sessions', 'login_limits', 'support_sessions'):
                await conn.execute(sql.SQL('DELETE FROM roadmesh.{} WHERE expires_at <= now()').format(sql.Identifier(name)))

    async def history_years(self,collection,scope):
        table=self[collection]
        condition,args=table.where(scope)
        async with self.connection() as conn:
            rows=await (await conn.execute(sql.SQL("SELECT DISTINCT extract(year FROM t.created_at AT TIME ZONE 'Europe/Lisbon')::int AS year FROM {} t WHERE {} ORDER BY year DESC").format(table.table,condition),args)).fetchall()
            return [r['year'] for r in rows]

    async def finance_summary(self, workshop_id):
        async with self.connection() as conn:
            row = await (await conn.execute("""
                WITH services AS (
                  SELECT work_order_id,
                    sum(CASE WHEN kind='charge' THEN amount ELSE 0 END) AS invoiced,
                    sum(CASE WHEN kind='credit' THEN amount ELSE 0 END) AS credited,
                    sum(CASE WHEN kind='payment' THEN amount WHEN kind='payment_reversal' THEN -amount ELSE 0 END) AS available
                  FROM roadmesh.financial_movements WHERE workshop_id=%s GROUP BY work_order_id
                ) SELECT coalesce(sum(invoiced),0) AS invoiced, coalesce(sum(credited),0) AS credited,
                  coalesce(sum(available),0) AS available,
                  coalesce(sum(greatest(invoiced-credited-available,0)),0) AS pending,
                  coalesce(sum(greatest(available+credited-invoiced,0)),0) AS refund_due FROM services
            """, (workshop_id,))).fetchone()
            return {key:float(value) for key,value in row.items()}

    async def close(self):
        await self.pool.close()

    @asynccontextmanager
    async def connection(self, session=None, write=False):
        try:
            if session is not None:
                yield session
            else:
                async with self.pool.connection() as conn:
                    async with conn.transaction():
                        await conn.execute("SET LOCAL TIME ZONE 'UTC'")
                        await conn.execute("SET LOCAL statement_timeout = '20000ms'")
                        if write:
                            await conn.execute('SELECT pg_advisory_xact_lock(%s)', (WRITE_LOCK,))
                        yield conn
        except psycopg.errors.UniqueViolation as exc:
            raise DuplicateKeyError('Duplicate RoadMesh record') from exc
        except psycopg.errors.ForeignKeyViolation as exc:
            raise HTTPException(409, 'O registo tem relações existentes ou pertence a outra oficina.') from exc
        except psycopg.errors.CheckViolation as exc:
            raise HTTPException(422, 'Os dados não respeitam as regras da base de dados.') from exc

    async def transact(self, operation):
        for attempt in range(3):
            try:
                async with self.connection(write=True) as conn:
                    return await operation(conn)
            except (psycopg.errors.SerializationFailure, psycopg.errors.DeadlockDetected):
                if attempt == 2:
                    raise HTTPException(409, 'Os dados foram alterados. Tente novamente.')
                await asyncio.sleep(0.02 * (attempt + 1))


class Collection:
    def __init__(self, db, name):
        self.db, self.name = db, name

    @property
    def table(self):
        return sql.Identifier('roadmesh', self.name)

    def document(self):
        doc = sql.SQL("t.metadata || (to_jsonb(t) - 'metadata')")
        if self.name in CHILDREN:
            child, parent = CHILDREN[self.name]
            doc = sql.SQL("({}) || jsonb_build_object('items', COALESCE((SELECT jsonb_agg(c.metadata || (to_jsonb(c) - 'metadata' - 'workshop_id' - {}) ORDER BY {}c.id) FROM roadmesh.{} c WHERE c.{} = t.id AND c.workshop_id=t.workshop_id), '[]'::jsonb))").format(
                doc, sql.Literal(parent), sql.SQL('c.position, ' if child != 'purchase_order_items' else ''),
                sql.Identifier(child), sql.Identifier(parent))
        return doc

    def field(self, key):
        if key in self.db.columns[self.name] and key != 'metadata':
            return sql.SQL('to_jsonb(t.{})').format(sql.Identifier(key))
        if '.' in key:
            raise ValueError(f'Unsupported scalar field: {key}')
        return sql.SQL('t.metadata -> {}').format(sql.Literal(key))

    def where(self, scope):
        args, clauses = [], []
        for key, value in scope.items():
            if key in ('$or', '$and'):
                parts = []
                for sub in value:
                    clause, params = self.where(sub)
                    parts.append(clause)
                    args.extend(params)
                clauses.append(sql.SQL('({})').format(sql.SQL(' OR ' if key == '$or' else ' AND ').join(parts)) if parts else sql.SQL('FALSE' if key == '$or' else 'TRUE'))
                continue
            if key == 'items.product_id':
                child, parent = CHILDREN[self.name]
                clauses.append(sql.SQL('EXISTS (SELECT 1 FROM roadmesh.{} c WHERE c.{}=t.id AND c.workshop_id=t.workshop_id AND c.product_id::text=%s)').format(sql.Identifier(child), sql.Identifier(parent)))
                args.append(value)
                continue
            field = self.field(key)
            comparisons = value if isinstance(value, dict) else {'$eq': value}
            for op, expected in comparisons.items():
                if op == '$options':
                    continue
                if op == '$exists':
                    # SQL columns always exist; optional extension fields may not.
                    clause = sql.SQL('TRUE' if expected else 'FALSE') if key in self.db.columns[self.name] else sql.SQL('(t.metadata ? {}){}').format(sql.Literal(key), sql.SQL('' if expected else ' = FALSE'))
                elif op == '$type' and expected == 'string':
                    clause = sql.SQL("jsonb_typeof({}) = 'string'").format(field)
                elif op in ('$in', '$nin'):
                    parts, nested = [], []
                    for item in expected:
                        part, params = self.where({key: item})
                        parts.append(part)
                        nested.extend(params)
                    clause = sql.SQL('({})').format(sql.SQL(' OR ').join(parts)) if parts else sql.SQL('FALSE')
                    if op == '$nin':
                        clause = sql.SQL('NOT ({})').format(clause)
                    args.extend(nested)
                elif op == '$regex':
                    if comparisons.get('$options', '') not in ('', 'i'):
                        raise ValueError('Unsupported regex flags')
                    clause = sql.SQL("COALESCE({} #>> '{{}}','') {} %s").format(field, sql.SQL('~*' if comparisons.get('$options') == 'i' else '~'))
                    args.append(expected)
                elif op in ('$eq', '$ne', '$gt', '$gte', '$lt', '$lte'):
                    operator = {'$eq':'=', '$ne':'<>', '$gt':'>', '$gte':'>=', '$lt':'<', '$lte':'<='}[op]
                    kind = self.db.columns[self.name].get(key)
                    if kind and expected is None:
                        if op not in ('$eq', '$ne'):
                            raise ValueError('Null only supports equality comparisons')
                        clause = sql.SQL('t.{} IS {}NULL').format(sql.Identifier(key),sql.SQL('NOT ' if op == '$ne' else ''))
                    elif expected is None:
                        clause = sql.SQL("COALESCE({}, 'null'::jsonb) {} 'null'::jsonb").format(field, sql.SQL(operator))
                    elif kind == 'timestamptz':
                        clause = sql.SQL('t.{} {} %s::timestamptz').format(sql.Identifier(key), sql.SQL(operator))
                        args.append(expected)
                    elif kind in ('uuid', 'text', 'bool', 'int4', 'int8', 'numeric'):
                        try:
                            native = UUID(str(expected)) if kind == 'uuid' else Decimal(str(expected)) if kind == 'numeric' else expected
                        except ValueError:
                            clause = sql.SQL('TRUE' if op == '$ne' else 'FALSE')
                        else:
                            clause = sql.SQL('t.{} {} %s').format(sql.Identifier(key),sql.SQL(operator))
                            if op == '$ne':
                                clause = sql.SQL('({} OR t.{} IS NULL)').format(clause,sql.Identifier(key))
                            args.append(native)
                    else:
                        clause = sql.SQL("COALESCE({}, 'null'::jsonb) {} %s").format(field, sql.SQL(operator))
                        args.append(json_value(expected))
                else:
                    raise ValueError(f'Unsupported query operator: {op}')
                clauses.append(clause)
        if self.name in ('revoked_sessions', 'login_limits', 'support_sessions'):
            clauses.append(sql.SQL('t.expires_at > now()'))
        return sql.SQL(' AND ').join(clauses) if clauses else sql.SQL('TRUE'), args

    def find(self, scope=None, projection=None, session=None):
        return Cursor(self, scope or {}, projection, session)

    async def find_one(self, scope, projection=None, session=None, sort=None):
        cursor = self.find(scope, projection, session)
        if sort:
            cursor.sort(sort)
        rows = await cursor.to_list(1)
        return rows[0] if rows else None

    async def count_documents(self, scope):
        condition, args = self.where(scope)
        async with self.db.connection() as conn:
            row = await (await conn.execute(sql.SQL('SELECT count(*) AS n FROM {} t WHERE {}').format(self.table, condition), args)).fetchone()
            return row['n']

    async def insert_one(self, doc, session=None):
        async with self.db.connection(session, write=True) as conn:
            await self._insert(conn, copy.deepcopy(doc))
        return SimpleNamespace(inserted_id=doc.get('id'))

    async def insert_many(self, docs, session=None):
        async with self.db.connection(session, write=True) as conn:
            for doc in docs:
                await self._insert(conn, copy.deepcopy(doc))

    async def _insert(self, conn, doc):
        if self.name == 'counters':
            kind, workshop = doc['id'].rsplit(':', 1)
            doc.update(kind=kind, workshop_id=workshop)
        if self.name == 'media':
            doc.setdefault('storage_provider', os.environ.get('STORAGE_DRIVER', 'managed'))
        if self.name == 'stock_movements':
            row = await (await conn.execute('SELECT stock FROM roadmesh.products WHERE id=%s', (UUID(doc['product_id']),))).fetchone()
            doc['balance'] = row['stock']
        items = doc.pop('items', None) if self.name in CHILDREN else None
        values, extra = self._split(doc)
        values['metadata'] = json_value(extra)
        await conn.execute(sql.SQL('INSERT INTO {} ({}) VALUES ({})').format(self.table,
            sql.SQL(',').join(map(sql.Identifier, values)), sql.SQL(',').join(sql.Placeholder() for _ in values)), list(values.values()))
        if items is not None:
            await self._items(conn, doc, items)

    def _split(self, doc):
        values, extra = {}, {}
        for key, value in doc.items():
            if key == '_id':
                continue
            kind = self.db.columns[self.name].get(key)
            if not kind or key == 'metadata':
                extra[key] = value
                continue
            if value is not None:
                if kind == 'uuid':
                    value = UUID(str(value))
                elif kind == 'jsonb':
                    value = json_value(value)
                elif kind == 'timestamptz' and isinstance(value, str):
                    value = datetime.fromisoformat(value)
                elif kind == 'numeric':
                    value = Decimal(str(value))
            values[key] = value
        return values, extra

    async def _items(self, conn, doc, items):
        name, parent = CHILDREN[self.name]
        await conn.execute(sql.SQL('DELETE FROM roadmesh.{} WHERE {}=%s AND workshop_id=%s').format(sql.Identifier(name), sql.Identifier(parent)), (UUID(doc['id']), UUID(doc['workshop_id'])))
        child = self.db[name]
        for index, item in enumerate(items):
            row = {**item, 'id': item.get('id', str(uuid4())), 'workshop_id':doc['workshop_id'], parent:doc['id']}
            if name != 'purchase_order_items':
                row['position'] = index
            await child._insert(conn, row)

    async def _mutate(self, scope, update, session, many=False, upsert=False, projection=None, after=False):
        unknown = set(update) - {'$set', '$inc', '$setOnInsert', '$push'}
        if unknown:
            raise ValueError(f'Unsupported update: {unknown}')
        async with self.db.connection(session, write=True) as conn:
            if self.name in ('revoked_sessions', 'login_limits', 'support_sessions'):
                await conn.execute(sql.SQL('DELETE FROM {} WHERE expires_at <= now()').format(self.table))
            rows = await self.find(scope, session=conn).to_list(None if many else 1)
            inserted = False
            if not rows and upsert:
                doc = {key:value for key,value in scope.items() if not key.startswith('$') and not isinstance(value, dict)}
                doc.update(update.get('$setOnInsert', {}))
                rows, inserted = [doc], True
            result = None
            for original in rows:
                doc = copy.deepcopy(original)
                doc.update(update.get('$set', {}))
                for key, value in update.get('$inc', {}).items():
                    doc[key] = float(Decimal(str(doc.get(key, 0))) + Decimal(str(value))) if isinstance(value, float) else doc.get(key, 0) + value
                for key, value in update.get('$push', {}).items():
                    doc.setdefault(key, []).append(value)
                if inserted:
                    await self._insert(conn, doc)
                else:
                    items = doc.pop('items', None) if self.name in CHILDREN else None
                    values, extra = self._split(doc)
                    values['metadata'] = json_value(extra)
                    pk = {'revoked_sessions':'jti', 'login_limits':'key', 'counters':'id'}.get(self.name, 'id')
                    # SQL DEFAULT and the API's explicit timestamps are preserved.
                    await conn.execute(sql.SQL('UPDATE {} SET {} WHERE {}=%s').format(self.table,
                        sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(k)) for k in values if k != pk), sql.Identifier(pk)),
                        [v for k,v in values.items() if k != pk] + [values[pk]])
                    if items is not None:
                        await self._items(conn, doc, items)
                        doc['items'] = items
                result = project(doc if after else original, projection)
            return SimpleNamespace(matched_count=0 if inserted else len(rows), modified_count=len(rows), value=result)

    async def update_one(self, scope, update, upsert=False, session=None):
        return await self._mutate(scope, update, session, upsert=upsert)

    async def update_many(self, scope, update, session=None):
        return await self._mutate(scope, update, session, many=True)

    async def find_one_and_update(self, scope, update, return_document=False, projection=None, upsert=False, session=None):
        result = await self._mutate(scope, update, session, projection=projection, after=bool(return_document), upsert=upsert)
        return result.value

    async def _delete(self, scope, many, session):
        async with self.db.connection(session, write=True) as conn:
            condition, args = self.where(scope)
            pk = {'revoked_sessions':'jti', 'login_limits':'key', 'counters':'id'}.get(self.name, 'id')
            if self.name == 'products':
                await conn.execute(sql.SQL("UPDATE roadmesh.stock_movements m SET metadata=m.metadata || jsonb_build_object('deleted_product_id',m.product_id,'product_name',p.name), product_id=NULL FROM {} p WHERE m.product_id=p.id AND p.id IN (SELECT t.id FROM {} t WHERE {} {})").format(self.table, self.table, condition, sql.SQL('' if many else 'LIMIT 1')), args)
            query = sql.SQL('DELETE FROM {} WHERE {} IN (SELECT t.{} FROM {} t WHERE {} {})').format(
                self.table, sql.Identifier(pk), sql.Identifier(pk), self.table, condition, sql.SQL('' if many else 'LIMIT 1'))
            result = await conn.execute(query, args)
            return SimpleNamespace(deleted_count=result.rowcount)

    async def delete_one(self, scope, session=None):
        return await self._delete(scope, False, session)

    async def delete_many(self, scope, session=None):
        return await self._delete(scope, True, session)

    def aggregate(self, pipeline):
        return Aggregate(self, pipeline)


class Cursor:
    def __init__(self, collection, scope, projection, session):
        self.collection, self.scope, self.projection, self.session = collection, scope, projection, session
        self.order, self.offset, self.maximum = [], 0, None

    def sort(self, key, direction=1):
        self.order = key if isinstance(key, list) else [(key, direction)]
        return self

    def skip(self, count):
        self.offset = count
        return self

    def limit(self, count):
        self.maximum = count
        return self

    async def to_list(self, length):
        c = self.collection
        condition, args = c.where(self.scope)
        query = sql.SQL('SELECT {} AS doc FROM {} t WHERE {}').format(c.document(), c.table, condition)
        if self.order:
            query += sql.SQL(' ORDER BY ') + sql.SQL(',').join(sql.SQL('{} {} NULLS {}').format(sql.SQL('t.{}').format(sql.Identifier(key)) if key in c.db.columns[c.name] else c.field(key), sql.SQL('DESC' if direction == -1 else 'ASC'), sql.SQL('LAST' if direction == -1 else 'FIRST')) for key, direction in self.order)
        maximum = min(length, self.maximum) if length is not None and self.maximum is not None else self.maximum if length is None else length
        if maximum is not None:
            query += sql.SQL(' LIMIT %s')
            args.append(maximum)
        if self.offset:
            query += sql.SQL(' OFFSET %s')
            args.append(self.offset)
        async with c.db.connection(self.session) as conn:
            rows = await (await conn.execute(query, args)).fetchall()
            return [project(row['doc'], self.projection) for row in rows]

    def __aiter__(self):
        async def records():
            for doc in await self.to_list(None):
                yield doc
        return records()


class Aggregate:
    def __init__(self, collection, pipeline):
        self.collection, self.pipeline = collection, pipeline

    async def to_list(self, length):
        c, p = self.collection, self.pipeline
        condition, args = c.where(p[0]['$match'])
        if c.name == 'vehicles' and p[1:] == [{'$group': {'_id':'$client_id', 'count':{'$sum':1}}}]:
            query = sql.SQL("SELECT jsonb_build_object('_id', t.client_id, 'count', count(*)) AS doc FROM {} t WHERE {} GROUP BY t.client_id").format(c.table, condition)
        elif c.name == 'invoices':
            # Exact supported service-level revenue pipeline, validated explicitly.
            from database_integrity import revenue_pipeline
            since = p[2].get('$match', {}).get('first_issued', {}).get('$gte') if len(p) == 5 else None
            if p != revenue_pipeline(p[0]['$match'], since):
                raise ValueError('Unsupported invoice aggregation')
            having = sql.SQL(' HAVING min(t.created_at) >= %s::timestamptz') if since else sql.SQL('')
            if since:
                args.append(since)
            query = sql.SQL("SELECT jsonb_build_object('total',COALESCE(sum(amount),0)) AS doc FROM (SELECT max(t.grand_total) AS amount FROM {} t WHERE {} GROUP BY t.workshop_id,t.work_order_id{}) services").format(c.table, condition, having)
        else:
            raise ValueError('Unsupported aggregation')
        async with c.db.connection() as conn:
            rows = await (await conn.execute(query, args)).fetchall()
            return [row['doc'] for row in rows][:length] if length is not None else [row['doc'] for row in rows]
