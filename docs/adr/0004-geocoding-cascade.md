# Geocoding cascade with provenance

Coordinates come from a cascade: official Portuguese gazetteer (CAOP) exact
match first, Nominatim (countrycodes=pt, structured query) fallback, with
**deviation (2026-06)**: DGT's CAOP download URLs proved unstable (404), so
Nominatim runs as primary source; CAOP slot stays open in the cascade for
when a stable distribution is found. Continuing:
the Place's index qualifier and the chapter's region envelope as homonym
disambiguators. Output is a single generated locations file where every
coordinate carries source + confidence; `corrections.json` shrinks to human
overrides only and always wins. A stronger-model agent reviews low-confidence
results before promotion. (Replaces the original pt.wikipedia title lookup.)
