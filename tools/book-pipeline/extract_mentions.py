#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
WP2 — Mention extraction (docs/PLAN.md, ADR 0003).

Pure string matching of all index Places (and aliases) over the section
texts produced by extract_sections.py. No classification here — every hit
is a Mention; WP3 decides what kind.

Output: tools/book-pipeline/output/mentions.json (local-only; offsets point
into local section text files).
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BOOK_INDEX = REPO_ROOT / "apps/map/src/data/book-index.json"
SECTIONS_JSON = REPO_ROOT / "apps/map/src/data/sections.json"
SECTIONS_DIR = REPO_ROOT / "tools/book-pipeline/output/sections"
OUTPUT = REPO_ROOT / "tools/book-pipeline/output/mentions.json"

# common Portuguese toponym abbreviation variants (index ↔ prose)
EXPANSIONS = [("S. ", "São "), ("Sta. ", "Santa "), ("D. ", "Dona ")]

# book uses short forms for some index entries (see match-aliases.json)
MATCH_ALIASES = json.loads(
    (Path(__file__).parent / "match-aliases.json").read_text(encoding="utf-8")
)

# index places legitimately absent from the body text (kept in the index
# for the printed edition's own reasons); zero mentions allowed
ZERO_MENTION_OK = {"Praias do Sado", "Laborato"}


def variants(name: str) -> set[str]:
    out = {name}
    for short, long in EXPANSIONS:
        for v in list(out):
            if short in v:
                out.add(v.replace(short, long))
            if long in v:
                out.add(v.replace(long, short))
    for v in list(out):
        out.add(v.replace("'", "’"))  # typographic apostrophe (d’El-Rei)
        out.add(v.replace(" de ", " da "))  # connector drift (de/da Cerveira)
        out.add(v.replace(" da ", " de "))
        if "-" in v:
            out.add(v.replace("-", " "))
            out.add(v.replace("-", " ", 1))  # A-Ver-o-Mar -> A Ver-o-Mar
        head, _, rest = v.partition(" ")
        if rest:
            out.add(f"{head.lower()} {rest}")  # praia da Rocha
    return out


def main() -> None:
    index = json.loads(BOOK_INDEX.read_text(encoding="utf-8"))
    sections = json.loads(SECTIONS_JSON.read_text(encoding="utf-8"))

    # search term -> candidate indexNames (homonyms share a display name)
    targets: dict[str, list[str]] = defaultdict(list)
    for place in index["places"]:
        for v in variants(place["name"]):
            targets[v].append(place["indexName"])
    for alias in index["aliases"]:
        for v in variants(alias["from"]):
            targets[v].append(alias["to"])
    for short_form, index_names in MATCH_ALIASES.items():
        if short_form.startswith("_"):
            continue
        targets[short_form] = list(index_names)

    # one regex per term, word-bounded, case-sensitive; longest term wins
    # overlaps
    terms = sorted(targets, key=len, reverse=True)
    patterns = {t: re.compile(rf"(?<![\w-]){re.escape(t)}(?![\w-])") for t in terms}

    section_meta = {
        s["ordinal"]: (c["number"], s["title"])
        for c in sections["chapters"]
        for s in c["sections"]
    }

    mentions = []
    for path in sorted(SECTIONS_DIR.glob("*.txt")):
        chapter_num, ordinal = (int(x) for x in path.stem.split("-"))
        text = path.read_text(encoding="utf-8")
        spans: list[tuple[int, int, str]] = []
        taken: list[tuple[int, int]] = []
        for term in terms:  # longest first
            for m in patterns[term].finditer(text):
                if any(m.start() < e and m.end() > s for s, e in taken):
                    continue  # inside a longer match
                taken.append((m.start(), m.end()))
                spans.append((m.start(), m.end(), term))
        for start, _end, term in sorted(spans):
            candidates = sorted(set(targets[term]))
            mentions.append(
                {
                    "chapter": chapter_num,
                    "section": ordinal,
                    "offset": start,
                    "matched": term,
                    "candidates": candidates,
                }
            )

    OUTPUT.write_text(
        json.dumps({"mentions": mentions}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    hit_places = {c for m in mentions for c in m["candidates"]}
    paged = [p["indexName"] for p in index["places"] if p["pages"]]
    missing = sorted(set(paged) - hit_places - ZERO_MENTION_OK)
    ambiguous = sum(1 for m in mentions if len(m["candidates"]) > 1)
    print(f"{len(mentions)} mentions across {len(section_meta)} sections")
    print(f"places hit: {len(hit_places)}/{len(paged)}; ambiguous mentions: {ambiguous}")
    if missing:
        print(f"GATE: {len(missing)} paged places with zero mentions:")
        for name in missing:
            print(f"  {name}")
        sys.exit(1)
    print("gate: OK")


if __name__ == "__main__":
    main()
