---
name: draft-journey-from-memos
description: Transcribe a journey's voice memos on-device and draft the Portuguese blog prose from them — filling the ⟨…⟩ placeholders in the day-by-day post that load-journey scaffolds. Use when the user has voice memos for a Viagem and wants them transcribed and/or turned into the blog post (e.g. "process the Viagem II memos", "write the post from these recordings", "transcribe the trip memos").
---

# Draft a journey's blog prose from voice memos

`load-journey` builds the post **scaffold** from photos (places, featured
photos, Saramago epigraphs, day structure, Detours) and leaves every prose bit
as a `⟨…⟩` placeholder. This skill fills those placeholders from the
travellers' **voice memos**: a retrospective two-person conversation walking
through the trip place-by-place (a casual "vibes podcast" — banter, tangents,
jokes, and stretches where they don't remember a place). Journey I was 7 memos,
~76 min.

Scripts live in `tools/journey-loader/` (`transcribe_memos.py`,
`clean_transcripts.py`). This is the playbook and the judgement calls.

## Inviolable rules

- **Never upload the audio.** All transcription is on-device (`mlx-whisper`,
  Apple Silicon). Do not send memos to any cloud transcription service. This is
  the same posture as the photo pipeline.
- **Don't invent travelogue content.** Every fact, story and opinion comes from
  the memos. Where a fact is uncertain (a name, a dish, a date), leave an inline
  `⟨…⟩` marker for the user to confirm — never guess it into the post.
- **Generated files are generated.** Detours come from the post's `detours:`
  block via `blog-sync`; don't hand-edit `detours.json` / `featured-journey.json`.
- **Deliver in stages.** Clean transcripts for the user to check FIRST; draft
  prose only after they've seen them.

## The pipeline

Ask for the **memo folder** and the **journey number N**.

1. **Get the memos onto the Mac.** They usually arrive via iCloud Drive
   (`~/Library/Mobile Documents/com~apple~CloudDocs/Documents`, named
   "New Recording N.m4a") after the user enables Voice Memos iCloud sync, or via
   the Voice Memos app (drag to Finder). AirDrop is the fragile fallback.
   `afinfo FILE` gives durations without installing anything.
   - Shortcut worth offering: macOS 26's Voice Memos shows an on-device
     transcript per recording (View → Transcript). If its Portuguese is good
     enough, the user can paste that and skip whisper entirely.

2. **Transcribe on-device.** `brew install ffmpeg` (decodes m4a), then:
   ```sh
   uv run tools/journey-loader/transcribe_memos.py --memos "DIR" \
       --places "<the post's places: + detours: names, comma-separated>"
   ```
   `--places` primes whisper so toponyms spell correctly. large-v3 runs ~0.4×
   real-time on Apple Silicon (~30 min for 76 min of audio); run it in the
   background. The first run downloads the model (~1.5 GB, cached after).

3. **Clean for review.** whisper produces repetition-loop hallucinations (a
   line ×40 on silence) and mis-hears proper nouns (Saramago→"Ceramago", Foz
   Côa→"Fascoa", Onor→"Honora", Atenor→"Tenor", Murça→"Mursa", Buçaco→"Bussaco",
   Luso→"Luz"). Author a per-journey `fixes.json` (`[[regex, replacement], …]`)
   from the toponyms whisper mangled, then:
   ```sh
   python3 tools/journey-loader/clean_transcripts.py \
       --in "DIR" --out "DIR/transcricao-viagem-N.md" --fixes "DIR/fixes.json"
   ```
   It logs every substitution and the loop-collapse count — show that to the
   user so nothing is changed silently.

   → **DECISION 1 (user): check the transcripts.** Hand over the combined
   markdown. Note which places have rich material and which got
   "don't remember" — those gaps drive the prose plan. Confirm uncertain
   transcriptions (names, dishes) with the user.

4. **Draft the prose into the post.** Fill the `⟨…⟩` placeholders day by day:
   the intro, per-day notes, per-place notes, the epílogo, the title and
   description. Keep the Saramago epigraphs and `<figure>` blocks intact.

   → **DECISION 2 (user): calibrate the voice first.** Draft a small slice
   (intro + one full day spanning a rich place, a thin place, and a detour) and
   get sign-off on register BEFORE writing all eight days. Then complete it.

5. **Captions.** The scaffold's `<figcaption>`s default to the place name, which
   repeats when a place has several photos. To make them describe what's shown
   *without the agent opening the images* (same local-only rule), generate the
   caption helper, have the author fill it, and apply:
   ```sh
   python3 tools/journey-loader/build_caption_helper.py --post POST --out ~/Desktop/viagem-N-captions.html
   # author opens it (needs the dev server running for the images), captions each
   # photo, hits Export -> captions.json, hands it back
   python3 tools/journey-loader/apply_captions.py --post POST --captions captions.json
   ```
   It rewrites each `<figcaption>` and leaves the `alt` as the place name (good
   for SEO). Don't infer captions from the memos — the author must look at the
   actual photos.

## Register (the judgement that matters)

Confirm these with the user, but the Journey I defaults were:

- **One shared "we" narrator.** whisper doesn't separate the two speakers; write
  as a single voice unless told otherwise.
- **Plain and casual, NOT literary.** A light edit of how they actually talk.
  Avoid aphoristic/flourished sentences and heavy semicolons.
- **Never use em dashes (—) in prose.** Use commas, parentheses, or separate
  sentences. (Quote attributions like "— José Saramago" are citations, not
  prose, and stay. Day headings "## Dia N — date" come from the scaffold.)
- **Playful but family-friendly.** Keep the humour; quietly drop crude or
  off-colour asides.
- **Be honest about thin spots.** For places they barely remember, write a short
  honest note ("we circled the church and moved on") — do not pad.
- **`⟨…⟩` markers** for any fact to confirm; they render literally so they're
  easy to spot in preview.

## Build & preview

Local Jekyll (see memory `blog-local-build-coreutils` for the Ruby/coreutils
setup):
```sh
cd apps/blog && ASDF_RUBY_VERSION=3.2.8 \
  bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload
```
Post URL (pretty permalink): `http://127.0.0.1:4000/viagem-a-portugal/<yyyy>/<mm>/<dd>/<slug>/`.
LiveReload refreshes the browser as you edit. Don't run `bundle install/check`
casually — it pollutes the committed `Gemfile.lock` with the local platform;
`git checkout` it if it does. If you change front-matter `detours:` notes,
re-run `tools/blog-sync/sync.py` to regenerate the generated files.

## Background

Pairs with `load-journey` (photos → scaffold + Detours). Domain terms (Place,
Stop, Visit, Detour) in `CONTEXT.md`; the photo/audio local-only rule is in
memory `travel-photos-local-only`.
