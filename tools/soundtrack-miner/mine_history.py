#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml", "tzdata"]
# ///
"""
Trip soundtracks (docs/BACKLOG.md) — mine the Spotify Extended Streaming
History export for what actually played during each retracing.

The export is a lifetime of plays split across many
`Streaming_History_Audio_*.json` files, far too much to eyeball and
(privacy: IPs, user agents) never committed. Point SPOTIFY_HISTORY_PATH at
the downloaded ZIP or its extracted folder and this script reduces it to
one small curation report per journey.

Journeys come from the blog posts' front matter: `visit_date` is day 1 and
the `## Dia N` headings give the length. Only `transport: car` journeys get
a soundtrack — train trips are headphone listening, not shared in the car.

A play counts when it has a spotify_track_uri (music, not podcasts) and ran
at least 30 seconds. `ts` is the UTC stop time per Spotify's ReadMe; plays
are bucketed into days in Europe/Lisbon time.

Output: tools/soundtrack-miner/output/<slug>.md — the journey's top tracks,
a per-day chronology, and a ready-to-paste `soundtrack:` YAML block.
"""

import json
import os
import re
import sys
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterator
from zoneinfo import ZoneInfo

import yaml

REPO = Path(__file__).resolve().parents[2]
POSTS = REPO / "apps/blog/_posts"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"

FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n(.*)", re.S)
POST_NAME = re.compile(r"\d{4}-\d{2}-\d{2}-(?P<slug>.+)\.(md|markdown)$")
DIA_HEADING = re.compile(r"^## Dia \d+", re.M)
AUDIO_FILE = re.compile(r"Streaming_History_Audio.*\.json$")

LISBON = ZoneInfo("Europe/Lisbon")
MIN_PLAY_MS = 30_000
TOP_TRACKS = 10


@dataclass
class Journey:
    slug: str
    title: str
    start: date
    end: date

    def __contains__(self, d: date) -> bool:
        return self.start <= d <= self.end


def load_journeys(posts_dir: Path) -> list[Journey]:
    """Car journeys only; visit_date is day 1, `## Dia N` headings the length."""
    journeys = []
    for path in sorted(posts_dir.glob("*.m*")):
        name = POST_NAME.match(path.name)
        fm = FRONT_MATTER.match(path.read_text(encoding="utf-8"))
        if not name or not fm:
            continue
        meta = yaml.safe_load(fm.group(1)) or {}
        start = meta.get("visit_date")
        if meta.get("transport") != "car" or not isinstance(start, date):
            continue
        days = max(len(DIA_HEADING.findall(fm.group(2))), 1)
        journeys.append(
            Journey(
                slug=name["slug"],
                title=str(meta.get("title", name["slug"])),
                start=start,
                end=start + timedelta(days=days - 1),
            )
        )
    return journeys


def iter_history(source: Path) -> Iterator[dict]:
    """Yields every audio stream in the export — ZIP or extracted folder."""
    found = False
    if zipfile.is_zipfile(source):
        with zipfile.ZipFile(source) as zf:
            for info in sorted(zf.infolist(), key=lambda i: i.filename):
                if AUDIO_FILE.search(info.filename):
                    found = True
                    yield from json.loads(zf.read(info))
    elif source.is_dir():
        for path in sorted(source.rglob("*.json")):
            if AUDIO_FILE.search(path.name):
                found = True
                yield from json.loads(path.read_text(encoding="utf-8"))
    if not found:
        raise SystemExit(
            f"no Streaming_History_Audio_*.json found in {source} — "
            "point SPOTIFY_HISTORY_PATH at the export ZIP or its extracted folder"
        )


def local_day(ts: str) -> date:
    """Spotify's `ts` is the UTC stop time; the journey happened in Lisbon time."""
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(LISBON).date()


