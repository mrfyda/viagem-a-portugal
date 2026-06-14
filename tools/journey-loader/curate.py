#!/usr/bin/env python3
"""Stage 4 — merge people + sharpness into metadata, cluster bursts into scenes,
and rank a place-only shortlist. Run after detect_people.swift + measure_sharpness.swift.

    python3 curate.py --photos "/path/to/journey folder"

Enriches <photos>/_journey/metadata.json and writes shortlist.csv.
"""
import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402


def parse(dt):
    return datetime.strptime(dt, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) if dt else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--scene-gap", type=int, default=90, help="seconds between shots that still count as one scene")
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)

    meta = json.loads((jd / "metadata.json").read_text(encoding="utf-8"))
    people = {p["file"]: p for p in json.loads((jd / "people.json").read_text(encoding="utf-8"))}
    qual = {q["file"]: q for q in json.loads((jd / "quality.json").read_text(encoding="utf-8"))}

    for r in meta:
        p, q = people.get(r["file"]), qual.get(r["file"])
        r["persons"] = p.get("persons") if p else None
        r["faces"] = p.get("faces") if p else None
        r["place_only"] = bool(p and "error" not in p and p["persons"] == 0 and p["faces"] == 0)
        r["sharp"] = q.get("sharp") if q else None
        r["bright"] = q.get("bright") if q else None
        r["exposure_ok"] = bool(q and "sharp" in q and 40 <= q["bright"] <= 225)

    photos = [r for r in meta if not r["is_video"] and r["datetime_utc"]]
    photos.sort(key=lambda r: r["datetime_utc"])
    scene, last_t, last_town = 0, None, None
    for r in photos:
        t = parse(r["datetime_utc"])
        if last_t is None or r["town"] != last_town or (t - last_t).total_seconds() > args.scene_gap:
            scene += 1
        r["scene"], last_t, last_town = scene, t, r["town"]

    scenes = defaultdict(list)
    for r in photos:
        scenes[r["scene"]].append(r)
    picks = []
    for rs in scenes.values():
        cands = sorted((r for r in rs if r["place_only"] and r["exposure_ok"]),
                       key=lambda r: r["sharp"] or 0, reverse=True)
        for rank, r in enumerate(cands):
            r["scene_rank"] = rank
            if rank == 0:
                picks.append(r)
    for r in meta:
        r.setdefault("scene", None)
        r.setdefault("scene_rank", None)

    (jd / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    bytown = defaultdict(list)
    for r in picks:
        bytown[r["town"] or "(no location)"].append(r)
    rows = []
    for town in bytown:
        for r in sorted(bytown[town], key=lambda r: -(r["sharp"] or 0)):
            rows.append({"town": r["town"], "datetime_utc": r["datetime_utc"], "file": r["file"],
                         "device": r["device"], "loc_source": r["loc_source"],
                         "sharp": r["sharp"], "bright": r["bright"], "town_km": r["town_km"]})
    rows.sort(key=lambda x: (x["town"] or "", -(x["sharp"] or 0)))
    with open(jd / "shortlist.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    place_only = sum(1 for r in meta if r["place_only"])
    print(f"{place_only}/{len([r for r in meta if not r['is_video']])} place-only · "
          f"{len(scenes)} scenes · {len(picks)} deduped picks -> shortlist.csv")


if __name__ == "__main__":
    main()
