"""Private incomplete company drafts do not provision companies or accounts."""
from conftest import API, checked


def test_draft_roundtrip_does_not_create_company_or_access(platform_session):
    url = API + '/admin/company-drafts/new'
    try:
        # Deliberately unfinished inputs must be saved without final-form validation.
        body = {'step': 3, 'form': {'name': 'TEST_Rascunho', 'manager_email': 'ainda-a-preencher', 'activity_start_date': '01/', 'nif': '123'}}
        saved = checked(platform_session.put(url, json=body))
        assert saved['version'] == 2 and saved['savedAt']
        assert checked(platform_session.get(url)) == saved
        assert saved['form']['manager_email'] == 'ainda-a-preencher'
        # Other concurrent tests may create users, so check that this draft creates no access of its own.
        assert not any(w.get('name') == 'TEST_Rascunho' for w in checked(platform_session.get(API + '/admin/workshops')))
        me = checked(platform_session.get(API + '/auth/me'))
        assert not any(key.startswith('company_draft_') for key in me)
        updated = checked(platform_session.put(url, json={'step': 1, 'form': {'name': 'TEST_Rascunho atualizado'}}))
        assert checked(platform_session.get(url)) == updated
    finally:
        checked(platform_session.delete(url))
    assert checked(platform_session.get(url)) is None


def test_draft_rejects_secret_fields_and_invalid_scope(platform_session):
    url = API + '/admin/company-drafts/new'
    for body in ({'step': 5, 'form': {}}, {'step': 0, 'form': {'password': 'must-not-store'}}, {'step': 0, 'form': {'description': 'a' * 2001}}):
        assert platform_session.put(url, json=body).status_code == 422
    assert platform_session.get(API + '/admin/company-drafts/other.account').status_code == 422


def test_drafts_are_admin_only(session_a):
    url = API + '/admin/company-drafts/new'
    session = session_a['session']
    assert session.get(url).status_code == 403
    assert session.put(url, json={'step': 0, 'form': {}}).status_code == 403
    assert session.delete(url).status_code == 403
