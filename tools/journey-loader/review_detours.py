#!/usr/bin/env python3
"""Detour review — selected photos that snapped FAR from their town are usually
off-book places (a real spot with no nearby index entry, like Mazouco). This
reverse-geocodes them (COORDINATES ONLY — never photos) so you can classify each
as a Detour (ADR 0010) vs. a mis-snapped book Place. Run after a selection exists.

    python3 review_detours.py --photos DIR --selection <selection.txt> [--threshold 2.0]

For each flag: if the real place is NOT in the book index, it's a Detour -> add it
to the post's `detours:` block; if it IS a book place snapped to the wrong town,
fix its coordinate in apps/map/src/data/corrections.json instead.
"""
import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402


def reverse(lat, lon):
    url = (f"https://nominatim.openstreetmap.org/reverse?format=jsonv2"
           f"&lat={lat}&lon={lon}&zoom=15&addressdetails=1")
    req = urllib.request.Request(url, headers={"User-Agent": "viagem-a-portugal journey-loader"})
    d = json.load(urllib.request.urlopen(req, timeout=15))
    a = d.get("address", {})
    bits = [a.get(k) for k in ("hamlet", "village", "town", "suburb", "locality", "municipality") if a.get(k)]
    return f"{d.get('name') or '—'} | {', '.join(dict.fromkeys(bits))}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--selection", type=Path)
    ap.add_argument("--threshold", type=float, default=2.0)
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)
    meta = {r["file"]: r for r in json.loads((jd / "metadata.json").read_text(encoding="utf-8"))}
    names = C.index_names()
    files = ([l.strip() for l in args.selection.read_text(encoding="utf-8").splitlines() if l.strip()]
             if args.selection else list(meta))
    flagged = [meta[f] for f in files
               if f in meta and meta[f].get("town_km") and meta[f]["town_km"] > args.threshold]
    flagged.sort(key=lambda r: -r["town_km"])
    if not flagged:
        print(f"no photos snapped beyond {args.threshold} km — nothing to review")
        return
    print(f"{len(flagged)} photo(s) snapped > {args.threshold} km from their town "
          f"(coordinates sent to OSM Nominatim; no photos):\n")
    for r in flagged:
        try:
            place = reverse(r["lat"], r["lon"])
            time.sleep(1.1)
        except Exception as e:
            place = f"(reverse-geocode failed: {e})"
        print(f"  {r['file']}  {r['town_km']:.1f} km from {r['town']!r} ({r['loc_source']})")
        print(f"      actually near: {place}")
        print(f"      snapped town in book index: {r['town'] in names}  "
              f"→ if the real place isn't in the index, make it a Detour\n")


if __name__ == "__main__":
    main()
