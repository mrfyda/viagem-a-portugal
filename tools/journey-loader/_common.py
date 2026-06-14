"""Shared helpers for the journey-loader pipeline.

All stages are LOCAL-ONLY: photo pixels never leave the machine (we shell out to
exiftool / Swift Vision / CoreImage / sips). Outputs live in <photos>/_journey/.
"""
import json
import math
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BOOK_INDEX = REPO / "apps/map/src/data/book-index.json"
LOCATIONS = REPO / "apps/map/src/data/locations.json"
CORRECTIONS = REPO / "apps/map/src/data/corrections.json"
QUOTES = REPO / "apps/map/src/data/quotes.json"
POSTS = REPO / "apps/blog/_posts"


def journey_dir(photos: Path) -> Path:
    d = photos / "_journey"
    d.mkdir(exist_ok=True)
    return d


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def haversine(la1, lo1, la2, lo2):
    R = 6371.0
    p1, p2 = math.radians(la1), math.radians(la2)
    dp, dl = math.radians(la2 - la1), math.radians(lo2 - lo1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def load_towns():
    """Book places with coordinates: locations.json, corrections.json overriding
    by name, dropping the (0,0) "not geocoded" entries."""
    locs = json.loads(LOCATIONS.read_text(encoding="utf-8"))
    corr = {c["name"]: c for c in json.loads(CORRECTIONS.read_text(encoding="utf-8"))}
    towns, seen = [], set()
    for t in locs:
        lat, lon = t["latitude"], t["longitude"]
        if t["name"] in corr:
            lat, lon = corr[t["name"]]["latitude"], corr[t["name"]]["longitude"]
        if lat == 0 and lon == 0:
            continue
        towns.append((t["name"], lat, lon))
        seen.add(t["name"])
    for n, c in corr.items():
        if n not in seen and not (c["latitude"] == 0 and c["longitude"] == 0):
            towns.append((n, c["latitude"], c["longitude"]))
    return towns


def nearest_town(lat, lon, towns):
    best = min(towns, key=lambda t: haversine(lat, lon, t[1], t[2]))
    return best[0], round(haversine(lat, lon, best[1], best[2]), 2)


def index_names():
    return {p["indexName"] for p in json.loads(BOOK_INDEX.read_text(encoding="utf-8"))["places"]}


def best_date(r):
    for k in ("DateTimeOriginal", "CreateDate", "CreationDate", "MediaCreateDate"):
        if r.get(k):
            return r[k]
    return None


def to_utc(r):
    """DateTimeOriginal + OffsetTimeOriginal -> UTC instant. Missing offset is
    assumed UTC (Portugal is WET = UTC+0 in winter)."""
    ds = best_date(r)
    if not ds:
        return None
    try:
        dt = datetime.strptime(ds[:19], "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    off = r.get("OffsetTimeOriginal")
    if off in (None, "", "Z"):
        off_min = 0
    else:
        sign = 1 if off[0] == "+" else -1
        off_min = sign * (int(off[1:3]) * 60 + int(off[4:6]))
    return dt.replace(tzinfo=timezone.utc) - timedelta(minutes=off_min)


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None


def load_metadata(photos: Path):
    return json.loads((journey_dir(photos) / "metadata.json").read_text(encoding="utf-8"))
