import type { ReactNode } from "react";

import type { Detour } from "../lib/detours";
import { t } from "../lib/i18n";
import PanelShell from "./PanelShell";
import PostHero from "./PostHero";

export interface DetourDetailPanelProps {
  detour: Detour;
  /** Embedded panels (in the desktop sidebar) skip their own positioning. */
  embedded?: boolean;
  /** Back control for the desktop panel header — see PanelShell. */
  back?: ReactNode;
  onClose: () => void;
}

/**
 * Detail panel for a Detour (ADR 0010) — an off-book place. No book metadata
 * (pages, mentions, route) and no visit button: a Detour is display-only. It
 * states plainly that it was not part of Saramago's journey and links to the
 * post that covers it.
 *
 * Shares {@link PostHero} with TownDetailPanel, and leads with it for a stronger
 * reason: every one of the 17 Detours carries both a note and an image, and the
 * post is the *only* content a Detour has. What it deliberately does not share
 * is BookSection — there is no book data to put in it — nor the Place panel's
 * quote styling, since the note is editorial description and must not borrow
 * Saramago's attribution.
 */
export default function DetourDetailPanel({
  detour,
  embedded = false,
  back,
  onClose,
}: DetourDetailPanelProps) {
  return (
    <PanelShell
      title={detour.name}
      embedded={embedded}
      back={back}
      onClose={onClose}
    >
      <PostHero
        image={detour.image}
        postUrl={detour.postUrl}
        postTitle={detour.postTitle}
        alt={detour.name}
      />
      <span className="text-[13px] italic text-muted-foreground">
        {t("notInJourney")}
      </span>
      {detour.note && (
        <p className="m-0 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-foreground">
          {detour.note}
        </p>
      )}
    </PanelShell>
  );
}
