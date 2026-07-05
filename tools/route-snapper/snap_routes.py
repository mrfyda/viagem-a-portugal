#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Snap the journey Routes to the roads of 1979.

Reads apps/map/src/data/stops.json and routes each consecutive same-chapter
Stop pair over the real road network via the public BRouter server
(brouter.de), using the car-1979.brf profile uploaded per run. The profile
forbids motorways, trunk roads (the IP/IC expressways) and toll roads:
Saramago drove in October 1979, when Portugal had ~70 km of motorway and
none of the EU-funded expressway network, so the estradas nacionais and
municipais the router falls back to are — to a close approximation — the
roads that existed at the time. (Post-1979 realignments of individual
N-roads are beyond what map data can distinguish.)

Writes apps/map/src/data/routes.json: one segment per consecutive
same-chapter Stop pair, keyed by the later Stop's ordinal, with the snapped
polyline simplified to ~25 m and closed onto the exact Stop coordinates so
the line always touches the dots. Pairs the router cannot connect fall back
to the straight line (flagged `snapped: false`).

Raw BRouter responses are cached in output/cache/ (gitignored), keyed by
profile content + endpoints, so re-runs only hit the network for new pairs.
"""

import hashlib
import json
import math
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
STOPS_PATH = REPO / "apps/map/src/data/stops.json"
ROUTES_PATH = REPO / "apps/map/src/data/routes.json"
PROFILE_PATH = ROOT / "car-1979.brf"
CACHE_DIR = ROOT / "output" / "cache"

BROUTER = "https://brouter.de/brouter"
SIMPLIFY_TOLERANCE_DEG = 0.00025  # ~25 m north-south
COORD_DECIMALS = 5  # ~1 m


def upload_profile(profile_text: str) -> str:
    req = urllib.request.Request(
        f"{BROUTER}/profile", data=profile_text.encode(), method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)["profileid"]


def fetch_route(profile_id: str, a: tuple[float, float], b: tuple[float, float]):
    """BRouter GeoJSON track between two (lon, lat) points, or None."""
    lonlats = f"{a[0]},{a[1]}|{b[0]},{b[1]}"
    url = f"{BROUTER}?lonlats={lonlats}&profile={profile_id}&alternativeidx=0&format=geojson"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as resp:
                body = resp.read()
            data = json.loads(body)
            coords = data["features"][0]["geometry"]["coordinates"]
            return [(lon, lat) for lon, lat, *_ in coords]
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as e:
            if attempt == 2:
                print(f"  ! unroutable {lonlats}: {e}", file=sys.stderr)
                return None
            time.sleep(2 * (attempt + 1))


def perpendicular_distance(p, a, b, cos_lat: float) -> float:
    ax, ay = (a[0] * cos_lat, a[1])
    bx, by = (b[0] * cos_lat, b[1])
    px, py = (p[0] * cos_lat, p[1])
    dx, dy = bx - ax, by - ay
    if dx == dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(points, tolerance: float):
    """Douglas–Peucker, longitude scaled so tolerance is metric-ish."""
    if len(points) <= 2:
        return points
    cos_lat = math.cos(math.radians(sum(p[1] for p in points) / len(points)))
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi - lo < 2:
            continue
        d, split = max(
            (perpendicular_distance(points[i], points[lo], points[hi], cos_lat), i)
            for i in range(lo + 1, hi)
        )
        if d > tolerance:
            keep[split] = True
            stack.extend([(lo, split), (split, hi)])
    return [p for p, k in zip(points, keep) if k]


def cached_route(profile_id: str, profile_hash: str, a, b):
    key = hashlib.sha256(f"{profile_hash}:{a}:{b}".encode()).hexdigest()[:24]
    cache_file = CACHE_DIR / f"{key}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    route = fetch_route(profile_id, a, b)
    cache_file.write_text(json.dumps(route))
    return route


def main() -> None:
    stops = json.loads(STOPS_PATH.read_text())["stops"]
    profile_text = PROFILE_PATH.read_text()
    profile_hash = hashlib.sha256(profile_text.encode()).hexdigest()[:12]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    profile_id = upload_profile(profile_text)
    print(f"profile {PROFILE_PATH.name} -> {profile_id} ({profile_hash})")

    segments = []
    fallbacks = 0
    for prev, stop in zip(stops, stops[1:]):
        if prev["chapter"] != stop["chapter"]:
            continue
        a = (prev["longitude"], prev["latitude"])
        b = (stop["longitude"], stop["latitude"])
        route = cached_route(profile_id, profile_hash, a, b) if a != b else [a, b]
        snapped = route is not None
        points = simplify(route, SIMPLIFY_TOLERANCE_DEG) if snapped else [a, b]
        coordinates = [a, *points, b]
        coordinates = [
            (round(lon, COORD_DECIMALS), round(lat, COORD_DECIMALS))
            for lon, lat in coordinates
        ]
        deduped = [coordinates[0]]
        for point in coordinates[1:]:
            if point != deduped[-1]:
                deduped.append(point)
        if len(deduped) < 2:
            deduped = [coordinates[0], coordinates[-1]]
        if not snapped:
            fallbacks += 1
            print(f"  fallback straight: {prev['place']} -> {stop['place']}")
        segments.append(
            {"ordinal": stop["ordinal"], "snapped": snapped, "coordinates": deduped}
        )
        done = len(segments)
        if done % 50 == 0:
            print(f"  {done} segments…")

    payload = {
        "generator": "tools/route-snapper/snap_routes.py",
        "profile": f"car-1979.brf ({profile_hash})",
        "segments": segments,
    }
    ROUTES_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    total_points = sum(len(s["coordinates"]) for s in segments)
    print(
        f"wrote {ROUTES_PATH.relative_to(REPO)}: {len(segments)} segments, "
        f"{total_points} points, {fallbacks} straight fallbacks, "
        f"{ROUTES_PATH.stat().st_size // 1024} KiB"
    )


if __name__ == "__main__":
    main()
