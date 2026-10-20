"""Start a persistent local demo without reading or changing either .env file."""
import argparse
import fcntl
import json
import os
import platform
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / ".demo"


def prepare_python():
    if sys.version_info < (3, 10):
        raise RuntimeError("Use Python 3.12: PYTHON=python3.12 ./dev.sh")
    python = DEMO / "venv/bin/python"
    if not python.exists():
        print("A preparar Python para a demonstração…", flush=True)
        subprocess.run([sys.executable, "-m", "venv", str(DEMO / "venv")], check=True)
    if Path(sys.prefix).resolve() != (DEMO / "venv").resolve():
        os.execv(str(python), [str(python), str(Path(__file__).resolve()), *sys.argv[1:]])
    try:
        import pymongo  # noqa: F401
        import fastapi  # noqa: F401
        import PIL  # noqa: F401
        import uvicorn  # noqa: F401
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(ROOT / "backend/requirements.txt")], check=True)


def mongo_binary(override):
    if override:
        return str(Path(override).expanduser().resolve())
    installed = shutil.which("mongod")
    if installed:
        return installed
    binary = DEMO / "mongodb/bin/mongod"
    if binary.exists():
        return str(binary)
    if platform.system() != "Darwin" or platform.machine() not in {"arm64", "x86_64"}:
        raise RuntimeError("Instale MongoDB Community Server ou use ./dev.sh --mongod /caminho/mongod")
    architecture = platform.machine()
    url = f"https://fastdl.mongodb.org/osx/mongodb-macos-{architecture}-7.0.16.tgz"
    archive = DEMO / "mongodb.tgz"
    print("A descarregar MongoDB Community Server 7.0.16 para os testes locais…", flush=True)
    with urllib.request.urlopen(url, timeout=120) as source, archive.open("wb") as destination:
        shutil.copyfileobj(source, destination)
    with tarfile.open(archive) as bundle:
        for item in bundle.getmembers():
            relative = Path(*Path(item.name).parts[1:])
            if not relative.parts:
                continue
            destination = (DEMO / "mongodb" / relative).resolve()
            if not destination.is_relative_to((DEMO / "mongodb").resolve()) or item.issym() or item.islnk():
                raise RuntimeError("O arquivo MongoDB contém um caminho inválido")
            if item.isdir():
                destination.mkdir(parents=True, exist_ok=True)
            elif item.isfile():
                destination.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(item) as source, destination.open("wb") as output:
                    shutil.copyfileobj(source, output)
                destination.chmod(item.mode & 0o777)
    archive.unlink()
    return str(binary)


