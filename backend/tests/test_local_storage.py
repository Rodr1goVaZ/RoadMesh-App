"""Local images remain private and persist independently of the API process."""
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from media_storage import init_storage, storage_request  # noqa: E402


@pytest.fixture
def local_media(monkeypatch, tmp_path):
    monkeypatch.setenv("STORAGE_DRIVER", "local")
    monkeypatch.setenv("LOCAL_MEDIA_ROOT", str(tmp_path / "images"))
    init_storage()
    return tmp_path / "images"


def test_local_image_roundtrip_and_persistence(local_media):
    payload = b"test-image-binary"
    result = storage_request("PUT", "roadmesh/uploads/owner/id.jpg", data=payload)
    assert result.json()["path"] == "roadmesh/uploads/owner/id.jpg"
    assert storage_request("GET", result.json()["path"]).content == payload
    # Reinitializing storage does not discard files, unlike the old test double.
    init_storage()
    assert storage_request("GET", result.json()["path"]).content == payload
    assert (local_media / result.json()["path"]).read_bytes() == payload


@pytest.mark.parametrize("path", ["../outside.jpg", "/outside.jpg", "", ".", "a/../../outside.jpg"])
def test_local_storage_rejects_traversal(local_media, path):
    with pytest.raises(HTTPException) as error:
        storage_request("PUT", path, data=b"forbidden")
    assert error.value.status_code == 422


def test_local_missing_image_returns_404(local_media):
    with pytest.raises(HTTPException) as error:
        storage_request("GET", "roadmesh/uploads/missing.jpg")
    assert error.value.status_code == 404
