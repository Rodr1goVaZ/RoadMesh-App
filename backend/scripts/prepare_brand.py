"""Remove the pale JPEG backdrop without regenerating the supplied logo artwork."""
from pathlib import Path
import sys
import uuid

import numpy as np
from PIL import Image
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))
from media_storage import storage_request  # noqa: E402


def prepare():
    image = Image.open(ROOT / "assets" / "roadmesh-logo.jpeg").convert("RGB")
    rgb = np.asarray(image).astype(float)
    # The supplied art is wine-red/charcoal; only the pale background has all
    # channels above 215. Keep ink intact and unmatte its antialiased edges.
    alpha = np.clip((215.0 - rgb.min(axis=2)) / 65.0, 0, 1)
    backdrop = np.array([231.0, 236.0, 248.0])
    foreground = np.clip((rgb - backdrop * (1 - alpha[..., None])) / np.maximum(alpha[..., None], .001), 0, 255)
    rgba = np.dstack([foreground, alpha * 255]).astype("uint8")
    logo = Image.fromarray(rgba)
    bounds = logo.getbbox()
    logo = logo.crop(bounds)
    # Symmetric transparent breathing room; avoid the old photo-shaped square.
    padding = 12
    canvas = Image.new("RGBA", (logo.width + padding * 2, logo.height + padding * 2))
    canvas.paste(logo, (padding, padding))
    output = ROOT / "assets" / "roadmesh-logo.png"
    canvas.save(output, optimize=True)
    path = f"roadmesh/brand/{uuid.uuid4()}.png"
    result = storage_request("PUT", path, content_type="image/png", data=output.read_bytes())
    print("Managed logo object:", result.json()["path"])
    print("Transparent logo:", output, canvas.size)
    print("Transparent pixels:", int(np.sum(np.asarray(canvas)[:, :, 3] == 0)))


if __name__ == "__main__":
    prepare()