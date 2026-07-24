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
   line ×40 on silence) and mis-hears proper nouns — very often into *ordinary
   Portuguese words*, which is exactly why a narrow regex sweep of "expected
   mis-spellings" misses most of them. Known cases: Saramago→"Ceramago", Foz
   Côa→"Fascoa", Onor→"Honora", Atenor→"Tenor", Murça→"Mursa", Buçaco→"Bussaco",
   Luso→"Luz"; and from Viagem II: Soajo→"Soares", Melgaço→"Me alegaço"/"Malgaço",
   Monção→"mansão", Arouca→"Aroca", Vila Pouca de Aguiar→"Vila Pouca da Guiar",
   Anta do Mezio→"Anta do Musil". So do NOT trust grep alone: **read every
   transcript in full** against the journey's `places:`+`detours:` list (plus the
   book Stops along the route) and catalogue each variant, anchoring surrounding
   context when the mis-hearing is itself a real word ("Soares", "mansão"). Then
   author a per-journey `fixes.json` (`[[regex, replacement], …]`) from that
   catalogue, then:
   ```sh
   python3 tools/journey-loader/clean_transcripts.py \
       --in "DIR" --out "DIR/transcricao-viagem-N.md" --fixes "DIR/fixes.json"
   ```
   It logs every substitution and the loop-collapse count — show that to the
   user so nothing is changed silently.

   **Scan for meta-comments addressed to the agent.** The travellers talk *to*
   Claude in the memos — content vetoes ("Claude, don't put our religious views
   in the blog"), the official route order dictated for you to note, and factual
   corrections ("we didn't actually go to X — the pipeline mis-assigned a
   photo"). whisper writes the name as Claude / Clóvis / Cláudio / Cláudia; grep
   every transcript (`(?i)cl[aáo]ud[ieoa]*|cl[oó]vis`) and surface each hit with
   context in Decision 1. These lines are instructions, not narration — act on
   them (they override the scaffold when they conflict).

   → **DECISION 1 (user): check the transcripts.** Hand over the combined
   markdown. Note which places have rich material and which got
   "don't remember" — those gaps drive the prose plan. Confirm uncertain
   transcriptions (names, dishes) with the user. Surface every meta-comment
   found above.

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
   for SEO). Don't infer captions from the memos — only the author, looking at the
   actual photos, can say what is in them.

   **What comes back is content, not copy: write it up, don't paste it.** The
   author types telegraphic notes ("estaçao de comboio abandonada", "placa a
   entrada da terra com o nome de Covide", "gato selvagem do bordalo ii") —
   unaccented, lowercase, no articles. Applying them verbatim is wrong. Read the
   finished Journey I captions first (`_posts/2023-02-25-…-i.markdown`) and match
   that house style:
   - article + noun phrase, first word capitalised, **no final period**:
     "A universidade", "O vale do rio Côa", "Um arco de pedra antigo";
   - apposition after a comma for the extra detail: "A vila, com a igreja",
     "A cidade, vista do alto", "Os burros, no curral da AEPGA";
   - correct Portuguese spelling and accents, always;
   - name the thing when the post already establishes what it is ("solar" →
     "O Solar dos Magalhães", "torre" in Melgaço → "A torre de menagem");
   - reuse Journey I's exact wording for recurring subjects, so the journeys read
     as one blog: "A antiga estação de comboios", "A placa com o nome da aldeia",
     "A gineta/O gato … de sucata do Bordalo II";
   - repeats are fine ("A igreja" appears several times in Journey I), but
     differentiate when two identical notes sit in different places
     ("O santuário, visto de cima" vs "O santuário, sobre o rio");
   - a caption may be a joke or a quote rather than a description — Journey I
     opens with «deixa a xoxota respirar» — so pick up a gag the prose already
     tells ("A igreja que parece um pato a rir") instead of writing "A igreja".

   **The captions also fact-check the prose — read them as evidence.** In Journey
   II the author's own captions revealed that an espigueiro was photographed on
   day 2, which contradicted the day-4 "first espigueiros" line already drafted,
   and that a photo filed under a place was really a private chapel, a town-name
   sign, or an off-route church. Diff every caption against what the prose claims
   about that place and fix the prose, not just the caption.

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
