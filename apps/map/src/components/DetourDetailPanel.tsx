import type { Detour } from "../lib/detours";
import { t } from "../lib/i18n";
import PanelShell from "./PanelShell";
import PostPhotoLink from "./PostPhotoLink";

export interface DetourDetailPanelProps {
  detour: Detour;
  /** Embedded panels (in the desktop sidebar) skip their own positioning. */
  embedded?: boolean;
  onClose: () => void;
}

/**
 * Detail panel for a Detour (ADR 0010) — an off-book place. No book metadata
 * (pages, mentions, route) and no visit button: a Detour is display-only. It
 * states plainly that it was not part of Saramago's journey and links to the
 * post that covers it.
 */
export default function DetourDetailPanel({
  detour,
  embedded = false,
  onClose,
}: DetourDetailPanelProps) {
  return (
    <PanelShell title={detour.name} embedded={embedded} onClose={onClose}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("notInJourney")}
      </span>
      {detour.note && (
        <p className="m-0 rounded-md bg-secondary p-3 text-[13px] italic leading-relaxed">
          {detour.note}
        </p>
      )}
      <PostPhotoLink
        image={detour.image}
        postUrl={detour.postUrl}
        postTitle={detour.postTitle}
        alt={detour.name}
      />
      <a
        href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(detour.name.replaceAll(" ", "_"))}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary underline"
      >
        {t("wikipedia")}
      </a>
    </PanelShell>
  );
}
