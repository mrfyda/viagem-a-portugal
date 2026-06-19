# /// script
# requires-python = ">=3.9"
# ///
"""Apply per-image captions to a journey post's <figcaption>s from a JSON map
(`"slug-rank.avif": "caption"`). Leaves the img `alt` (the place name) untouched,
since that stays useful for SEO. Part of the draft-journey-from-memos skill.

The captions.json is produced by the caption helper (caption_helper.html), filled
in by the author looking at the photos (the agent never opens the images).

Usage (from repo root):
  python3 tools/journey-loader/apply_captions.py \
      --post apps/blog/_posts/<date>-viagem-a-portugal-<roman>.markdown \
      --captions <dir>/captions.json
"""
import argparse
import json
import os
import re

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--post", required=True)
ap.add_argument("--captions", required=True)
args = ap.parse_args()

caps = json.load(open(os.path.expanduser(args.captions), encoding="utf-8"))
path = os.path.expanduser(args.post)
text = open(path, encoding="utf-8").read()

# Match an <img ... 'slug.avif' ...> immediately followed by its <figcaption>…</figcaption>.
FIG = re.compile(
    r"(?P<head><img src=\"\{\{ '/assets/[^']+/(?P<fn>[a-z0-9-]+\.avif)'[^>]*>\s*<figcaption>)"
    r"[^<]*(?P<close></figcaption>)"
)

seen = set()


def repl(m):
    fn = m.group("fn")
    cap = caps.get(fn, "").strip()
    if cap:
        seen.add(fn)
        return m.group("head") + cap + m.group("close")
    return m.group(0)


open(path, "w", encoding="utf-8").write(FIG.sub(repl, text))

print(f"Updated {len(seen)} figcaptions.")
missing = [k for k in caps if k not in seen]
if missing:
    print(f"WARNING: {len(missing)} caption keys not found in the post: {missing}")
