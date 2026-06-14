"""Round-trip test for blog-sync. Run:
uv run --with pytest --with pyyaml -m pytest tools/blog-sync/test_sync.py
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from sync import collect, collect_detours, parse_post  # noqa: E402


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
        "image": None,
    }
    assert "Rio de Onor" in featured


def test_featured_photo_attached(tmp_path):
    write_post(
        tmp_path,
        "2026-05-03-tras-os-montes.md",
        "---\ntitle: t\nplaces:\n  - Bragança\n  - Rio de Onor\n"
        "featured_photos:\n  Bragança: /assets/viagem-1/braganca-1.avif\n---\nx\n",
    )
    featured = collect(tmp_path, {"Bragança", "Rio de Onor"})
    assert featured["Bragança"]["image"] == "/assets/viagem-1/braganca-1.avif"
    # places without an entry in featured_photos get no image
    assert featured["Rio de Onor"]["image"] is None


def test_unknown_place_fails(tmp_path):
    write_post(
        tmp_path,
        "2026-05-03-typo.md",
        "---\ntitle: t\nplaces: [Bragansa]\n---\n",
    )
    with pytest.raises(SystemExit, match="Bragansa"):
        collect(tmp_path, {"Bragança"})


def test_detours_collected(tmp_path):
    write_post(
        tmp_path,
        "2023-02-25-viagem-a-portugal-i.md",
        "---\ntitle: Viagem I\nplaces:\n  - Bragança\n"
        "detours:\n  - name: Mazouco\n    lat: 41.1402\n    lon: -6.763\n"
        "    note: nota\n    image: /assets/viagem-1/mazouco-2.avif\n---\nx\n",
    )
    assert collect_detours(tmp_path) == [
        {
            "name": "Mazouco",
            "lat": 41.1402,
            "lon": -6.763,
            "note": "nota",
            "image": "/assets/viagem-1/mazouco-2.avif",
            "postUrl": "/2023/02/25/viagem-a-portugal-i/",
            "postTitle": "Viagem I",
        }
    ]


def test_detours_not_index_validated(tmp_path):
    # A Detour name is deliberately not in the book index; it must not fail.
    write_post(
        tmp_path,
        "2023-02-25-x.md",
        "---\ntitle: t\ndetours:\n  - name: Mazouco\n    lat: 1\n    lon: 2\n---\nx\n",
    )
    assert collect_detours(tmp_path)[0]["name"] == "Mazouco"


def test_posts_without_places_are_ignored(tmp_path):
    write_post(tmp_path, "2026-01-01-hello.markdown", "---\ntitle: hi\n---\nx\n")
    assert collect(tmp_path, set()) == {}


def test_non_post_files_skipped(tmp_path):
    write_post(tmp_path, "notes.md", "---\nplaces: [X]\n---\n")
    assert parse_post(tmp_path / "notes.md") is None
