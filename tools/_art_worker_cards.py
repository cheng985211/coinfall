"""Batch post-process generated card art into WebP.

Input: JSON array of { "id", "src", "out" } (file path or stdin).
- crop bottom 9% (watermark band)
- resize to 640x960
- save WebP quality=80
"""
import json
import os
import sys

from PIL import Image

TARGET_W, TARGET_H = 640, 960
BOTTOM_CROP = 0.09


def load_jobs():
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    raw = raw.strip()
    if not raw:
        return []
    if os.path.isfile(raw):
        with open(raw, "r", encoding="utf-8") as fh:
            return json.load(fh)
    return json.loads(raw)


def process(job):
    src, out = job["src"], job["out"]
    if not os.path.isfile(src):
        return {"id": job["id"], "ok": False, "error": "src missing: %s" % src}
    try:
        with Image.open(src) as im:
            im = im.convert("RGB")
            keep_h = int(round(im.height * (1.0 - BOTTOM_CROP)))
            im = im.crop((0, 0, im.width, keep_h))
            im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
            os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
            im.save(out, "WEBP", quality=80, method=6)
    except Exception as exc:  # noqa: BLE001
        return {"id": job["id"], "ok": False, "error": str(exc)}
    return {"id": job["id"], "ok": True, "out": out}


def main():
    jobs = load_jobs()
    results = [process(j) for j in jobs]
    ok = sum(1 for r in results if r["ok"])
    failed = [r for r in results if not r["ok"]]
    print(json.dumps({"total": len(results), "ok": ok,
                      "failed": [{"id": r["id"], "error": r["error"]} for r in failed]},
                     ensure_ascii=False, indent=2))
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())