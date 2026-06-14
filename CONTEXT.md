# Viagem a Portugal

Maps José Saramago's 1979 journey through Portugal (the book *Viagem a
Portugal*, 1981) and lets readers track their own travels along it.

## Language

### The book

**Place**:
An entry in the book's toponymic index (579 total). Identified by its exact
index entry (`indexName`), which may carry a disambiguating qualifier.
_Avoid_: town (places include sights and parishes), location

**Chapter**:
One of the six titled parts of the book, each covering a region of Portugal.

**Section**:
A titled episode within a Chapter (e.g. "Um bagaço em Rio de Onor"). Present
in the Caminho edition's structure.
_Avoid_: episode, subchapter

**Mention**:
An occurrence of a Place name in the book text at a specific position. A
Mention does not imply Saramago went there — he references distant places in
asides and digressions.

**Stop**:
A Place Saramago actually visited in the journey narrative: a Mention that
survived validation (narrative classification, geographic gate, route
continuity). Stops in order form the journey; Mentions only form the index.
_Avoid_: visit (reserved for the app user), waypoint

**Route**:
The ordered sequence of Stops of one Chapter, rendered as one line on the
map. Exactly six Routes exist, one per Chapter. Side trips (out-and-back)
are geometry within a Route, not separate entities.
_Avoid_: leg, journey (the journey is the whole book)

### The traveler (app user)

**Traveler**:
A signed-in account that owns a journey of Visits. Anyone may browse the map
anonymously; only a Traveler can act (mark Visits, set dates).
_Avoid_: user, account, member

**Visit**:
A Traveler marking a Place as traveled, with an optional user-entered date.
Belongs to the Traveler's journey, never Saramago's.
_Avoid_: check-in, visited flag
