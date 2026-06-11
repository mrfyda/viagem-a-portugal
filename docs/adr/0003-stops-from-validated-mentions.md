# Stops derived from validated Mentions

A Place's first appearance in the text does not mean Saramago went there
(asides and digressions reference distant places). Stops are produced by a
multi-signal pipeline over Mentions: (1) narrative classification of the
surrounding passage (stop / passed-through / referenced-only) by cheap-model
subagents, (2) a geographic gate against the chapter's region envelope,
(3) route continuity outlier detection. Signal disagreements are resolved by
a stronger-model review agent, not auto-resolved by majority and not queued
for a human.

Outcome (2026-06): the hand-made `routes.json` validated the derived chapter-1
Route at exactly the 80% adjacency gate and was retired — the derived journey
is now the only route source (`stops.json` + `journey-overrides.json`). The
review pass surfaced that generic index entries (Ermida, Torre, São Vicente,
Salvador…) name different physical things per chapter; those carry
per-chapter coordinate overrides or exclusions rather than one global
coordinate. Revisits within a chapter are flattened to the first evidence
position (known v1 limitation).

Amendment: within one Section, mention order proved unreliable (Saramago
recaps and lists places out of travel order), producing X-shaped route
crossings. Stops are therefore reordered inside each Section to the
shortest path anchored to the neighboring Sections; the Section sequence
itself stays narrative. Self-crossings dropped 101 → 32 (0 within-section);
the remainder are real backtracks.
