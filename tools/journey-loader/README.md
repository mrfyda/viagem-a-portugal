# journey-loader

Turns a folder of trip photos into web-ready assets, a day-by-day blog post
scaffold, and map Detours — **fully on-device** (photo pixels never leave the
machine). Driven by the `load-journey` skill; see its `SKILL.md` for the full
playbook and decision points.

Pipeline (run from the repo root; outputs land in `<photos>/_journey/`):

| # | Command | Output |
|---|---|---|
| 1 | `python3 tools/journey-loader/extract_metadata.py --photos DIR` | `metadata.json` (date, GPS, snapped town, inferred locations) |
| 2 | `swift tools/journey-loader/detect_people.swift DIR` | `people.json` (Vision face/person counts) |
| 3 | `swift tools/journey-loader/measure_sharpness.swift DIR` | `quality.json` (sharpness + brightness) |
| 4 | `python3 tools/journey-loader/curate.py --photos DIR` | enriched `metadata.json` + `shortlist.csv` |
| 5 | `python3 tools/journey-loader/build_viewer.py --photos DIR --title "…"` | `viewer.html` + thumbnails → **you select** → `selection.txt` |
| — | `python3 tools/journey-loader/review_detours.py --photos DIR --selection selection.txt` | flags far-snapped photos → **you classify** Detours |
| 6 | `python3 tools/journey-loader/export_web.py --photos DIR --journey N --selection selection.txt` | single-tile AVIFs in `apps/blog/assets/viagem-N/` + `manifest.json` |
| 7 | `python3 tools/journey-loader/scaffold_post.py --photos DIR --journey N` | `apps/blog/_posts/<date>-viagem-a-portugal-<roman>.markdown` |

Then add any Detours to the post's `detours:` block, run `tools/blog-sync/sync.py`,
and build (see the skill for the container build + combined single-port serve).

Stage 6 writes a lossless PNG per photo with Swift/ImageIO (resize, orientation,
EXIF strip) and encodes the AVIF with `ffmpeg`/`libsvtav1`. We avoid ImageIO's own
AVIF writer because it tiles anything >512px into a **grid**, which Firefox can't
decode (Chrome/Safari can).

Requirements (all preinstalled on the dev Mac): `exiftool`, `swift` (Vision +
ImageIO, macOS 12+), `sips`, `ffmpeg` (with `libsvtav1`), `python3`. No
`pip`/`uv` packages needed — these scripts use only the standard library, so they
work even when PyPI is unreachable. There is no local webp encoder, hence AVIF.
