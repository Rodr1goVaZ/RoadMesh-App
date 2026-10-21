"""Bounded request diagnostics without tokens, payloads, emails or raw URLs."""
import json
import logging
import time
from uuid import uuid4

from starlette.responses import JSONResponse

logger = logging.getLogger('roadmesh.requests')


class RequestDiagnostics:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope,receive,send)
        request_id = uuid4().hex
        start = time.monotonic()
        status = 500
        started = False
        error_type = None

        async def observed_send(message):
            nonlocal status,started
            if message['type'] == 'http.response.start':
                started = True
                status = message['status']
                message['headers'] = [*message.get('headers',[]),(b'x-request-id',request_id.encode())]
            await send(message)
        try:
            await self.app(scope,receive,observed_send)
        except Exception as exc:
            error_type = type(exc).__name__
            if started:
                raise
            response = JSONResponse({'detail':'Não foi possível concluir a operação. Tente novamente.',
                'request_id':request_id},status_code=500)
            await response(scope,receive,observed_send)
        finally:
            elapsed = round((time.monotonic()-start)*1000,1)
            route = getattr(scope.get('route'),'path','unmatched')
            event = {'event':'http_request','request_id':request_id,'method':scope['method'],
                'route':route,'status':status,'duration_ms':elapsed}
            if error_type:
                event['error_type']=error_type
            level = logging.ERROR if status>=500 else logging.WARNING if elapsed>1000 else logging.INFO
            logger.log(level,json.dumps(event,ensure_ascii=False))
