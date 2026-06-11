"""
Parses the book's toponymic index (toponymic-index.csv) into structured data:
every place with its page references, plus cross-reference aliases.

Output: apps/map/src/data/book-index.json
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
INPUT_CSV = REPO_ROOT / "tools/map-generator/resources/toponymic-index.csv"
OUTPUT_JSON = REPO_ROOT / "apps/map/src/data/book-index.json"

# "Gaia - ver Vila Nova de Gaia" -> alias entry
ALIAS_RE = re.compile(r"^(?P<from>.+?)\s*[-–—]\s*ver\s+(?P<to>.+?)\.?\s*$")

# a page reference token: "72" or "166-168" (any dash)
REF_RE = re.compile(r"\d+(?:\s*[-–—]\s*\d+)?")

# two index entries accidentally on one line: split before "Word, 123" —
# but never after a single-capital abbreviation ("S. Romão", "D. Maria")
ENTRY_SPLIT_RE = re.compile(
    r"(?<![A-ZÁÂÃÀÉÊÍÓÔÕÚ])\.\s+(?=[A-ZÁÂÃÀÉÊÍÓÔÕÚ][^,.]*,\s*\d)"
)

# "Açores (freg. de Celorico da Beira)" -> name + qualifier
QUALIFIER_RE = re.compile(r"^(?P<name>.+?)\s*\((?P<qualifier>.+)\)$")


def parse_pages(refs_text):
    pages = []
    for token in REF_RE.findall(refs_text):
        bounds = re.split(r"\s*[-–—]\s*", token)
        if len(bounds) == 1:
            pages.append(int(bounds[0]))
        else:
            start, end = int(bounds[0]), int(bounds[1])
            pages.extend(range(start, end + 1))
    return sorted(set(pages))


def parse_entry(entry):
    # name = everything before the first separator that precedes a digit
    m = re.match(r"^(?P<name>[^,]+?)\s*[,.]\s*(?P<refs>\d.*)$", entry)
    if not m:
        return None
    index_name = m.group("name").strip()
    pages = parse_pages(m.group("refs"))
    if not pages:
        return None
    qm = QUALIFIER_RE.match(index_name)
    return {
        "indexName": index_name,
        "name": qm.group("name") if qm else index_name,
        "qualifier": qm.group("qualifier") if qm else None,
        "pages": pages,
    }


def main():
    places, aliases, unparsed = [], [], []

    for line in INPUT_CSV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue

        alias = ALIAS_RE.match(line)
        if alias and not any(ch.isdigit() for ch in line):
            aliases.append(
                {"from": alias.group("from").strip(), "to": alias.group("to").strip()}
            )
            continue

        for entry in ENTRY_SPLIT_RE.split(line):
            parsed = parse_entry(entry)
            if parsed:
                places.append(parsed)
            else:
                unparsed.append(entry)

    places.sort(key=lambda p: p["indexName"])
    OUTPUT_JSON.write_text(
        json.dumps({"places": places, "aliases": aliases}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )

    all_pages = [page for place in places for page in place["pages"]]
    print(f"{len(places)} places, {len(aliases)} aliases -> {OUTPUT_JSON}")
    print(f"pages span {min(all_pages)}-{max(all_pages)}")
    if unparsed:
        print(f"UNPARSED ({len(unparsed)}):", *unparsed, sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
