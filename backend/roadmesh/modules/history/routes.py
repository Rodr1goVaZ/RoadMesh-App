"""Bounded, tenant-scoped histories and available Lisbon calendar years."""
from fastapi import Depends, HTTPException
from roadmesh.domain.business_rules import year_scope

RESOURCES={'stock':'stock_movements','payments':'financial_movements','receipts':'order_receipts',
    'orders':'purchase_orders','services':'work_orders','quotes':'quotes','invoices':'invoices',
    'photos':'photos','damages':'damages'}


def register_history(api,db,access):
    async def scope_for(resource,user,product_id=None,work_order_id=None):
        collection=RESOURCES.get(resource)
        if not collection:
            raise HTTPException(404,'Histórico não encontrado.')
        if resource=='payments':
            await access.require_workshop_manager(user)
        scope={'workshop_id':user['workshop_id']}
        if product_id:
            if resource!='stock':
                raise HTTPException(422,'Filtro de produto inválido.')
            scope['product_id']=product_id
        if work_order_id:
            if resource!='payments':
                raise HTTPException(422,'Filtro de ordem inválido.')
            scope['work_order_id']=work_order_id
        return collection,scope

    @api.get('/history/{resource}/years')
    async def years(resource: str,product_id: str | None=None,work_order_id: str | None=None,user=Depends(access.workshop)):
        collection,scope=await scope_for(resource,user,product_id,work_order_id)
        if getattr(db,'is_postgres',False) is True:
            return await db.history_years(collection,scope)
        rows=await db[collection].aggregate([{'$match':scope},{'$project':{'year':{'$year':{
            'date':{'$dateFromString':{'dateString':'$created_at'}},'timezone':'Europe/Lisbon'}}}},
            {'$group':{'_id':'$year'}},{'$sort':{'_id':-1}}]).to_list(None)
        return [r['_id'] for r in rows if r['_id'] is not None]

    @api.get('/history/{resource}')
    async def history(resource: str,year: int | None=None,skip: int=0,limit: int=50,
            product_id: str | None=None,work_order_id: str | None=None,user=Depends(access.workshop)):
        collection,scope=await scope_for(resource,user,product_id,work_order_id)
        if skip<0 or not 1<=limit<=200:
            raise HTTPException(422,'Paginação inválida.')
        scope.update(year_scope(year))
        rows=await db[collection].find(scope,{'_id':0}).sort([('created_at',-1),('id',1)]).skip(skip).limit(limit).to_list(limit)
        return {'items':rows,'total':await db[collection].count_documents(scope),'skip':skip,'limit':limit}
