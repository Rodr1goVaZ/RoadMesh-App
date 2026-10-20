"""Serve the local demonstration and its API from one origin."""
import os
from pathlib import Path

from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

from server import app

if os.environ.get("ROADMESH_DEMO") != "1" or os.environ.get("DB_NAME") != "roadmesh_demo":
    raise RuntimeError("demo_server is only available for the isolated roadmesh_demo environment")


class DemoFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            # Expo Router deep links must return the app; API errors stay API errors.
            if exc.status_code != 404 or path == "api" or path.startswith("api/") or Path(path).suffix:
                raise
            return await super().get_response("index.html", scope)


app.mount("/", DemoFiles(directory=os.environ["DEMO_WEB_DIR"], html=True), name="demo-web")
