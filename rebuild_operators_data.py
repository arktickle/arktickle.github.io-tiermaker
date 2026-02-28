from __future__ import annotations

import base64
import json
import mimetypes
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE_DIR = ROOT / "assets" / "operators" / "all"
OUTPUT_FILE = ROOT / "data" / "operators.data.js"
ALLOWED_EXTENSIONS = {".png", ".webp", ".jpg", ".jpeg", ".gif"}
EXTENSION_PRIORITY = {".png": 0, ".webp": 1, ".jpg": 2, ".jpeg": 3, ".gif": 4}


def normalize_display_name(stem: str) -> str:
    name = stem
    if name.startswith("头像_"):
        name = name[3:]
    return name.strip() or stem


def pick_rank(path: Path) -> tuple[int, int, str]:
    has_prefix = 1 if path.stem.startswith("头像_") else 0
    ext_rank = EXTENSION_PRIORITY.get(path.suffix.lower(), 99)
    return has_prefix, ext_rank, path.name.lower()


def detect_mime(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    if ext == ".jpg" or ext == ".jpeg":
        return "image/jpeg"
    if ext == ".gif":
        return "image/gif"
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"


def main() -> None:
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"Source directory not found: {SOURCE_DIR}")

    selected: dict[str, Path] = {}
    for file in SOURCE_DIR.iterdir():
        if not file.is_file():
            continue
        if file.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue

        display_name = normalize_display_name(file.stem)
        current = selected.get(display_name)
        if current is None or pick_rank(file) < pick_rank(current):
            selected[display_name] = file

    rows = []
    for i, (name, file) in enumerate(sorted(selected.items(), key=lambda item: item[0].lower()), start=1):
        relative_path = file.relative_to(ROOT).as_posix()
        mime = detect_mime(file)
        encoded = base64.b64encode(file.read_bytes()).decode("ascii")
        rows.append(
            {
                "id": f"op_{i:04d}",
                "name": name,
                "image": relative_path,
                "imageData": f"data:{mime};base64,{encoded}",
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = "window.OPERATORS_DATA = " + json.dumps(rows, ensure_ascii=True, indent=2) + ";\n"
    OUTPUT_FILE.write_text(payload, encoding="utf-8")

    print(f"Generated {OUTPUT_FILE} with {len(rows)} operators.")


if __name__ == "__main__":
    main()
