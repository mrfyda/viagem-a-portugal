# One short quote per Stop

The town detail view shows at most one short quote (≤ 25 words, always
attributed to the book) per Stop, extracted by the book pipeline. We rely on
the EU/PT quotation right for short attributed excerpts; full passages are
never shipped. Quotes live in their own generated artifact so they can be
pulled without touching the rest of the data if the rights position changes.
