"""Unit tests for the book-pipeline data layer (_store)."""

import _store as S


def test_read_write_roundtrip(tmp_path):
    path = tmp_path / "x.json"
    data = {"a": [1, 2], "b": "São Brás"}
    S.write_json(path, data, indent=1)
    assert S.read_json(path) == data
    text = path.read_text(encoding="utf-8")
    assert text.endswith("\n")  # trailing newline
    assert "São Brás" in text  # ensure_ascii=False — non-ASCII kept verbatim


def test_merge_coords_overrides_and_drops_zeros():
    locations = [
        {"name": "Bragança", "latitude": 41.8, "longitude": -6.8, "source": "x", "confidence": "high"},
        {"name": "Ungeocoded", "latitude": 0, "longitude": 0, "source": "unresolved", "confidence": "none"},
        {"name": "Lisboa", "latitude": 38.7, "longitude": -9.1, "source": "x", "confidence": "high"},
    ]
    corrections = [
        {"name": "Lisboa", "latitude": 38.71, "longitude": -9.14},  # overrides locations
        {"name": "Lagoa de Óbidos", "latitude": 39.4, "longitude": -9.2},  # off-index add
    ]
    coords = S.merge_coords(locations, corrections)
    assert coords["Bragança"] == (41.8, -6.8)
    assert "Ungeocoded" not in coords  # (0,0) "not geocoded" dropped
    assert coords["Lisboa"] == (38.71, -9.14)  # correction wins over locations
    assert coords["Lagoa de Óbidos"] == (39.4, -9.2)


def test_index_names_is_the_unique_complete_join_key():
    names = S.index_names()
    assert "Bragança" in names
    assert len(names) == len(S.load_places())  # one per Place, no collisions
