/**
 * Runtime <head> updates for the web build: keep document.title and the
 * description/OG meta in step with the current selection, so a deep link to a
 * Place reads well in the browser tab, in shared copied URLs, and for crawlers
 * that execute JavaScript (Google). Social scrapers don't run JS — the static
 * fallback they see is the build-time head from scripts/inject-web-meta.mjs.
 *
 * The base strings below mirror that script; keep the two in sync.
 */

import type { Selection } from "../hooks/useSelection";
import { bookPlaceByName } from "./book";
import { detourBySlug } from "./detours";
import { quoteFor } from "./quotes";

const SITE = "Viagem a Portugal";
const BASE_TITLE = "Viagem a Portugal — mapa interativo";
const BASE_DESCRIPTION =
  "Mapa interativo de todos os lugares de Viagem a Portugal de José Saramago: " +
  "centenas de vilas, aldeias e sítios, cada um ligado às suas páginas no " +
  "livro, com as seis rotas traçadas entre paragens.";

/** Clamp a meta description to a sensible length, breaking on a word boundary. */
function clamp(text: string, max = 200): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function setMeta(selector: string, attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setHead(title: string, description: string): void {
  document.title = title;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
}

function placeHead(indexName: string): { title: string; description: string } {
  const place = bookPlaceByName.get(indexName);
  const name = place?.name ?? indexName;
  const quote = quoteFor(indexName);
  const pages = place?.pages.join(", ");
  const description = quote
    ? clamp(`“${quote}” — ${name} em Viagem a Portugal de José Saramago.`)
    : pages
      ? `${name} em Viagem a Portugal de José Saramago — páginas ${pages}.`
      : `${name} em Viagem a Portugal de José Saramago.`;
  return { title: `${name} — ${SITE}`, description };
}

function detourHead(slug: string): { title: string; description: string } {
  const detour = detourBySlug(slug);
  const name = detour?.name ?? slug;
  const description = detour?.note
    ? clamp(`${name}: ${detour.note}`)
    : detour
      ? `${name}, uma paragem fora da rota de Viagem a Portugal — ${detour.postTitle}.`
      : `${name} — ${SITE}.`;
  return { title: `${name} — ${SITE}`, description };
}

/** Reflect the current selection in the document head (no-op on native). */
export function applySelectionToHead(selection: Selection): void {
  if (typeof document === "undefined") return;
  if (!selection) {
    setHead(BASE_TITLE, BASE_DESCRIPTION);
    return;
  }
  const { title, description } =
    selection.kind === "place" ? placeHead(selection.id) : detourHead(selection.slug);
  setHead(title, description);
}
