# /// script
# requires-python = ">=3.9"
# ///
"""Clean raw whisper transcripts for review. Driven by the
`draft-journey-from-memos` skill. Standard library only.

whisper on long memos produces two artefacts:
  * repetition-loop hallucinations on silence/noise (a line repeated ×N), and
  * mis-heard proper nouns (Saramago->"Ceramago", Foz Côa->"Fascoa", ...).

This collapses the loops and applies a per-journey toponym fix map, logging
EVERY substitution so nothing is changed silently.

Usage (from repo root):
  python3 tools/journey-loader/clean_transcripts.py \
      --in DIR --out DIR/transcricao.md [--fixes DIR/fixes.json]

fixes.json (optional, authored per journey): a list of [regex, replacement]
pairs applied in order, longer/more specific first, e.g.
  [["Vila Nova de Fascoa", "Vila Nova de Foz Côa"],
   ["\\bMursa\\b", "Murça"],
   ["Ceramago", "Saramago"]]
"""
import argparse
import glob
import json
import os
import re
import sys
from collections import Counter


def collapse_inline(line):
    # "dois dois dois dois" -> "dois" (a word repeated 3+ times in a row)
    return re.sub(r"\b(\w+)(\s+\1\b){2,}", r"\1", line, flags=re.IGNORECASE)


def norm(s):
    return re.sub(r"\s+", " ", s.strip().lower()).rstrip(".!?…")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="src", required=True,
                    help="folder of raw .txt transcripts")
    ap.add_argument("--out", required=True, help="combined markdown output path")
    ap.add_argument("--fixes", help="JSON file: list of [regex, replacement]")
    ap.add_argument("--glob", default="*.txt")
    args = ap.parse_args()

    src = os.path.expanduser(args.src)
    out = os.path.expanduser(args.out)
    files = sorted(p for p in glob.glob(os.path.join(src, args.glob))
                   if os.path.abspath(p) != os.path.abspath(out))
    if not files:
        sys.exit(f"No files matching {args.glob} in {src}")

    fixes = json.load(open(os.path.expanduser(args.fixes), encoding="utf-8")) \
        if args.fixes else []

    sub_counts = Counter()
    removed = 0
    parts = ["# Transcrições limpas dos memos de voz\n",
             "_Transcrição automática (whisper). Loops de repetição removidos; "
             "topónimos corrigidos. Várias vozes, sem identificação de quem fala._\n"]

    for f in files:
        cleaned, prev = [], None
        for line in open(f, encoding="utf-8"):
            line = collapse_inline(line.rstrip("\n"))
            key = norm(line)
            if not key:
                continue
            if key == prev:          # drop consecutive duplicate (loop)
                removed += 1
                continue
            cleaned.append(line.strip())
            prev = key
        body = "\n".join(cleaned)
        for pat, rep in fixes:
            body, n = re.subn(pat, rep, body)
            if n:
                sub_counts[(pat, rep)] += n
        title = os.path.splitext(os.path.basename(f))[0]
        parts.append(f"\n---\n\n## {title}\n\n{body}\n")

    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts))

    print(f"Wrote {out}")
    print(f"Collapsed {removed} duplicate/loop lines.")
    if sub_counts:
        print("Toponym fixes applied:")
        for (pat, rep), c in sub_counts.most_common():
            print(f"  {pat:28s} -> {rep:22s} x{c}")


if __name__ == "__main__":
    main()
