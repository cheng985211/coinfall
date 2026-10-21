import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def find_png(d):
    p = os.path.join(ROOT, "generated-images", d)
    if not os.path.isdir(p):
        return None
    pngs = sorted(f for f in os.listdir(p) if f.lower().endswith(".png"))
    if not pngs:
        return None
    return os.path.join(p, pngs[-1])

items = json.load(open(sys.argv[1], encoding="utf-8"))
ok, fail = [], []
for it in items:
    src = it.get("src") or find_png(it["dir"])
    if not src or not os.path.isfile(src):
        fail.append((it["id"], "source missing"))
        continue
    try:
        im = Image.open(src).convert("RGB")
        w, h = im.size
        im = im.crop((0, 0, w, int(h * 0.91)))
        im = im.resize((768, 1152), Image.LANCZOS)
        out = os.path.join(ROOT, it["out"])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, "WEBP", quality=82)
        ok.append((it["id"], out, im.size))
    except Exception as e:
        fail.append((it["id"], repr(e)))

print("OK:", len(ok))
for i, o, s in ok:
    print("  ", i, "->", o, s)
if fail:
    print("FAIL:", len(fail))
    for i, e in fail:
        print("  ", i, e)
