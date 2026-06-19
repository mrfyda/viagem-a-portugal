"""Shared data layer for the book-pipeline (WP1–WP7).

One owner for the pipeline's artifacts: their paths, their schemas, the
load/save boilerplate, the `indexName` join key, and the
locations+corrections coordinate merge that three stages used to each
re-implement. Imported as a sibling (`import _store as S`) — `uv run`
puts the script's own directory on sys.path, so no path shim is needed
(same pattern as journey-loader/_common.py).

The pure outbox of this module is the *data contract*; the external steps
stay where they are — the LLM classifier (ADR 0003) writes classifications.json
and Nominatim (ADR 0004) lives in geocode.py.
"""

import json
from pathlib import Path
from typing import TypedDict

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "apps/map/src/data"
PIPELINE = REPO / "tools/book-pipeline"
OUTPUT = PIPELINE / "output"

# committed, app-bundled artifacts
BOOK_INDEX = DATA / "book-index.json"
SECTIONS = DATA / "sections.json"
LOCATIONS = DATA / "locations.json"
CORRECTIONS = DATA / "corrections.json"
STOPS = DATA / "stops.json"
MENTIONS = DATA / "mentions.json"  # condensed, app-facing (WP7)

# pipeline inputs and local-only intermediates (output/ is gitignored)
CLASSIFICATIONS = PIPELINE / "classifications.json"  # LLM-classified (ADR 0003)
OVERRIDES = PIPELINE / "journey-overrides.json"
MATCH_ALIASES = PIPELINE / "match-aliases.json"
RAW_MENTIONS = OUTPUT / "mentions.json"  # raw matches (WP2), local-only
SECTIONS_DIR = OUTPUT / "sections"  # local-only section text (ADR 0001)
GEOCODE_REPORT = OUTPUT / "geocode-report.json"
STOPS_REPORT = OUTPUT / "stops-report.json"


class Place(TypedDict):
    indexName: str  # the join key across every artifact
    name: str
    qualifier: str | None
    pages: list[int]


Alias = TypedDict("Alias", {"from": str, "to": str})


class BookIndex(TypedDict):
    places: list[Place]
    aliases: list[Alias]


class Location(TypedDict):
    name: str
    latitude: float
    longitude: float
    source: str
    confidence: str


class Correction(TypedDict):
    name: str
    latitude: float
    longitude: float


class Stop(TypedDict):
    ordinal: int
    place: str
    chapter: int
    section: int
    role: str  # "stop" | "passed-through"
    latitude: float
    longitude: float


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data, *, indent: int = 2) -> None:
    """Write `data` as UTF-8 JSON with a trailing newline. `indent` matches each
    artifact's committed format (2 for most; 1 for stops.json/mentions.json) so
    regenerating a file produces no spurious diff."""
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=indent) + "\n", encoding="utf-8"
    )


def load_index() -> BookIndex:
    return read_json(BOOK_INDEX)


def load_places() -> list[Place]:
    return load_index()["places"]


def index_names() -> set[str]:
    """Every canonical Place identifier — the join key the whole model turns on."""
    return {p["indexName"] for p in load_places()}


def load_locations() -> list[Location]:
    return read_json(LOCATIONS)


def load_corrections() -> list[Correction]:
    return read_json(CORRECTIONS)


def merge_coords(
    locations: list[Location], corrections: list[Correction]
) -> dict[str, tuple[float, float]]:
    """Place name -> (lat, lon): locations with corrections overriding by name,
    dropping the (0, 0) "not geocoded" entries. The one home for a merge that
    geocode (`known`) and derive_stops (`coords`) each used to inline."""
    coords: dict[str, tuple[float, float]] = {}
    for loc in locations:
        if loc["latitude"] or loc["longitude"]:
            coords[loc["name"]] = (loc["latitude"], loc["longitude"])
    for c in corrections:
        coords[c["name"]] = (c["latitude"], c["longitude"])
    return coords


def load_coords() -> dict[str, tuple[float, float]]:
    return merge_coords(load_locations(), load_corrections())


def load_overrides() -> dict:
    return read_json(OVERRIDES)
