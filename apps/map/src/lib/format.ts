/** Small display formatters shared across panels and map popups. */

/**
 * Bookish page label: consecutive pages collapse to ranges — [89,90,91,93]
 * reads "89–91, 93" the way an index does, not as a comma flood.
 */
export function formatPages(pages: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < pages.length; ) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    parts.push(j > i ? `${pages[i]}–${pages[j]}` : `${pages[i]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/**
 * Blog posts still being written carry ⟨a confirmar⟩ markers in their titles
 * and notes; strip them (and a dangling separator) rather than leak drafts
 * into the UI.
 */
export function stripDraftMarkers(text: string): string {
  return text
    .replace(/\s*[—–-]?\s*⟨[^⟩]*⟩/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
