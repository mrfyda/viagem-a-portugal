"""Tests for the soundtrack miner, against a synthetic export. Run:
uv run --with pytest --with pyyaml --with tzdata -m pytest tools/soundtrack-miner/test_mine.py
"""

import json
import sys
import zipfile
from datetime import date
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from mine_history import (  # noqa: E402
    Journey,
    iter_history,
    load_journeys,
    local_day,
    mine,
    ranked,
    render,
)

JOURNEY = Journey(
    slug="viagem-a-portugal-ii",
    title="Viagem a Portugal II",
    start=date(2023, 6, 3),
    end=date(2023, 6, 12),
)


def stream(ts, ms=180_000, track="Fado da Estrada", artist="Ala dos Namorados", uri="spotify:track:abc123"):
    return {
        "ts": ts,
        "ms_played": ms,
        "master_metadata_track_name": track,
        "master_metadata_album_artist_name": artist,
        "master_metadata_album_album_name": "Álbum",
        "spotify_track_uri": uri,
    }


def write_post(tmp_path, name, front, body=""):
    (tmp_path / name).write_text(f"---\n{front}---\n{body}", encoding="utf-8")


def test_load_journeys_derives_range_from_dia_headings(tmp_path):
    write_post(
        tmp_path,
        "2023-06-12-viagem-a-portugal-ii.markdown",
        "title: Viagem II\nvisit_date: 2023-06-03\ntransport: car\n",
        "## Dia 1 — sábado\n\n## Dia 2\n\n## Dia 3\n",
    )
    (j,) = load_journeys(tmp_path)
    assert (j.slug, j.start, j.end) == ("viagem-a-portugal-ii", date(2023, 6, 3), date(2023, 6, 5))
    assert date(2023, 6, 5) in j and date(2023, 6, 6) not in j


def test_load_journeys_skips_train_and_undated(tmp_path):
    write_post(
        tmp_path,
        "2026-04-06-viagem-a-portugal-iv.markdown",
        "title: Viagem IV\nvisit_date: 2026-04-03\ntransport: train\n",
        "## Dia 1\n",
    )
    write_post(tmp_path, "2023-01-01-sem-data.md", "title: Sem data\ntransport: car\n")
    assert load_journeys(tmp_path) == []


def test_load_journeys_single_day_without_headings(tmp_path):
    write_post(
        tmp_path,
        "2023-06-12-curta.md",
        "title: Curta\nvisit_date: 2023-06-03\ntransport: car\n",
        "Sem dias.\n",
    )
    (j,) = load_journeys(tmp_path)
    assert j.end == j.start


def test_local_day_converts_utc_to_lisbon():
    # 23:30 UTC in June is 00:30 the next day in Lisbon (WEST, UTC+1)
    assert local_day("2023-06-03T23:30:00Z") == date(2023, 6, 4)
    # winter: Lisbon is UTC
    assert local_day("2023-02-18T23:30:00Z") == date(2023, 2, 18)


def test_mine_filters_window_podcasts_and_short_plays():
    streams = [
        stream("2023-06-03T10:00:00Z"),                      # day 1: counts
        stream("2023-06-12T22:00:00Z"),                      # last day: counts
        stream("2023-06-02T10:00:00Z"),                      # before: out
        stream("2023-06-12T23:30:00Z"),                      # 00:30 Lisbon on the 13th: out
        stream("2023-06-04T10:00:00Z", ms=15_000),           # skipped-through: out
        {"ts": "2023-06-04T10:00:00Z", "ms_played": 900_000,
         "spotify_episode_uri": "spotify:episode:pod1"},     # podcast: out
    ]
    tracks = mine([JOURNEY], iter(streams))[JOURNEY.slug]
    (t,) = tracks.values()
    assert t["plays"] == 2
    assert t["days"] == {"2023-06-03": 1, "2023-06-12": 1}
    assert t["url"] == "https://open.spotify.com/track/abc123"


def test_ranking_by_plays_then_time():
    streams = [
        stream("2023-06-03T10:00:00Z", uri="spotify:track:a", track="A"),
        stream("2023-06-04T10:00:00Z", uri="spotify:track:a", track="A"),
        stream("2023-06-03T11:00:00Z", uri="spotify:track:b", track="B", ms=600_000),
    ]
    order = ranked(mine([JOURNEY], iter(streams))[JOURNEY.slug])
    assert [t["name"] for t in order] == ["A", "B"]


def test_render_yaml_snippet_round_trips():
    streams = [stream("2023-06-03T10:00:00Z"), stream("2023-06-03T11:00:00Z")]
    report = render(JOURNEY, mine([JOURNEY], iter(streams))[JOURNEY.slug])
    snippet = report.split("```yaml\n")[1].split("```")[0]
    assert yaml.safe_load(snippet) == {
        "soundtrack": [
            {
                "title": "Fado da Estrada",
                "artist": "Ala dos Namorados",
                "url": "https://open.spotify.com/track/abc123",
            }
        ]
    }
    assert "## Dia 1 — 2023-06-03" in report


def _export_files():
    return {
        "Spotify Extended Streaming History/Streaming_History_Audio_2023_0.json": [
            stream("2023-06-03T10:00:00Z")
        ],
        "Spotify Extended Streaming History/Streaming_History_Video_2023.json": [
            stream("2023-06-03T12:00:00Z", uri="spotify:track:video")
        ],
        "Spotify Extended Streaming History/ReadMeFirst.pdf": None,
    }


def test_iter_history_reads_zip_audio_only(tmp_path):
    zip_path = tmp_path / "my_spotify_data.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        for name, content in _export_files().items():
            zf.writestr(name, json.dumps(content) if content else b"%PDF")
    streams = list(iter_history(zip_path))
    assert [s["spotify_track_uri"] for s in streams] == ["spotify:track:abc123"]


def test_iter_history_reads_extracted_folder(tmp_path):
    for name, content in _export_files().items():
        p = tmp_path / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(content) if content else "%PDF", encoding="utf-8")
    streams = list(iter_history(tmp_path))
    assert [s["spotify_track_uri"] for s in streams] == ["spotify:track:abc123"]


def test_iter_history_rejects_empty_source(tmp_path):
    with pytest.raises(SystemExit, match="SPOTIFY_HISTORY_PATH"):
        list(iter_history(tmp_path))
