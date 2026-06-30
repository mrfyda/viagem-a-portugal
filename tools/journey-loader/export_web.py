#!/usr/bin/env python3
"""Stage 6 — selected photos -> web AVIFs in apps/blog/assets/viagem-N/.
Resized to 1600px, orientation baked, ALL EXIF stripped (incl. GPS). Names are
slug(town)-<rank>, ranked by sharpness so -1 is the natural hero. Run after curate.py.

    python3 export_web.py --photos DIR --journey N --selection <selection.txt>
"""
import argparse
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--journey", required=True, type=int)
    ap.add_argument("--selection", required=True, type=Path)
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)
    meta = {r["file"]: r for r in json.loads((jd / "metadata.json").read_text(encoding="utf-8"))}
    sel = [l.strip() for l in args.selection.read_text(encoding="utf-8").splitlines()
           if l.strip() and not l.startswith("#")]
    sel = [f for f in sel if f in meta and not meta[f]["is_video"]]

    bytown = defaultdict(list)
    for f in sel:
        bytown[meta[f]["town"] or "no-location"].append(f)
    for t in bytown:
        bytown[t].sort(key=lambda f: -(meta[f].get("sharp") or 0))  # sharpest -> -1 (hero)

    assets = C.REPO / f"apps/blog/assets/viagem-{args.journey}"
    assets.mkdir(parents=True, exist_ok=True)
    # Swift writes a lossless PNG per photo (resize + orientation + EXIF strip) into
    # a temp dir; ffmpeg then encodes each as a single-tile AVIF (Firefox-safe — the
    # macOS AVIF writer would tile them into a grid Firefox can't decode).
    pngs = jd / "png"
    pngs.mkdir(exist_ok=True)
    jobs, outputs, manifest = [], [], []
    for town, files in bytown.items():
        for i, f in enumerate(files, 1):
            name = f"{C.slug(town)}-{i}.avif" if len(files) > 1 else f"{C.slug(town)}.avif"
            png = pngs / f"{name}.png"
            jobs.append(f"{args.photos / f}\t{png}")
            outputs.append((png, assets / name))
            r = meta[f]
            manifest.append({"webfile": name, "original": f, "town": town,
                             "date": (r["datetime_utc"] or "")[:10],
                             "loc_source": r["loc_source"], "sharp": r.get("sharp")})
    tsv = jd / "avif_jobs.tsv"
    tsv.write_text("\n".join(jobs) + "\n", encoding="utf-8")
    subprocess.run(["swift", str(Path(__file__).parent / "export_avif.swift"), str(tsv)], check=True)
    # outputs and manifest are appended in lockstep above, so they align by index.
    for (png, avif), m in zip(outputs, manifest):
        C.png_to_avif(png, avif)
        m["w"], m["h"] = C.avif_dims(avif)
        png.unlink(missing_ok=True)
    manifest.sort(key=lambda m: m["date"])
    (jd / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"exported {len(outputs)} single-tile AVIFs -> {assets}")


if __name__ == "__main__":
    main()
