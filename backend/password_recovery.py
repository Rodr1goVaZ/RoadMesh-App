"""Single-use password recovery. Raw tokens are sent by email and never persisted."""
import hashlib
import logging
import os
import secrets
import smtplib
import ssl
from datetime import timedelta
from email.message import EmailMessage
from urllib.parse import quote, urlsplit

from fastapi import HTTPException, Request
from pydantic import EmailStr, Field
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool

from access_control import StrictModel, identifier, now, password_hash, timestamp
from database_integrity import transact

logger = logging.getLogger('roadmesh.recovery')
GENERIC = {'message':'Se existir uma conta ativa para este email, receberá instruções para recuperar o acesso.'}


class RecoveryRequest(StrictModel):
    email: EmailStr


class RecoveryConfirm(StrictModel):
    token: str = Field(min_length=40,max_length=200)
    new_password: str = Field(min_length=12,max_length=72)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def delivery_config():
    url = os.environ.get('PASSWORD_RESET_URL','').strip()
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.fragment or parsed.query:
        return None
    names = ('SMTP_HOST','SMTP_USERNAME','SMTP_PASSWORD','SMTP_FROM')
    if not all(os.environ.get(n,'').strip() for n in names):
        return None
    return url


def send_reset(email, token, base_url):
    message = EmailMessage()
    message['Subject'] = 'Recuperar acesso à RoadMesh'
    message['From'] = os.environ['SMTP_FROM']
    message['To'] = email
    message.set_content('Recebemos um pedido para alterar a sua palavra-passe RoadMesh.\n\n'
        + base_url + '?token=' + quote(token,safe='') + '\n\n'
        'Este link é válido durante 20 minutos e só pode ser usado uma vez. '
        'Se não fez este pedido, ignore este email.')
    port = int(os.environ.get('SMTP_PORT','587'))
    context = ssl.create_default_context()
    if port == 465:
        connection = smtplib.SMTP_SSL(os.environ['SMTP_HOST'],port,context=context,timeout=15)
    else:
        connection = smtplib.SMTP(os.environ['SMTP_HOST'],port,timeout=15)
    with connection as smtp:
        if port != 465:
            smtp.starttls(context=context)
        smtp.login(os.environ['SMTP_USERNAME'],os.environ['SMTP_PASSWORD'])
        smtp.send_message(message)


def register_recovery(api, access):
    @api.post('/auth/forgot-password')
    async def request_recovery(body: RecoveryRequest, request: Request):
        email = str(body.email).strip().lower()
        bucket = int(now().timestamp())//900
        for scope,maximum in (('email:'+email,3),('ip:'+(request.client.host if request.client else 'unknown'),20)):
            key = 'recovery:'+digest(f'{scope}:{bucket}')
            result = await access.db.login_limits.find_one_and_update({'key':key},
                {'$inc':{'attempts':1},'$setOnInsert':{'expires_at':now()+timedelta(minutes=16)}},
                upsert=True,return_document=ReturnDocument.AFTER,projection={'_id':0})
            if result['attempts']>maximum:
                # Uniform response prevents email enumeration via throttling.
                return GENERIC
        base_url = delivery_config()
        account = await access.db.users.find_one({'email':email,'is_active':True},{'_id':0})
        if not base_url or not account:
            if not base_url:
                logger.warning('password_recovery_delivery_unconfigured')
            return GENERIC
        try:
            await access.check_account(account)
        except HTTPException:
            return GENERIC
        token = secrets.token_urlsafe(48)
        async def operation(session):
            await access.db.users.update_one({'id':account['id']},{'$inc':{'recovery_revision':1}},session=session)
            await access.db.password_resets.delete_many({'user_id':account['id']},session=session)
            await access.db.password_resets.insert_one({'id':identifier(),'user_id':account['id'],
                'workshop_id':account.get('workshop_id'),'digest':digest(token),
                'session_version':account.get('session_version',0),'expires_at':(now()+timedelta(minutes=20)).isoformat(),
                'used_at':None,'created_at':timestamp()},session=session)
        await transact(access.db,operation)
        try:
            await run_in_threadpool(send_reset,email,token,base_url)
        except Exception:
            # Log no exception text: SMTP errors may contain addresses or credentials.
            logger.error('password_recovery_delivery_failed')
            await access.db.password_resets.delete_one({'digest':digest(token)})
        return GENERIC

    @api.post('/auth/reset-password')
    async def confirm_recovery(body: RecoveryConfirm):
        hashed = await run_in_threadpool(password_hash,body.new_password)
        async def operation(session):
            reset = await access.db.password_resets.find_one_and_update(
                {'digest':digest(body.token),'used_at':None,'expires_at':{'$gt':timestamp()}},
                {'$set':{'used_at':timestamp()}},return_document=ReturnDocument.AFTER,
                projection={'_id':0},session=session)
            if not reset:
                raise HTTPException(400,'O link é inválido ou expirou. Peça um novo link.')
            account = await access.db.users.find_one({'id':reset['user_id'],'is_active':True},{'_id':0},session=session)
            if not account or account.get('session_version',0)!=reset['session_version']:
                raise HTTPException(400,'O link é inválido ou expirou. Peça um novo link.')
            # Account's workshop and client access are revalidated at next login.
            result = await access.db.users.update_one({'id':account['id'],'session_version':reset['session_version']},
                {'$set':{'password_hash':hashed,'password_change_required':False,'updated_at':timestamp()},
                 '$inc':{'session_version':1}},session=session)
            if not result.matched_count:
                raise HTTPException(400,'O link é inválido ou expirou. Peça um novo link.')
            await access.audit(account,'account.password_recovered',account.get('workshop_id'),session=session)
            return {'message':'Palavra-passe alterada. Entre novamente.'}
        return await transact(access.db,operation)
