"""Back up and clear only the private MongoDB used by scripts/demo.py.

Run without arguments to inspect counts; --apply clears local test records.
Never reads DATABASE_URL/MONGO_URL or connects to a remote database.
"""
import argparse
import gzip
import json
from datetime import datetime, timezone
from pathlib import Path

from bson import BSON, decode_file_iter
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".demo"
ADMIN_EMAIL = "admin@roadmesh-demo.pt"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    config_path = LOCAL / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if config.get("mongo_port") != 27037:
        raise RuntimeError("A limpeza só permite o ambiente local na porta 27037.")
    with MongoClient("mongodb://127.0.0.1:27037/?replicaSet=roadmesh-demo", serverSelectionTimeoutMS=5000) as client:
        if client.admin.command("hello").get("setName") != "roadmesh-demo":
            raise RuntimeError("O servidor não é o replica set local esperado.")
        db = client["roadmesh_demo"]
        admin = db.users.find_one({"email": ADMIN_EMAIL, "role": "admin", "workshop_id": None})
        if not admin:
            raise RuntimeError("Falta o administrador local a preservar. Nada foi apagado.")
        names = sorted(name for name in db.list_collection_names() if not name.startswith("system."))
        counts = {name: db[name].count_documents({}) for name in names}
        print(json.dumps({"database": db.name, "before": counts, "apply": args.apply}))
        if not args.apply:
            return
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup = LOCAL / "backups" / ("before-clean-" + stamp)
        backup.mkdir(parents=True, exist_ok=False)
        config_backup = backup / "config.json"
        config_backup.write_bytes(config_path.read_bytes())
        for name in names:
            target = backup / (name + ".bson.gz")
            with gzip.open(target, "wb") as output:
                for doc in db[name].find({}):
                    output.write(BSON.encode(doc))
            with gzip.open(target, "rb") as source:
                if sum(1 for _ in decode_file_iter(source)) != counts[name]:
                    raise RuntimeError("A cópia não corresponde aos dados. Nada foi apagado.")
        # Persist this first so the next launch cannot recreate the deleted demo.
        config["seed_demo"] = False
        config_path.write_text(json.dumps(config), encoding="utf-8")
        with client.start_session() as session:
            with session.start_transaction():
                for name in names:
                    if name == "users":
                        db.users.delete_many({"_id": {"$ne": admin["_id"]}}, session=session)
                        drafts = {key: "" for key in admin if key.startswith("company_draft_")}
                        if drafts:
                            db.users.update_one({"_id": admin["_id"]}, {"$unset": drafts}, session=session)
                    else:
                        db[name].delete_many({}, session=session)
        media = (LOCAL / "media").resolve()
        destination = (backup / "media").resolve()
        if not media.is_relative_to(LOCAL.resolve()) or not destination.is_relative_to(LOCAL.resolve()):
            raise RuntimeError("Caminho de fotografias fora da pasta local.")
        if media.exists():
            media.rename(destination)
            media.mkdir()
        after = {name: db[name].count_documents({}) for name in names}
        (backup / "manifest.json").write_text(json.dumps({"before": counts, "after": after}, indent=2), encoding="utf-8")
        print(json.dumps({"after": after, "backup": str(backup.relative_to(ROOT)), "seed_demo": False}))


if __name__ == "__main__":
    main()
