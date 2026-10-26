from pathlib import Path

folder = Path(__file__).resolve().parents[1] / "src" / "assets" / "landing"
files = sorted([f for f in folder.iterdir() if f.name.startswith("img")])
lines = [f"export {{ default as {f.stem} }} from './{f.name}';" for f in files]
(folder / "index.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(len(files))
