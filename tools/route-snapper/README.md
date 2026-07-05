# route-snapper

Snaps the journey Routes to the roads Saramago could actually have driven.

`snap_routes.py` reads `apps/map/src/data/stops.json`, routes each
consecutive same-chapter Stop pair over the road network via the public
[BRouter](https://brouter.de) server, and writes the snapped polylines to
`apps/map/src/data/routes.json` (generated — never hand-edit; the map
falls back to straight lines for any segment missing from it).

```sh
uv run tools/route-snapper/snap_routes.py
```

## The 1979 constraint

The journey happened in October 1979. Portugal then had roughly 70 km of
motorway (short stretches of today's A1, A2 and A5 around Lisbon) and none
of the IP/IC expressway network, which was built with EU funds from the
mid-1980s on — Saramago drove the estradas nacionais.

`car-1979.brf` is BRouter's stock `car-fast` profile with three changes
(uploaded to the server on every run, so no server-side state is assumed):

- `highway=motorway|motorway_link|trunk|trunk_link` → costfactor 10000
  (forbidden; stock profile only soft-penalises motorways ×10)
- `avoid_motorways = true`, `avoid_toll = true` (toll roads in Portugal are
  motorways or ex-SCUT expressways — all post-1979)

What this cannot capture: post-1979 realignments of individual N-roads
(bypasses, variantes) still route along today's alignment, and the router
follows today's one-way systems inside towns. Close, not archival.

Responses are cached in `output/cache/` (gitignored) keyed by profile
content + endpoints, so re-runs after a stops.json change only fetch the
new pairs.
