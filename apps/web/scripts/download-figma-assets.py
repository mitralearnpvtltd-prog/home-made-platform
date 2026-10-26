import re
import ssl
import urllib.request
from pathlib import Path

src = Path(r"C:\Users\Umme Hani\.cursor\projects\c-Users-Umme-Hani-Downloads-bus-food-delivery\agent-tools\a27aac0e-4536-492f-8c33-0fc03f44beb8.txt")
out = Path(__file__).resolve().parents[1] / "src" / "assets" / "landing"
out.mkdir(parents=True, exist_ok=True)
text = src.read_text(encoding="utf-8")
pairs = re.findall(r'const (img\w+) = "(https://www.figma.com/api/mcp/asset/[^"]+)"', text)
ctx = ssl.create_default_context()
ok = 0
failed = []
for name, url in pairs:
    ext = "svg" if url.endswith(".svg") else "png"
    dest = out / f"{name}.{ext}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=60) as response:
            dest.write_bytes(response.read())
        print(f"OK {dest.name} {dest.stat().st_size}")
        ok += 1
    except Exception as exc:
        print(f"FAIL {name} {exc}")
        failed.append(name)
print(f"done {ok}/{len(pairs)}")
if failed:
    raise SystemExit(1)
