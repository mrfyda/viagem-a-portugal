#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml"]
# ///
"""
WP11 — blog sync (docs/PLAN.md).

Collects `places:` front matter from blog posts into the featured-journey
overlay the map app bundles. Unknown place names fail the build (typo guard
against the toponymic index).

An optional `featured_photos:` map (place name -> image path) attaches one hero
image per place, surfaced in the map's town detail panel.

An optional `detours:` list collects off-book places the author visited (ADR
0010) — `{name, lat, lon, note, image}` enriched with the post link. These are
NOT validated against the index (a Detour is deliberately not in the book).

Post URL follows the blog's permalink pattern /:year/:month/:day/:title/
derived from the post filename (YYYY-MM-DD-slug.ext).

Output: apps/map/src/data/featured-journey.json,
        apps/map/src/data/detours.json
"""

import json
import re
import sys
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]
POSTS = REPO / "apps/blog/_posts"
BOOK_INDEX = REPO / "apps/map/src/data/book-index.json"
OUTPUT = REPO / "apps/map/src/data/featured-journey.json"
DETOURS_OUTPUT = REPO / "apps/map/src/data/detours.json"

FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
POST_NAME = re.compile(r"(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})-(?P<slug>.+)\.(md|markdown)$")


def parse_post(path: Path) -> tuple[dict, str] | None:
    """Returns (front matter dict, post URL) or None if not a dated post."""
    name = POST_NAME.match(path.name)
    fm = FRONT_MATTER.match(path.read_text(encoding="utf-8"))
    if not name or not fm:
        return None
    meta = yaml.safe_load(fm.group(1)) or {}
    url = f"/{name['y']}/{name['m']}/{name['d']}/{name['slug']}/"
    return meta, url


def collect(posts_dir: Path, index_names: set[str]) -> dict:
    featured: dict[str, dict] = {}
    errors = []
    for path in sorted(posts_dir.glob("*.m*")):
        parsed = parse_post(path)
        if not parsed:
            continue
        meta, url = parsed
        photos = meta.get("featured_photos") or {}
        for place in meta.get("places", []) or []:
            if place not in index_names:
                errors.append(f"{path.name}: unknown place {place!r}")
                continue
            featured[place] = {
                "postUrl": url,
                "postTitle": str(meta.get("title", url)),
                "date": str(meta.get("visit_date") or meta.get("date", ""))[:10] or None,
                "image": photos.get(place),
            }
    if errors:
        raise SystemExit("blog-sync failed:\n  " + "\n  ".join(errors))
    return featured


def collect_detours(posts_dir: Path) -> list[dict]:
    """Detours (off-book places, ADR 0010) are NOT validated against the index —
    a Detour deliberately has no toponymic-index entry. postUrl/postTitle are
    derived from the post, same as featured Places."""
    detours = []
    for path in sorted(posts_dir.glob("*.m*")):
        parsed = parse_post(path)
        if not parsed:
            continue
        meta, url = parsed
        for d in meta.get("detours", []) or []:
            detours.append(
                {
                    "name": d["name"],
                    "lat": d["lat"],
                    "lon": d["lon"],
                    "note": d.get("note"),
                    "image": d.get("image"),
                    "postUrl": url,
                    "postTitle": str(meta.get("title", url)),
                }
            )
    return sorted(detours, key=lambda d: d["name"])


def main() -> None:
    index_names = {
        p["indexName"]
        for p in json.loads(BOOK_INDEX.read_text(encoding="utf-8"))["places"]
    }
    featured = collect(POSTS, index_names)
    OUTPUT.write_text(
        json.dumps(dict(sorted(featured.items())), ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    detours = collect_detours(POSTS)
    DETOURS_OUTPUT.write_text(
        json.dumps(detours, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"{len(featured)} featured places -> {OUTPUT}")
    print(f"{len(detours)} detours -> {DETOURS_OUTPUT}")


if __name__ == "__main__":
    main()
