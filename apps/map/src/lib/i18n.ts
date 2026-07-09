/**
 * Minimal PT/EN dictionary (WP12, docs/PLAN.md). UI strings only — book
 * content (place names, section titles, quotes) always stays in Portuguese.
 */

const en = {
  progress: "{towns} / {townsTotal} towns · {pages} / {pagesTotal} pages traveled",
  clickHint: "Click a town to mark it visited",
  alsoIndexedAs: "also indexed as: {names}",
  pages: "pp. {pages}",
  stopOnRoute: "Stop #{ordinal} of the journey — Route {chapter}",
  passedOnRoute: "Passed through #{ordinal} of the journey — Route {chapter}",
  kindStop: "stop",
  kindPassed: "passed through",
  kindReferenced: "referenced",
  chapterAbbrev: "ch. {chapter}",
  fromTheBlog: "From the blog:",
  notInJourney: "Not part of Saramago's journey",
  wikipedia: "Wikipedia (PT)",
  markVisited: "Mark as visited",
  visitDate: "Visit date",
  unmarkVisited: "Unmark visited",
  close: "Close",
  prevPlace: "Previous place",
  nextPlace: "Next place",
  theJourney: "The journey",
  searchTown: "Find a place…",
  backToChapters: "← Chapters",
  stopsCount: "{count} stops",
  showRoute: "Show route",
  hideRoute: "Hide route",
  mapFailed: "The map could not load.",
  mapFailedHint: "Check your connection — or an ad blocker may be blocking",
  tryAgain: "Try again",
  trackPitch: "Track the towns you visit — sign in to start.",
  signIn: "Sign in",
  signUp: "Create account",
  signOut: "Sign out",
  email: "Email",
  password: "Password",
  cancel: "Cancel",
  clearSearch: "Clear search",
  navMap: "Map",
  account: "Account",
  noResults: "No matching places",
  exploreHint: "Click a town to see where it appears in the book.",
  legendPlace: "place from the book",
  legendVisited: "visited",
  legendDetour: "detour — off the book",
  legendRoute: "route (one colour per chapter)",
  achievements: "Achievements",
  achievementsSummary: "{unlocked} / {total}",
  achFirstStopTitle: "First stop",
  achFirstStopDesc: "Mark your first town as visited",
  achTowns10Title: "Traveler",
  achTowns50Title: "Wayfarer",
  achTownsDesc: "Visit {target} towns from the book",
  achPages100Title: "Page by page",
  achPagesDesc: "Travel {target} pages of the book",
  achHalfBookTitle: "Half the book",
  achHalfBookDesc: "Travel half of the book's pages",
  achChapterTitle: "Route {chapter} complete",
  achChapterDesc: "Visit every stop of “{title}”",
  achFullJourneyTitle: "The whole journey",
  achFullJourneyDesc: "Visit every stop of Saramago's journey",
};

const pt: typeof en = {
  progress: "{towns} / {townsTotal} terras · {pages} / {pagesTotal} páginas percorridas",
  clickHint: "Clique numa terra para a marcar como visitada",
  alsoIndexedAs: "também no índice como: {names}",
  pages: "pp. {pages}",
  stopOnRoute: "Paragem n.º {ordinal} da viagem — Percurso {chapter}",
  passedOnRoute: "Passagem n.º {ordinal} da viagem — Percurso {chapter}",
  kindStop: "paragem",
  kindPassed: "passagem",
  kindReferenced: "referida",
  chapterAbbrev: "cap. {chapter}",
  fromTheBlog: "Do blog:",
  notInJourney: "Não fazia parte da viagem de Saramago",
  wikipedia: "Wikipédia (PT)",
  markVisited: "Marcar como visitada",
  visitDate: "Data da visita",
  unmarkVisited: "Desmarcar visita",
  close: "Fechar",
  prevPlace: "Lugar anterior",
  nextPlace: "Lugar seguinte",
  theJourney: "A viagem",
  searchTown: "Procurar um lugar…",
  backToChapters: "← Capítulos",
  stopsCount: "{count} paragens",
  showRoute: "Mostrar percurso",
  hideRoute: "Ocultar percurso",
  mapFailed: "Não foi possível carregar o mapa.",
  mapFailedHint: "Verifique a ligação — ou um bloqueador de anúncios pode estar a bloquear",
  tryAgain: "Tentar novamente",
  trackPitch: "Registe as terras que visita — inicie sessão para começar.",
  signIn: "Iniciar sessão",
  signUp: "Criar conta",
  signOut: "Terminar sessão",
  email: "Email",
  password: "Palavra-passe",
  cancel: "Cancelar",
  clearSearch: "Limpar pesquisa",
  navMap: "Mapa",
  account: "Conta",
  noResults: "Nenhum lugar encontrado",
  exploreHint: "Clique numa terra para ver onde aparece no livro.",
  legendPlace: "lugar do livro",
  legendVisited: "visitada",
  legendDetour: "desvio — fora do livro",
  legendRoute: "percurso (uma cor por capítulo)",
  achievements: "Conquistas",
  achievementsSummary: "{unlocked} / {total}",
  achFirstStopTitle: "Primeira paragem",
  achFirstStopDesc: "Marque a primeira terra como visitada",
  achTowns10Title: "Viajante",
  achTowns50Title: "Andarilho",
  achTownsDesc: "Visite {target} terras do livro",
  achPages100Title: "Página a página",
  achPagesDesc: "Percorra {target} páginas do livro",
  achHalfBookTitle: "Meio livro",
  achHalfBookDesc: "Percorra metade das páginas do livro",
  achChapterTitle: "Percurso {chapter} completo",
  achChapterDesc: "Visite todas as paragens de «{title}»",
  achFullJourneyTitle: "A viagem inteira",
  achFullJourneyDesc: "Visite todas as paragens da viagem de Saramago",
};

export type MessageKey = keyof typeof en;

/** Exposed for tests. */
export const dictionaries = { en, pt } as const;

export function detectLanguage(): "en" | "pt" {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    return locale.toLowerCase().startsWith("pt") ? "pt" : "en";
  } catch {
    return "en";
  }
}

const messages = detectLanguage() === "pt" ? pt : en;

export function t(
  key: MessageKey,
  vars: Record<string, string | number> = {},
): string {
  return messages[key].replace(/\{(\w+)\}/g, (_, name) =>
    String(vars[name] ?? `{${name}}`),
  );
}
