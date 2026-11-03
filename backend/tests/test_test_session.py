"""The remote test harness must renew expiring access without masking revocation."""
import time

import jwt
import pytest
import requests

import conftest


def test_technical_session_renews_before_expiry(monkeypatch):
    calls=[]
    old=jwt.encode({'exp':time.time()+60},'isolated-test-secret-with-at-least-32-bytes',algorithm='HS256')
    new=jwt.encode({'exp':time.time()+900},'isolated-test-secret-with-at-least-32-bytes',algorithm='HS256')
    class Response:
        status_code=200
        def json(self):return {'access_token':new}
    def send(self,method,url,**kwargs):
        calls.append((method,url,self.headers.get('Authorization')))
        return Response()
    monkeypatch.setattr(requests.Session,'request',send)
    session=conftest.RenewingTestSession();session.headers['Authorization']='Bearer '+old
    session.get(conftest.API+'/admin/dashboard')
    assert calls[0][1].endswith('/auth/refresh')
    assert calls[1][2]=='Bearer '+new


def test_failed_renewal_is_not_hidden_by_login_or_request_retry(monkeypatch):
    calls=[]
    class Response:
        status_code=401
        text='revoked'
    def send(self,method,url,**kwargs):
        calls.append(url);return Response()
    monkeypatch.setattr(requests.Session,'request',send)
    session=conftest.RenewingTestSession()
    session.headers['Authorization']='Bearer '+jwt.encode({'exp':time.time()+60},'isolated-test-secret-with-at-least-32-bytes',algorithm='HS256')
    with pytest.raises(AssertionError):session.get(conftest.API+'/admin/dashboard')
    assert calls==[conftest.API+'/auth/refresh']


def test_idle_worker_keeps_technical_session_active_without_new_login(monkeypatch):
    session=conftest.RenewingTestSession();calls=[]
    class Stop:
        count=0
        def wait(self,seconds):
            self.count+=1
            return self.count>1
    session._stop=Stop()
    monkeypatch.setattr(session,'_renew_if_due',lambda:calls.append('renew'))
    session._keepalive()
    assert calls==['renew']
