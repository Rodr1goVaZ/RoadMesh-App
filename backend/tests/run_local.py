"""Run the API suite against disposable MongoDB and an in-memory photo store.

Usage: python tests/run_local.py [--mongod /path/to/mongod] [pytest arguments]
Needs mongod on PATH (or --mongod) and requirements-dev.txt. No existing .env,
MongoDB database, cloud storage or account is used.
"""
import argparse
import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests
from pymongo import MongoClient
from pymongo.errors import PyMongoError

ROOT = Path(__file__).resolve().parents[1]


def available_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def storage_handler():
    objects = {}

    class Handler(BaseHTTPRequestHandler):
        def reply(self, status, content, content_type="application/json"):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(content)

        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length", 0)))
            self.reply(200, b'{"storage_key":"isolated-test-storage"}')

        def do_PUT(self):
            path = self.path.split("/objects/", 1)[1]
            objects[path] = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            self.reply(200, json.dumps({"path": path}).encode())

        def do_GET(self):
            path = self.path.split("/objects/", 1)[1]
            self.reply(200 if path in objects else 404, objects.get(path, b""), "image/jpeg")

        def log_message(self, *args):
            pass

    return Handler


def wait_for(predicate, process, name):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"{name} exited with code {process.returncode}")
        try:
            if predicate():
                return
        except (requests.RequestException, PyMongoError):
            pass
        time.sleep(0.1)
    raise RuntimeError(f"{name} did not become ready within 45 seconds")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mongod", default=shutil.which("mongod"))
    parser.add_argument("--storage", choices=["local", "managed"], default="local")
    args, pytest_args = parser.parse_known_args()
    if not args.mongod:
        parser.error("Install MongoDB Community Server or provide --mongod /path/to/mongod")
    processes = []
    storage = ThreadingHTTPServer(("127.0.0.1", 0), storage_handler())
    threading.Thread(target=storage.serve_forever, daemon=True).start()
    with tempfile.TemporaryDirectory(prefix="roadmesh-test-") as directory:
        temp = Path(directory)
        mongo_port, api_port = available_port(), available_port()
        mongo_url = f"mongodb://127.0.0.1:{mongo_port}/?replicaSet=roadmesh-test"
        db_name = "roadmesh_test_" + secrets.token_hex(6)
        env = {
            **os.environ,
            "DATABASE_URL": "",
            "MONGO_URL": mongo_url,
            "DB_NAME": db_name,
            "JWT_SECRET": secrets.token_urlsafe(48),
            "BOOTSTRAP_ADMIN_EMAIL": "admin@roadmesh-test.pt",
            "BOOTSTRAP_ADMIN_PASSWORD": secrets.token_urlsafe(24),
            "EMERGENT_LLM_KEY": "isolated-test-only",
            "STORAGE_DRIVER": args.storage,
            "LOCAL_MEDIA_ROOT": str(temp / "media"),
            "INTEGRATION_PROXY_URL": f"http://127.0.0.1:{storage.server_port}",
            "EXPO_PUBLIC_BACKEND_URL": f"http://127.0.0.1:{api_port}",
            "ROADMESH_TEST_ALLOW_WRITE": "1",
            "ROADMESH_TEST_MONGO_URL": mongo_url,
            "ROADMESH_TEST_DB_NAME": db_name,
        }
        mongo = MongoClient(f"mongodb://127.0.0.1:{mongo_port}/?directConnection=true", serverSelectionTimeoutMS=500)
        try:
            with (temp / "mongo.log").open("w") as mongo_log, (temp / "api.log").open("w") as api_log:
                dbpath = temp / "db"
                dbpath.mkdir()
                mongod = subprocess.Popen([args.mongod, "--dbpath", str(dbpath), "--replSet", "roadmesh-test", "--port", str(mongo_port), "--bind_ip", "127.0.0.1"], stdout=mongo_log, stderr=subprocess.STDOUT)
                processes.append(mongod)
                wait_for(lambda: mongo.admin.command("ping").get("ok"), mongod, "MongoDB")
                mongo.admin.command("replSetInitiate", {"_id": "roadmesh-test", "members": [{"_id": 0, "host": f"127.0.0.1:{mongo_port}"}]})
                wait_for(lambda: mongo.admin.command("hello").get("isWritablePrimary"), mongod, "MongoDB primary")
                api_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", str(api_port), "--no-access-log"], cwd=ROOT, env=env, stdout=api_log, stderr=subprocess.STDOUT)
                processes.append(api_process)
                api = env["EXPO_PUBLIC_BACKEND_URL"] + "/api"
                wait_for(lambda: requests.get(api + "/", timeout=1).status_code == 200, api_process, "API")
                response = requests.post(api + "/auth/admin/login", json={"email": env["BOOTSTRAP_ADMIN_EMAIL"], "password": env["BOOTSTRAP_ADMIN_PASSWORD"]}, timeout=10)
                response.raise_for_status()
                new_password = secrets.token_urlsafe(24)
                response = requests.post(api + "/auth/change-password", headers={"Authorization": "Bearer " + response.json()["access_token"]}, json={"current_password": env["BOOTSTRAP_ADMIN_PASSWORD"], "new_password": new_password}, timeout=10)
                response.raise_for_status()
                env.update(TEST_ADMIN_EMAIL=env["BOOTSTRAP_ADMIN_EMAIL"], TEST_ADMIN_PASSWORD=new_password)
                result = subprocess.call([sys.executable, "-m", "pytest", "tests", *pytest_args], cwd=ROOT, env=env)
                if result:
                    print((temp / "api.log").read_text(), file=sys.stderr)
                return result
        except Exception:
            for name in ("api.log", "mongo.log"):
                if (temp / name).exists():
                    print((temp / name).read_text()[-8000:], file=sys.stderr)
            raise
        finally:
            mongo.close()
            for process in reversed(processes):
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            storage.shutdown()
            storage.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
