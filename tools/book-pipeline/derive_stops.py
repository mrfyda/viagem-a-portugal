#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
WP5 — Stops and chapter Routes (docs/PLAN.md, ADR 0003).

From classified Mentions, derive the journey: one entry per (Place, Chapter)
with stop/passed-through evidence, ordered by first evidence position in the
narrative. Ambiguous mention candidates are resolved by route proximity;
continuity outliers are flagged for the review agent.

Limitation (v1): a Place appears once per Chapter at its first evidence
position — revisits (e.g. nightly returns to a base town) are flattened.

Outputs:
  apps/map/src/data/stops.json            committed, app-bundled
  tools/book-pipeline/output/stops-report.json   review queue
"""

import math
from collections import defaultdict

import _store as S

NEIGHBOR_FLAG_KM = 50.0


def km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat = math.radians((a[0] + b[0]) / 2)
    dx = (a[1] - b[1]) * 111.32 * math.cos(lat)
    dy = (a[0] - b[0]) * 110.57
    return math.hypot(dx, dy)


def main() -> None:
    mentions = S.read_json(S.CLASSIFICATIONS)["mentions"]
    coords = S.load_coords()

    # reviewed journey overrides: per-(place, chapter) exclusions for
    # misattributed mentions (chapel/tower common nouns, people, streets)
    # and coordinate overrides where the same index entry names a different
    # physical thing in this chapter
    ov = S.load_overrides()
    excluded = {(e["chapter"], e["place"]) for e in ov["exclusions"]}
    mention_excluded = {
        (e["chapter"], e["section"], e["place"])
        for e in ov.get("mentionExclusions", [])
    }
    accepted_flags = {
        (a["chapter"], a["place"]) for a in ov.get("acceptedFlags", [])
    }
    chapter_coords_override = {
        (c["chapter"], c["place"]): (c["latitude"], c["longitude"])
        for c in ov["coords"]
    }
    # reviewed splits: an index entry the book reuses for two different
    # physical places (e.g. "Lagoa" is both the Óbidos lagoon in ch4 and the
    # Algarve town in ch6). The homonym referent is emitted under its own
    # name so each renders one marker with its own panel/quote.
    renames = {(s["chapter"], s["place"]): s["name"] for s in ov.get("splits", [])}

    def coord_of(chapter: int, place: str) -> tuple[float, float]:
        return chapter_coords_override.get((chapter, place)) or coords[place]

    # journey evidence: (chapter, place) -> first position + strongest kind
    evidence: dict[tuple[int, str], dict] = {}
    for m in mentions:
        if m["kind"] == "referenced-only":
            continue
        pos = (m["section"], m["offset"])
        for cand in m["candidates"]:
            if (m["chapter"], m["section"], cand) in mention_excluded:
                continue
            key = (m["chapter"], cand)
            e = evidence.get(key)
            if e is None:
                evidence[key] = {
                    "pos": pos,
                    "kind": m["kind"],
                    "ambiguous": len(m["candidates"]) > 1,
                }
            else:
                e["pos"] = min(e["pos"], pos)
                if m["kind"] == "stop":
                    e["kind"] = "stop"
                e["ambiguous"] = e["ambiguous"] and len(m["candidates"]) > 1

    # build per-chapter ordered sequences
    chapters: dict[int, list[dict]] = defaultdict(list)
    skipped_no_coords = []
    for (chapter, place), e in evidence.items():
        if (chapter, place) in excluded:
            continue
        if place not in coords:
            skipped_no_coords.append(place)
            continue
        chapters[chapter].append(
            {
                "place": place,
                "pos": e["pos"],
                "kind": e["kind"],
                "ambiguous": e["ambiguous"],
            }
        )
    for seq in chapters.values():
        seq.sort(key=lambda s: s["pos"])

    # resolve places that appear only via ambiguous mentions: keep the
    # candidate closer to its narrative neighbors, drop the other
    for chapter, seq in chapters.items():
        amb = [i for i, s in enumerate(seq) if s["ambiguous"]]
        drop = set()
        seen_pos: dict[tuple, list[int]] = defaultdict(list)
        for i in amb:
            seen_pos[seq[i]["pos"]].append(i)
        for pos, group in seen_pos.items():
            if len(group) < 2:
                continue  # ambiguity already collapsed by other mentions
            def neighbor_dist(i: int) -> float:
                p = coord_of(chapter, seq[i]["place"])
                dists = []
                for j in (i - 1, i + 1):
                    if 0 <= j < len(seq) and j not in group:
                        dists.append(km(p, coord_of(chapter, seq[j]["place"])))
                return min(dists) if dists else 0.0
            keep = min(group, key=neighbor_dist)
            drop.update(g for g in group if g != keep)
        chapters[chapter] = [s for i, s in enumerate(seq) if i not in drop]

    # within one Section, mention order is unreliable (Saramago recaps and
    # lists places out of travel order) — reorder each section's stops to
    # the shortest path anchored to the previous/next section, keeping the
    # section sequence itself narrative (ADR 0003)
    def shortest_order(points, entry, exit_pt):
        n = len(points)
        if n <= 2:
            return list(range(n))
        def cost(order):
            seq = [entry] + [points[i] for i in order] + ([exit_pt] if exit_pt else [])
            return sum(km(seq[i], seq[i + 1]) for i in range(len(seq) - 1))
        order = list(range(n))
        if n <= 9:  # exact via permutations
            from itertools import permutations
            order = min(permutations(range(n)), key=cost)
            return list(order)
        improved = True  # 2-opt
        while improved:
            improved = False
            for i in range(n - 1):
                for j in range(i + 1, n):
                    cand = order[:i] + order[i:j + 1][::-1] + order[j + 1:]
                    if cost(cand) < cost(order) - 1e-9:
                        order = cand
                        improved = True
        return order

    for chapter, seq in chapters.items():
        result = []
        i = 0
        while i < len(seq):
            j = i
            while j < len(seq) and seq[j]["pos"][0] == seq[i]["pos"][0]:
                j += 1
            group = seq[i:j]
            entry = (
                coord_of(chapter, result[-1]["place"])
                if result
                else coord_of(chapter, group[0]["place"])
            )
            exit_pt = coord_of(chapter, seq[j]["place"]) if j < len(seq) else None
            pts = [coord_of(chapter, s["place"]) for s in group]
            result.extend(group[k] for k in shortest_order(pts, entry, exit_pt))
            i = j
        chapters[chapter] = result

    # continuity flags: both narrative neighbors far away
    flags = []
    for chapter, seq in sorted(chapters.items()):
        for i, s in enumerate(seq):
            p = coord_of(chapter, s["place"])
            dists = [
                km(p, coord_of(chapter, seq[j]["place"]))
                for j in (i - 1, i + 1)
                if 0 <= j < len(seq)
            ]
            if (
                dists
                and min(dists) > NEIGHBOR_FLAG_KM
                and (chapter, s["place"]) not in accepted_flags
            ):
                flags.append(
                    {
                        "chapter": chapter,
                        "place": s["place"],
                        "kind": s["kind"],
                        "minNeighborKm": round(min(dists), 1),
                        "neighbors": [
                            seq[j]["place"]
                            for j in (i - 1, i + 1)
                            if 0 <= j < len(seq)
                        ],
                    }
                )

    # emit ordered stops with global ordinals
    ordinal = 0
    out = []
    for chapter in sorted(chapters):
        for s in chapters[chapter]:
            ordinal += 1
            lat, lon = coord_of(chapter, s["place"])
            out.append(
                {
                    "ordinal": ordinal,
                    "place": renames.get((chapter, s["place"]), s["place"]),
                    "chapter": chapter,
                    "section": s["pos"][0],
                    "role": s["kind"],  # "stop" | "passed-through"
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6),
                }
            )

    S.write_json(S.STOPS, {"stops": out}, indent=1)
    S.write_json(
        S.STOPS_REPORT,
        {"continuityFlags": flags, "skippedNoCoords": sorted(set(skipped_no_coords))},
    )

    stops_only = sum(1 for s in out if s["role"] == "stop")
    print(f"{len(out)} journey points ({stops_only} stops) across {len(chapters)} chapters")
    for ch in sorted(chapters):
        n = len(chapters[ch])
        print(f"  ch{ch}: {n} points")
    print(f"continuity flags: {len(flags)}; no-coords skips: {len(set(skipped_no_coords))}")
    print(f"-> {S.STOPS}\n-> {S.STOPS_REPORT}")


if __name__ == "__main__":
    main()
