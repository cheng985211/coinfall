import json, sys, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
jobs = json.load(open(os.path.join(ROOT, 'tools', '_art_jobs_b.json'), encoding='utf-8'))

ok, bad = [], []
for j in jobs:
    src = j['src']
    out = os.path.join(ROOT, 'assets', 'art', 'portraits', j['id'] + '.webp')
    try:
        im = Image.open(src).convert('RGB')
        w, h = im.size
        im = im.crop((0, 0, w, int(h * 0.91)))
        im = im.resize((768, 1152), Image.LANCZOS)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, 'WEBP', quality=82)
        ok.append(j['id'])
    except Exception as e:
        bad.append((j['id'], repr(e)))

print('OK:', len(ok), ok)
for i, e in bad:
    print('FAIL', i, e)
