# soundtrack-miner

Reduces the Spotify Extended Streaming History export — a lifetime of plays
across many `Streaming_History_Audio_*.json` files, too large (and too
personal: IPs, user agents) to ever enter the repo — to one small curation
report per car journey, for the "trip soundtracks" feature
(docs/BACKLOG.md).

```sh
SPOTIFY_HISTORY_PATH=~/Downloads/my_spotify_data.zip \
  uv run tools/soundtrack-miner/mine_history.py
```

`SPOTIFY_HISTORY_PATH` points at the export ZIP as downloaded from
Spotify's privacy page, or at its extracted folder — both work; video
history and podcasts are ignored.

Journeys are read from the blog posts' front matter: `visit_date` is day 1
and the `## Dia N` headings give the length. `transport: train` journeys
are skipped by design — a shared soundtrack is a car thing (so Viagem IV is
out). A play counts when it ran at least 30 seconds; Spotify's timestamps
are UTC and get bucketed into Europe/Lisbon days.

Each report in `output/` (gitignored) has the journey's top tracks, a
per-day chronology, and a ready-to-paste `soundtrack:` front matter block —
curate it, don't paste blindly. Rendering the `soundtrack:` list on the
blog ("banda sonora" liner notes) is a separate, later step.

Test: `uv run --with pytest --with pyyaml --with tzdata -m pytest tools/soundtrack-miner/test_mine.py`
