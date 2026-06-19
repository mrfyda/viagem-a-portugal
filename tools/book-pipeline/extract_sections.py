#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
WP1 — Section extraction (docs/PLAN.md).

Reads the Caminho EPUB (BOOK_EPUB_PATH, never committed — ADR 0001) and
produces:

  apps/map/src/data/sections.json        committed, app-bundled structure
  tools/book-pipeline/output/sections/   local-only section text (gitignored)

Chapters are TOC entries whose file also contains sub-marker entries
(toc_marker-N-M); Sections are those sub-markers, split at their anchors.
"""

import html
import os
import re
import sys
import zipfile

import _store as S

NAVPOINT_RE = re.compile(
    r"<navPoint[^>]*>\s*<navLabel>\s*<text>(?P<title>.*?)</text>\s*</navLabel>"
    r'\s*<content src="(?P<src>.*?)"',
    re.S,
)
MARKER_RE = re.compile(r"#(?P<marker>toc_marker-(?P<chapter>\d+)(?:-(?P<section>\d+))?)$")

# ADR 0006: the Caminho EPUB has no navPoint for chapter 5 — its title sits
# as plain body text inside chapter 4's file. Split there.
MISSING_CHAPTER_TITLES = ["A grande e ardente terra de Alentejo"]


def strip_html(fragment: str) -> str:
    fragment = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", fragment, flags=re.S)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def main() -> None:
    epub_path = os.environ.get("BOOK_EPUB_PATH")
    if not epub_path:
        sys.exit("Set BOOK_EPUB_PATH to the local Caminho EPUB (see ADR 0001).")

    with zipfile.ZipFile(epub_path) as zf:
        ncx_name = next(n for n in zf.namelist() if n.endswith("toc.ncx"))
        oebps_root = ncx_name.rsplit("/", 1)[0]
        toc = zf.read(ncx_name).decode("utf-8")

        entries = []
        for m in NAVPOINT_RE.finditer(toc):
            title = html.unescape(m.group("title")).strip()
            src = m.group("src")
            marker = MARKER_RE.search(src)
            entries.append(
                {
                    "title": title,
                    "file": src.split("#")[0],
                    "chapterMarker": marker.group("chapter") if marker else None,
                    "sectionMarker": marker.group("section") if marker else None,
                }
            )

        # chapters: entries without a section index whose file also hosts
        # section entries
        files_with_sections = {e["file"] for e in entries if e["sectionMarker"]}
        chapter_entries = [
            e
            for e in entries
            if e["sectionMarker"] is None and e["file"] in files_with_sections
        ]

        S.SECTIONS_DIR.mkdir(parents=True, exist_ok=True)
        chapters_out = []
        ordinal = 0
        problems = []
        number = 0

        for chapter in chapter_entries:
            raw = zf.read(f"{oebps_root}/{chapter['file']}").decode("utf-8")
            section_entries = [
                e
                for e in entries
                if e["file"] == chapter["file"] and e["sectionMarker"] is not None
            ]

            # chapter boundaries inside this file: the TOC chapter at 0,
            # plus any missing-navPoint chapter found as literal text
            # (ADR 0006)
            boundaries = [(0, chapter["title"])]
            for missing_title in MISSING_CHAPTER_TITLES:
                hit = raw.find(missing_title)
                if hit != -1:
                    boundaries.append((hit, missing_title))
            boundaries.sort()

            # split chapter HTML at each section anchor
            positions = []
            for e in section_entries:
                marker_id = f"toc_marker-{e['chapterMarker']}-{e['sectionMarker']}"
                anchor = re.search(rf'id="{marker_id}"', raw)
                if not anchor:
                    problems.append(f"anchor {marker_id} not found in {e['file']}")
                    continue
                positions.append((anchor.start(), e["title"]))
            positions.sort()

            file_section_files = []
            for b, (b_start, b_title) in enumerate(boundaries):
                b_end = boundaries[b + 1][0] if b + 1 < len(boundaries) else len(raw)
                number += 1
                in_boundary = [p for p in positions if b_start <= p[0] < b_end]

                # text between chapter heading and first section anchor folds
                # into the first section (the chapter's opening lines)
                sections_out = []
                for i, (start, title) in enumerate(in_boundary):
                    begin = b_start if i == 0 else start
                    end = (
                        in_boundary[i + 1][0]
                        if i + 1 < len(in_boundary)
                        else b_end
                    )
                    text = strip_html(raw[begin:end])
                    ordinal += 1
                    sections_out.append({"ordinal": ordinal, "title": title})
                    path = S.SECTIONS_DIR / f"{number:02d}-{ordinal:03d}.txt"
                    path.write_text(text + "\n", encoding="utf-8")
                    file_section_files.append(path)

                chapters_out.append(
                    {"number": number, "title": b_title, "sections": sections_out}
                )

            # gate: section texts must cover the file with no gaps/overlaps
            covered = strip_html(raw)
            joined = " ".join(
                p.read_text(encoding="utf-8").strip() for p in file_section_files
            )
            if abs(len(covered) - len(joined)) > len(covered) * 0.01:
                problems.append(
                    f"file {chapter['file']}: coverage mismatch "
                    f"({len(joined)} of {len(covered)} chars)"
                )

    S.write_json(S.SECTIONS, {"chapters": chapters_out})

    total_sections = sum(len(c["sections"]) for c in chapters_out)
    print(f"{len(chapters_out)} chapters, {total_sections} sections -> {S.SECTIONS}")
    for chapter in chapters_out:
        print(f"  {chapter['number']}. {chapter['title']} ({len(chapter['sections'])} sections)")
    if len(chapters_out) != 6:
        problems.append(f"expected 6 chapters, got {len(chapters_out)}")
    if problems:
        print("GATE FAILURES:", *problems, sep="\n  ")
        sys.exit(1)
    print("gate: OK")


if __name__ == "__main__":
    main()
