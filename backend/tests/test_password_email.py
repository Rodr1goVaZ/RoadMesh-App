"""SMTP delivery contract without sending mail to an external recipient."""
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import roadmesh.modules.auth.recovery as recovery


@pytest.fixture
def configured_email(monkeypatch):
    values = {
        "SMTP_HOST": "smtp.example.invalid", "SMTP_USERNAME": "test-user",
        "SMTP_PASSWORD": "test-only-secret", "SMTP_FROM": "RoadMesh <no-reply@example.invalid>",
        "PASSWORD_RESET_URL": "https://roadmesh.example.invalid/reset-password",
    }
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    return values


@pytest.mark.parametrize("port", [465, 587])
def test_recovery_email_recipient_link_and_encryption(configured_email, monkeypatch, port):
    calls = []

    class MailServer:
        def __init__(self, host, supplied_port, **kwargs):
            assert host == configured_email["SMTP_HOST"] and supplied_port == port
            assert kwargs["timeout"] == 15
            assert ("context" in kwargs) == (port == 465)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def starttls(self, *, context):
            assert context.check_hostname
            calls.append("tls")

        def login(self, username, password):
            assert username == "test-user" and password == "test-only-secret"
            calls.append("login")

        def send_message(self, message):
            assert message["To"] == "client@example.invalid"
            assert message["From"] == configured_email["SMTP_FROM"]
            body = message.get_content()
            link = next(line for line in body.splitlines() if line.startswith("https://"))
            assert urlsplit(link).path == "/reset-password"
            assert parse_qs(urlsplit(link).query) == {"token": ["test-token_" * 5]}
            assert "20 minutos" in body and "uma vez" in body
            calls.append("send")

    monkeypatch.setenv("SMTP_PORT", str(port))
    monkeypatch.setattr(recovery.smtplib, "SMTP", MailServer)
    monkeypatch.setattr(recovery.smtplib, "SMTP_SSL", MailServer)
    recovery.send_reset("client@example.invalid", "test-token_" * 5, recovery.delivery_config())
    assert calls == (["tls"] if port == 587 else []) + ["login", "send"]


def test_recovery_requires_delivery_configuration(configured_email, monkeypatch):
    assert recovery.delivery_config() == configured_email["PASSWORD_RESET_URL"]
    monkeypatch.delenv("SMTP_PASSWORD")
    assert recovery.delivery_config() is None


@pytest.mark.parametrize("url", ["http://example.invalid/reset", "https://example.invalid/reset?token=x", "https://example.invalid/reset#x"])
def test_recovery_rejects_unsafe_link_configuration(configured_email, monkeypatch, url):
    monkeypatch.setenv("PASSWORD_RESET_URL", url)
    assert recovery.delivery_config() is None
