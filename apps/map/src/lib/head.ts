/**
 * Native stub for the web's runtime <head> updates. There is no document to
 * mutate, so this is a no-op — kept as a separate platform file so the hook can
 * import one module unconditionally (mirrors location.ts / location.web.ts).
 */

import type { Selection } from "../hooks/useSelection";

export function applySelectionToHead(_selection: Selection): void {}
