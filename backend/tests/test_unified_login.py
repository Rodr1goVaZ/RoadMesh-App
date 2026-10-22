"""Unified login identifies persisted roles without weakening area permissions."""
import os
from uuid import uuid4

import requests

from conftest import API, checked


def test_admin_uses_common_login(platform_session):
    auth = checked(requests.post(API + "/auth/login", json={
        "email": os.environ["TEST_ADMIN_EMAIL"], "password": os.environ["TEST_ADMIN_PASSWORD"],
    }, timeout=30))
    assert auth["user"]["role"] == "admin"
    assert not auth["user"]["password_change_required"]
    assert requests.get(API + "/admin/dashboard", headers={
        "Authorization": "Bearer " + auth["access_token"],
    }, timeout=30).status_code == 200


def test_staff_uses_common_login_without_admin_access(workshop_factory):
    workshop = workshop_factory("TEST_Unified_Login")
    auth = checked(requests.post(API + "/auth/login", json={
        "email": workshop["email"].upper(), "password": workshop["password"],
    }, timeout=30))
    assert auth["user"]["role"] == "workshop_staff"
    assert auth["user"]["workshop_id"] == workshop["user"]["workshop_id"]
    headers = {"Authorization": "Bearer " + auth["access_token"]}
    assert requests.get(API + "/admin/dashboard", headers=headers, timeout=30).status_code == 403
    assert requests.get(API + "/portal/vehicles", headers=headers, timeout=30).status_code == 403
    # Old area-specific API contracts still reject the wrong role.
    assert requests.post(API + "/auth/admin/login", json={
        "email": workshop["email"], "password": workshop["password"],
    }, timeout=30).status_code == 401


def test_client_common_login_preserves_first_password_change(workshop_factory):
    workshop = workshop_factory("TEST_Unified_Client")
    staff = workshop["session"]
    client = checked(staff.get(API + "/clients", timeout=30))[0]
    credentials = checked(staff.post(API + f"/clients/{client['id']}/account", json={
        "name": "Unified Client", "email": f"unified-{uuid4().hex}@test.pt",
    }, timeout=30), 201)["credentials"]
    auth = checked(requests.post(API + "/auth/login", json={
        "email": credentials["email"], "password": credentials["temporary_password"],
    }, timeout=30))
    assert auth["user"]["role"] == "client"
    assert auth["user"]["password_change_required"]
    headers = {"Authorization": "Bearer " + auth["access_token"]}
    assert requests.get(API + "/portal/vehicles", headers=headers, timeout=30).status_code == 428
    changed = checked(requests.post(API + "/auth/change-password", headers=headers, json={
        "current_password": credentials["temporary_password"],
        "new_password": "Unified-client-test-2026!",
    }, timeout=30))
    headers = {"Authorization": "Bearer " + changed["access_token"]}
    assert requests.get(API + "/portal/vehicles", headers=headers, timeout=30).status_code == 200
    assert requests.get(API + "/work-orders", headers=headers, timeout=30).status_code == 403
    assert requests.get(API + "/admin/dashboard", headers=headers, timeout=30).status_code == 403


def test_common_login_rejects_invalid_credentials(platform_session):
    wrong = requests.post(API + "/auth/login", json={
        "email": os.environ["TEST_ADMIN_EMAIL"], "password": "incorrect-password",
    }, timeout=30)
    missing = requests.post(API + "/auth/login", json={
        "email": f"missing-{uuid4().hex}@test.pt", "password": "incorrect-password",
    }, timeout=30)
    assert wrong.status_code == missing.status_code == 401
    assert wrong.json() == missing.json()
