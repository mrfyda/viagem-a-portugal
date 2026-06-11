#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
WP7 — condensed app-facing mentions (docs/PLAN.md).

Aggregates classifications.json into the per-Place view the app needs
(which sections mention a Place and how), dropping pipeline internals
(offsets, ambiguity candidates).

Output: apps/map/src/data/mentions.json
"""

import json
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CLASSIFICATIONS = REPO / "tools/book-pipeline/classifications.json"
OUTPUT = REPO / "apps/map/src/data/mentions.json"


def main() -> None:
    mentions = json.loads(CLASSIFICATIONS.read_text(encoding="utf-8"))["mentions"]
    per_place: dict[str, list] = defaultdict(list)
    seen = set()
    for m in sorted(mentions, key=lambda m: (m["section"], m["offset"])):
        for cand in m["candidates"]:
            key = (cand, m["section"], m["kind"])
            if key in seen:
                continue  # one entry per (place, section, kind)
            seen.add(key)
            per_place[cand].append(
                {"chapter": m["chapter"], "section": m["section"], "kind": m["kind"]}
            )

    OUTPUT.write_text(
        json.dumps(dict(sorted(per_place.items())), ensure_ascii=False, indent=1)
        + "\n",
        encoding="utf-8",
    )
    total = sum(len(v) for v in per_place.values())
    print(f"{len(per_place)} places, {total} entries -> {OUTPUT} "
          f"({OUTPUT.stat().st_size // 1024}KB)")


if __name__ == "__main__":
    main()