def mine(journeys: list[Journey], streams: Iterator[dict]) -> dict[str, dict]:
    """{slug: {track key: {name, artist, album, url, plays, ms, days, first}}}"""
    hits: dict[str, dict] = {j.slug: {} for j in journeys}
    for s in streams:
        uri = s.get("spotify_track_uri")
        if not uri or (s.get("ms_played") or 0) < MIN_PLAY_MS:
            continue
        day = local_day(s["ts"])
        for j in journeys:
            if day not in j:
                continue
            track = hits[j.slug].setdefault(
                uri,
                {
                    "name": s.get("master_metadata_track_name") or "?",
                    "artist": s.get("master_metadata_album_artist_name") or "?",
                    "album": s.get("master_metadata_album_album_name"),
                    "url": "https://open.spotify.com/track/" + uri.rsplit(":", 1)[-1],
                    "plays": 0,
                    "ms": 0,
                    "days": defaultdict(int),
                    "first": s["ts"],
                },
            )
            track["plays"] += 1
            track["ms"] += s["ms_played"]
            track["days"][day.isoformat()] += 1
            track["first"] = min(track["first"], s["ts"])
    return hits


def ranked(tracks: dict) -> list[dict]:
    return sorted(tracks.values(), key=lambda t: (-t["plays"], -t["ms"], t["name"]))


def render(journey: Journey, tracks: dict) -> str:
    order = ranked(tracks)
    plays = sum(t["plays"] for t in order)
    hours = sum(t["ms"] for t in order) / 3_600_000
    lines = [
        f"# {journey.title} — soundtrack candidates",
        "",
        f"{journey.start} to {journey.end} · {len(order)} tracks · "
        f"{plays} plays · {hours:.1f}h listened",
        "",
        "## Top of the journey",
        "",
        "| # | Track | Artist | Plays | Days | Minutes |",
        "|--:|-------|--------|------:|-----:|--------:|",
    ]
    for i, t in enumerate(order, 1):
        lines.append(
            f"| {i} | [{t['name']}]({t['url']}) | {t['artist']} "
            f"| {t['plays']} | {len(t['days'])} | {t['ms'] / 60_000:.0f} |"
        )
    day = journey.start
    n = 1
    while day <= journey.end:
        key = day.isoformat()
        todays = sorted(
            (t for t in order if key in t["days"]), key=lambda t: t["first"]
        )
        if todays:
            lines += ["", f"## Dia {n} — {key}", ""]
            lines += [
                f"- {t['name']} — {t['artist']} ({t['days'][key]}×)" for t in todays
            ]
        day += timedelta(days=1)
        n += 1
    snippet = yaml.safe_dump(
        {
            "soundtrack": [
                {"title": t["name"], "artist": t["artist"], "url": t["url"]}
                for t in order[:TOP_TRACKS]
            ]
        },
        allow_unicode=True,
        sort_keys=False,
    )
    lines += [
        "",
        f"## Front matter (top {TOP_TRACKS} — curate, don't paste blindly)",
        "",
        "```yaml",
        snippet.rstrip(),
        "```",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    source = os.environ.get("SPOTIFY_HISTORY_PATH")
    if not source:
        raise SystemExit(
            "set SPOTIFY_HISTORY_PATH to the Spotify Extended Streaming History "
            "export (my_spotify_data.zip or its extracted folder)"
        )
    journeys = load_journeys(POSTS)
    if not journeys:
        raise SystemExit(f"no car journeys with a visit_date found in {POSTS}")
    hits = mine(journeys, iter_history(Path(source)))
    OUTPUT_DIR.mkdir(exist_ok=True)
    for j in journeys:
        tracks = hits[j.slug]
        out = OUTPUT_DIR / f"{j.slug}.md"
        out.write_text(render(j, tracks), encoding="utf-8")
        print(
            f"{j.slug}: {j.start} to {j.end}, "
            f"{len(tracks)} tracks / {sum(t['plays'] for t in tracks.values())} plays "
            f"-> {out.relative_to(REPO)}"
        )


if __name__ == "__main__":
    main()
