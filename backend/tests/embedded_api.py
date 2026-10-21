"""PGlite-only test transport. Production continues to use server-side binding.

pglite-socket 0.2.13 mishandles extended-protocol error/Sync recovery. A
single-connection reproduction fails with Cursor and passes twenty recovery
cycles with ClientCursor. Use Psycopg's quoted simple protocol for this test
server only; this is not a production fix or native concurrency evidence.
"""
import os
import sys
from pathlib import Path

import psycopg
import psycopg_pool

if os.environ.get('ROADMESH_TEST_EMBEDDED') != '1' or os.environ.get('ROADMESH_TEST_ALLOW_WRITE') != '1':
    raise RuntimeError('This module is exclusively for the isolated embedded runner')

Pool = psycopg_pool.AsyncConnectionPool


def embedded_pool(*args, **kwargs):
    kwargs.setdefault('kwargs', {})['cursor_factory'] = psycopg.AsyncClientCursor
    return Pool(*args, **kwargs)


psycopg_pool.AsyncConnectionPool = embedded_pool
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import app as app  # noqa: E402
