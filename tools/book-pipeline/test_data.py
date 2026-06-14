"""
WP13 — data invariants for committed pipeline artifacts.

Run: uv run --with pytest -m pytest tools/book-pipeline/test_data.py
"""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "apps/map/src/data"


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def test_book_index():
    index = load("book-index.json")
    places = index["places"]
    assert len(places) == 578
    names = [p["indexName"] for p in places]
    assert len(set(names)) == len(names)
    pages = [pg for p in places for pg in p["pages"]]
    assert min(pages) == 16 and max(pages) == 387
    assert len(index["aliases"]) == 2
    for a in index["aliases"]:
        assert a["to"] in set(names)


def test_sections():
    sections = load("sections.json")
    chapters = sections["chapters"]
    assert len(chapters) == 6
    ordinals = [s["ordinal"] for c in chapters for s in c["sections"]]
    assert ordinals == list(range(1, len(ordinals) + 1))


def test_classifications():
    cls = json.loads(
        (REPO / "tools/book-pipeline/classifications.json").read_text(encoding="utf-8")
    )
    mentions = cls["mentions"]
    assert len(mentions) == 1863
    index_names = {p["indexName"] for p in load("book-index.json")["places"]}
    kinds = {"stop", "passed-through", "referenced-only"}
    for m in mentions:
        assert m["kind"] in kinds
        assert m["candidates"]
        assert all(c in index_names for c in m["candidates"])


def test_stops():
    stops = load("stops.json")["stops"]
    index_names = {p["indexName"] for p in load("book-index.json")["places"]}
    # split homonym referents (e.g. "Lagoa de Óbidos") are real stops that are
    # NOT toponymic-index entries; their coordinate lives in corrections.json
    corrected = {c["name"] for c in load("corrections.json")}
    assert [s["ordinal"] for s in stops] == list(range(1, len(stops) + 1))
    chapters_seen = []
    for s in stops:
        assert s["place"] in index_names or s["place"] in corrected
        assert s["role"] in ("stop", "passed-through")
        assert 36.5 <= s["latitude"] <= 42.3
        assert -9.7 <= s["longitude"] <= -5.5
        chapters_seen.append(s["chapter"])
    assert sorted(chapters_seen) == chapters_seen  # contiguous chapters
    assert set(chapters_seen) == {1, 2, 3, 4, 5, 6}


def test_locations_cover_index():
    locations = {l["name"] for l in load("locations.json")}
    index_names = {p["indexName"] for p in load("book-index.json")["places"]}
    assert index_names <= locations