def check_port(port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError as exc:
            raise RuntimeError(f"A porta {port} já está ocupada. Não foi parado nenhum serviço existente.") from exc


def wait_for(predicate, process, name):
    from pymongo.errors import PyMongoError
    import requests
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"{name} terminou inesperadamente. Consulte .demo/logs/")
        try:
            if predicate():
                return
        except (PyMongoError, requests.RequestException):
            pass
        time.sleep(.2)
    raise RuntimeError(f"{name} não ficou disponível em 60 segundos. Consulte .demo/logs/")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--mongo-port", type=int, default=27037)
    parser.add_argument("--mongod")
    parser.add_argument("--no-build", action="store_true", help="Reuse the last web build")
    parser.add_argument("--lan", action="store_true", help="Allow a phone browser on the same network")
    args = parser.parse_args()
    DEMO.mkdir(mode=0o700, exist_ok=True)
    prepare_python()
    # The open file stays locked for this runner's entire lifetime.
    lock = (DEMO / "run.lock").open("a+")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        raise RuntimeError("A demonstração já está a correr. Consulte .demo/running.json para o endereço.") from exc
    from pymongo import MongoClient
    import requests
    from demo_data import prepare_demo, ADMIN_EMAIL, STAFF_EMAIL, CLIENT_EMAIL, PASSWORD
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Instale Node.js 20 ou superior para iniciar a aplicação")
    binary = mongo_binary(args.mongod)
    check_port(args.port); check_port(args.mongo_port)
    config_file = DEMO / "config.json"
    if config_file.exists():
        config = json.loads(config_file.read_text())
        if config["mongo_port"] != args.mongo_port:
            raise RuntimeError(f"Os dados existentes usam --mongo-port {config['mongo_port']}; mantenha essa porta.")
    else:
        config = {"jwt_secret": secrets.token_urlsafe(48), "bootstrap_password": secrets.token_urlsafe(24), "mongo_port": args.mongo_port}
        config_file.write_text(json.dumps(config))
        config_file.chmod(0o600)
    env = {
        **os.environ,
        "DATABASE_URL": "",
        "MONGO_URL": f"mongodb://127.0.0.1:{args.mongo_port}/?replicaSet=roadmesh-demo",
        "DB_NAME": "roadmesh_demo",
        "JWT_SECRET": config["jwt_secret"],
        "BOOTSTRAP_ADMIN_EMAIL": ADMIN_EMAIL,
        "BOOTSTRAP_ADMIN_PASSWORD": config["bootstrap_password"],
        "STORAGE_DRIVER": "local",
        "LOCAL_MEDIA_ROOT": str(DEMO / "media"),
        "EMERGENT_LLM_KEY": "",
        "INTEGRATION_PROXY_URL": "",
        "ROADMESH_DEMO": "1",
        "DEMO_WEB_DIR": str(DEMO / "web"),
        "EXPO_NO_DOTENV": "1",
        "EXPO_NO_TELEMETRY": "1",
        "EXPO_PUBLIC_BACKEND_URL": "",
        "CORS_ORIGINS": f"http://localhost:{args.port},http://127.0.0.1:{args.port}",
    }
    frontend = ROOT / "frontend"
    if not (frontend / "node_modules/expo/bin/cli").exists():
        subprocess.run(["npx", "--yes", "yarn@1.22.22", "install", "--frozen-lockfile"], cwd=frontend, env=env, check=True)
    if not args.no_build or not (DEMO / "web/index.html").exists():
        print("A preparar a aplicação web…", flush=True)
        subprocess.run([node, str(frontend / "node_modules/expo/bin/cli"), "export", "--platform", "web", "--output-dir", str(DEMO / "web")], cwd=frontend, env=env, check=True)
    processes = []
    mongo = MongoClient(f"mongodb://127.0.0.1:{args.mongo_port}/?directConnection=true", serverSelectionTimeoutMS=500)
    logs = DEMO / "logs"; logs.mkdir(exist_ok=True)
    dbpath = DEMO / "db"; dbpath.mkdir(exist_ok=True)
    running = DEMO / "running.json"

    def interrupt(signum, frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupt)
    try:
        with (logs / "mongo.log").open("a") as mongo_log, (logs / "api.log").open("a") as api_log:
            mongod = subprocess.Popen([binary, "--dbpath", str(dbpath), "--replSet", "roadmesh-demo", "--port", str(args.mongo_port), "--bind_ip", "127.0.0.1"], stdout=mongo_log, stderr=subprocess.STDOUT)
            processes.append(mongod)
            wait_for(lambda: mongo.admin.command("ping").get("ok"), mongod, "MongoDB")
            if not mongo.admin.command("hello").get("setName"):
                mongo.admin.command("replSetInitiate", {"_id": "roadmesh-demo", "members": [{"_id": 0, "host": f"127.0.0.1:{args.mongo_port}"}]})
            wait_for(lambda: mongo.admin.command("hello").get("isWritablePrimary"), mongod, "MongoDB primary")
            api = subprocess.Popen([sys.executable, "-m", "uvicorn", "demo_server:app", "--host", "0.0.0.0" if args.lan else "127.0.0.1", "--port", str(args.port), "--no-access-log"], cwd=ROOT / "backend", env=env, stdout=api_log, stderr=subprocess.STDOUT)
            processes.append(api)
            base_url = f"http://127.0.0.1:{args.port}"
            wait_for(lambda: requests.get(base_url + "/api/", timeout=1).status_code == 200, api, "API")
            print("A preparar contas e dados de demonstração…", flush=True)
            prepare_demo(base_url, mongo["roadmesh_demo"])
            public_url = f"http://localhost:{args.port}"
            if args.lan:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                    sock.connect(("1.1.1.1", 80))
                    public_url = f"http://{sock.getsockname()[0]}:{args.port}"
            running.write_text(json.dumps({"url": public_url, "pid": os.getpid(), "api_pid": api.pid, "mongo_pid": mongod.pid}))
            print(f"\nRoadMesh pronto para testes: {public_url}\n\nOficina:       {STAFF_EMAIL}\nCliente:       {CLIENT_EMAIL}\nAdministração: {ADMIN_EMAIL}\nPalavra-passe das três contas: {PASSWORD}\n\nOs dados e fotografias ficam guardados em .demo/.\nCtrl+C para parar; ./dev.sh para voltar a iniciar.\n", flush=True)
            while True:
                time.sleep(1)
                if any(p.poll() is not None for p in processes):
                    raise RuntimeError("Um serviço terminou. Consulte .demo/logs/")
    except KeyboardInterrupt:
        print("\nA parar a demonstração; os dados ficam guardados.", flush=True)
    finally:
        mongo.close()
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill(); process.wait()
        running.unlink(missing_ok=True)
        lock.close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"\nNão foi possível iniciar: {exc}", file=sys.stderr)
        raise SystemExit(1)
