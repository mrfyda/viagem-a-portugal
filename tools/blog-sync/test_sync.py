"""Round-trip test for blog-sync. Run:
uv run --with pytest --with pyyaml -m pytest tools/blog-sync/test_sync.py
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from sync import collect, parse_post  # noqa: E402


def write_post(tmp_path, name, body):
    p = tmp_path / name
    p.write_text(body, encoding="utf-8")
    return p


def test_round_trip(tmp_path):
    write_post(
        tmp_path,
        "2026-05-03-tras-os-montes.md",
        "---\ntitle: Trás-os-Montes em três dias\nplaces:\n  - Bragança\n  - Rio de Onor\nvisit_date: 2026-05-01\n---\nCorpo.\n",
    )
    featured = collect(tmp_path, {"Bragança", "Rio de Onor"})
    assert featured["Bragança"] == {
        "postUrl": "/2026/05/03/tras-os-montes/",
        "postTitle": "Trás-os-Montes em três dias",
        "date": "2026-05-01",
    }
    assert "Rio de Onor" in featured


def test_unknown_place_fails(tmp_path):
    write_post(
        tmp_path,
        "2026-05-03-typo.md",
        "---\ntitle: t\nplaces: [Bragansa]\n---\n",
    )
    with pytest.raises(SystemExit, match="Bragansa"):
        collect(tmp_path, {"Bragança"})


def test_posts_without_places_are_ignored(tmp_path):
    write_post(tmp_path, "2026-01-01-hello.markdown", "---\ntitle: hi\n---\nx\n")
    assert collect(tmp_path, set()) == {}


def test_non_post_files_skipped(tmp_path):
    write_post(tmp_path, "notes.md", "---\nplaces: [X]\n---\n")
    assert parse_post(tmp_path / "notes.md") is None
