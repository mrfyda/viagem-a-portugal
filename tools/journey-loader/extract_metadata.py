#!/usr/bin/env python3
"""Stage 1 — EXIF date + GPS, snapped to book towns, with GPS-less photos
inferred from the nearest-in-time GPS photo. Local only (shells out to exiftool).

    python3 extract_metadata.py --photos "/path/to/journey folder"

Writes <photos>/_journey/metadata.json + metadata.csv.
"""
import argparse
import csv
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402

EXIF_FIELDS = [
    "-FileName", "-MIMEType", "-DateTimeOriginal", "-CreateDate", "-CreationDate",
    "-MediaCreateDate", "-OffsetTimeOriginal", "-GPSLatitude", "-GPSLongitude",
    "-Make", "-Model",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--town", action="append", default=[], metavar="FILE=TOWN",
                    help="pin one photo's town by filename, for GPS-less photos the "
                         "author can place himself (repeatable). Beats the "
                         "nearest-in-time inference, which is wrong when the only "
                         "other photos are from another day.")
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)

    ext_args = []
    for e in ("heic", "heif", "jpg", "jpeg", "png", "tif", "tiff", "mov", "mp4"):
        ext_args += ["-ext", e]  # media only — ignore sidecar JSON/CSV/HTML outputs
    raw = subprocess.run(
        ["exiftool", "-json", "-n", "-q", *ext_args, *EXIF_FIELDS, str(args.photos)],
        capture_output=True, text=True,
    )
    data = json.loads(raw.stdout or "[]")
    towns = C.load_towns()

    pins = {}
    for spec in args.town:
        if "=" not in spec:
            sys.exit(f"--town expects FILE=TOWN, got {spec!r}")
        fn, tn = (s.strip() for s in spec.split("=", 1))
        hit = next((t for t in towns if t[0] == tn), None)
        if hit is None:
            sys.exit(f"--town: {tn!r} is not a geocoded book place")
        pins[fn] = hit

    recs = []
    for r in data:
        fn = r.get("FileName")
        if not fn:
            continue
        lat, lon = r.get("GPSLatitude"), r.get("GPSLongitude")
        recs.append({
            "file": fn, "device": r.get("Model", "(none)"),
            "is_video": fn.lower().endswith((".mov", ".mp4")),
            "_utc": C.to_utc(r), "lat": lat, "lon": lon,
            "loc_source": "exif" if lat is not None else None,
            "inferred_from": None, "inferred_gap_min": None,
        })

    for r in recs:                      # author-pinned wins over EXIF and inference
        if r["file"] in pins:
            _, r["lat"], r["lon"] = pins[r["file"]]
            r["loc_source"] = "manual"

    gps = sorted((r for r in recs if r["loc_source"] == "exif" and r["_utc"]),
                 key=lambda r: r["_utc"])

    def closest(t):
        best, bg = None, None
        for g in gps:
            gap = abs((g["_utc"] - t).total_seconds())
            if bg is None or gap < bg:
                bg, best = gap, g
        return best, bg

    for r in recs:
        if r["loc_source"] is None and r["_utc"] and gps:
            g, gap = closest(r["_utc"])
            r["lat"], r["lon"] = g["lat"], g["lon"]
            r["loc_source"], r["inferred_from"] = "inferred", g["file"]
            r["inferred_gap_min"] = round(gap / 60, 1)

    for r in recs:
        if r["lat"] is not None:
            r["town"], r["town_km"] = C.nearest_town(r["lat"], r["lon"], towns)
        else:
            r["town"], r["town_km"] = None, None

    far = datetime.max.replace(tzinfo=timezone.utc)
    out = []
    for r in sorted(recs, key=lambda r: (r["_utc"] or far)):
        out.append({
            "file": r["file"], "device": r["device"], "is_video": r["is_video"],
            "datetime_utc": C.iso(r["_utc"]),
            "lat": round(r["lat"], 6) if r["lat"] is not None else None,
            "lon": round(r["lon"], 6) if r["lon"] is not None else None,
            "loc_source": r["loc_source"], "inferred_from": r["inferred_from"],
            "inferred_gap_min": r["inferred_gap_min"],
            "town": r["town"], "town_km": r["town_km"],
        })

    (jd / "metadata.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(jd / "metadata.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    exif_n = sum(1 for r in out if r["loc_source"] == "exif")
    inf_n = sum(1 for r in out if r["loc_source"] == "inferred")
    man_n = sum(1 for r in out if r["loc_source"] == "manual")
    print(f"{len(out)} files -> {jd/'metadata.json'}  "
          f"({exif_n} GPS, {inf_n} inferred, {man_n} pinned by hand, "
          f"{len(out)-exif_n-inf_n-man_n} no location)")
    for r in out:
        if r["loc_source"] == "manual":
            print(f"  pinned: {r['file']} -> {r['town']}")


if __name__ == "__main__":
    main()
