#!/usr/bin/env python3
"""Stage 5 — local JPEG thumbnails (sips) + a self-contained selection gallery.
Open <photos>/_journey/viewer.html, click to select, then "Export selection" ->
selection.txt. LOCAL ONLY. Run after curate.py.

    python3 build_viewer.py --photos "/path/to/journey folder" [--title "Viagem II"]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--title", default=None)
    ap.add_argument("--max", type=int, default=1200, help="thumbnail long edge px")
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)
    title = args.title or args.photos.name
    thumbs = jd / "thumbs"
    thumbs.mkdir(exist_ok=True)

    meta = json.loads((jd / "metadata.json").read_text(encoding="utf-8"))
    photos = [r for r in meta if not r["is_video"]]

    # thumbnails (skip existing) — sips is built in, fully local
    made = 0
    for r in photos:
        stem = Path(r["file"]).stem
        out = thumbs / f"{stem}.jpg"
        if out.exists():
            continue
        subprocess.run(["sips", "-s", "format", "jpeg", "-Z", str(args.max),
                        str(args.photos / r["file"]), "--out", str(out)],
                       capture_output=True)
        made += 1

    data = []
    for r in sorted(photos, key=lambda r: r["datetime_utc"] or ""):
        stem = Path(r["file"]).stem
        dev = r.get("device") or ""
        data.append({
            "file": r["file"], "thumb": f"thumbs/{stem}.jpg",
            "town": r["town"] or "(no location)", "dt": r["datetime_utc"],
            "device": "SE" if "SE" in dev else ("13Pro" if "13" in dev else "?"),
            "loc": r["loc_source"] or "none", "place_only": bool(r.get("place_only")),
            "persons": r.get("persons") or 0, "faces": r.get("faces") or 0,
            "sharp": r.get("sharp") or 0, "pick": r.get("scene_rank") == 0,
        })
    order = []
    for p in data:
        if p["town"] not in order:
            order.append(p["town"])
    (jd / "viewer_data.js").write_text(
        "window.PHOTOS = " + json.dumps(data, ensure_ascii=False) + ";\n"
        "window.TOWN_ORDER = " + json.dumps(order, ensure_ascii=False) + ";\n",
        encoding="utf-8")

    tpl = (Path(__file__).parent / "viewer_template.html").read_text(encoding="utf-8")
    html = tpl.replace("__TITLE__", title).replace("__LSKEY__", "sel_" + C.slug(title))
    (jd / "viewer.html").write_text(html, encoding="utf-8")
    print(f"{len(data)} photos, {made} new thumbnails -> open {jd/'viewer.html'}")
    print("select, then Export selection -> selection.txt next to it")


if __name__ == "__main__":
    main()
