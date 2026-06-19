#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""
WP4 — Geocoding v2 (docs/PLAN.md, ADR 0004).

Regenerates apps/map/src/data/locations.json for every index Place:
existing coordinates are kept (source preserved), missing ones are resolved
via Nominatim with the index qualifier and the Place's chapter envelope as
disambiguators. corrections.json is untouched and still wins in the app.

Low-confidence and unresolved results land in
tools/book-pipeline/output/geocode-report.json for the review agent.
"""

import math
import re
import time
from collections import Counter, defaultdict

import requests

import _store as S

PT_BBOX = (36.8, 42.3, -9.6, -6.0)  # continental Portugal
NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "viagem-a-portugal-geocoder/2.0 (rafael@usebounce.com)"}

QUALIFIER_HINT = re.compile(r"(?:freg\.? de|povoação perto de|perto de|junto a)\s+(.+)")


def in_portugal(lat: float, lon: float) -> bool:
    return PT_BBOX[0] <= lat <= PT_BBOX[1] and PT_BBOX[2] <= lon <= PT_BBOX[3]


def nominatim(query: str) -> list[dict]:
    resp = requests.get(
        NOMINATIM,
        params={"q": query, "countrycodes": "pt", "format": "jsonv2", "limit": 5},
        headers=HEADERS,
        timeout=20,
    )
    resp.raise_for_status()
    time.sleep(1.1)  # usage policy
    return resp.json()


def main() -> None:
    places = S.load_places()
    corrections = {c["name"]: c for c in S.load_corrections()}
    known = S.load_coords()
    mentions = S.read_json(S.RAW_MENTIONS)["mentions"]

    # dominant chapter per place (ambiguous mentions count for all candidates)
    place_chapters: dict[str, Counter] = defaultdict(Counter)
    for m in mentions:
        for cand in m["candidates"]:
            place_chapters[cand][m["chapter"]] += 1

    # chapter envelopes from already-known coordinates (known = S.load_coords:
    # locations + corrections merged, the (0,0) not-geocoded entries dropped)
    chapter_coords: dict[int, list[tuple[float, float]]] = defaultdict(list)
    for name, coord in known.items():
        chapters = place_chapters.get(name)
        if chapters:
            chapter_coords[chapters.most_common(1)[0][0]].append(coord)
    centroids = {
        ch: (
            sum(c[0] for c in coords) / len(coords),
            sum(c[1] for c in coords) / len(coords),
        )
        for ch, coords in chapter_coords.items()
        if coords
    }

    out, report = [], []
    resolved = kept = 0
    for place in places:
        name = place["indexName"]
        if name in known:
            src = "manual" if name in corrections else "wikipedia-v1"
            lat, lon = known[name]
            out.append(
                {
                    "name": name,
                    "latitude": lat,
                    "longitude": lon,
                    "source": src,
                    "confidence": "high",
                }
            )
            kept += 1
            continue

        queries = []
        if place["qualifier"]:
            hint = QUALIFIER_HINT.search(place["qualifier"])
            if hint:
                queries.append(f"{place['name']}, {hint.group(1)}")
        queries.append(place["name"])

        candidates = []
        for q in queries:
            try:
                candidates = [
                    r
                    for r in nominatim(q)
                    if in_portugal(float(r["lat"]), float(r["lon"]))
                ]
            except requests.RequestException as exc:
                report.append({"name": name, "issue": f"request failed: {exc}"})
                candidates = []
            if candidates:
                break

        if not candidates:
            out.append(
                {
                    "name": name,
                    "latitude": 0,
                    "longitude": 0,
                    "source": "unresolved",
                    "confidence": "none",
                }
            )
            report.append({"name": name, "issue": "no results"})
            continue

        # prefer candidates near the place's chapter centroid
        chapters = place_chapters.get(name)
        centroid = (
            centroids.get(chapters.most_common(1)[0][0]) if chapters else None
        )

        def dist(r):
            if not centroid:
                return 0.0
            return math.dist(centroid, (float(r["lat"]), float(r["lon"])))

        best = min(candidates, key=dist)
        d = dist(best)
        confidence = (
            "high"
            if len(candidates) == 1 or (centroid and d < 0.7)
            else "low"
        )
        out.append(
            {
                "name": name,
                "latitude": round(float(best["lat"]), 6),
                "longitude": round(float(best["lon"]), 6),
                "source": "nominatim",
                "confidence": confidence,
            }
        )
        resolved += 1
        if confidence == "low":
            report.append(
                {
                    "name": name,
                    "issue": "low confidence",
                    "chosen": best.get("display_name"),
                    "distanceToChapterCentroid": round(d, 2),
                    "alternatives": [
                        {
                            "display": r.get("display_name"),
                            "lat": r["lat"],
                            "lon": r["lon"],
                        }
                        for r in candidates[:4]
                    ],
                }
            )
        print(f"[{confidence}] {name} -> {best.get('display_name', '?')[:70]}")

    S.write_json(S.LOCATIONS, out)
    S.write_json(S.GEOCODE_REPORT, report)
    unresolved = sum(1 for o in out if o["source"] == "unresolved")
    print(
        f"\nkept {kept}, newly resolved {resolved}, unresolved {unresolved} "
        f"of {len(places)} places"
    )
    print(f"report entries: {len(report)} -> {S.GEOCODE_REPORT}")


if __name__ == "__main__":
    main()
