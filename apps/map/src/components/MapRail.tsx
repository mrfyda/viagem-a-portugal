import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/** The panel's views. A selection (Place/Detour) lives inside `journey`. */
export type PanelView = "journey" | "achievements" | "account";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICON: Record<PanelView, React.ReactNode> = {
  journey: (
    <svg viewBox="0 0 24 24" width={22} height={22} {...stroke}>
      <circle cx="6" cy="18.5" r="2.2" />
      <circle cx="18" cy="5.5" r="2.2" />
      <path d="M8 18h6a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h6" />
    </svg>
  ),
  achievements: (
    <svg viewBox="0 0 24 24" width={22} height={22} {...stroke}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 2.7 4M17 5h2.5a2.5 2.5 0 0 1-2.7 4" />
      <path d="M12 14v3.5M8.5 20.5h7" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" width={22} height={22} {...stroke}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.7-3.8 4-5.6 7.5-5.6s6.8 1.8 7.5 5.6" />
    </svg>
  ),
};

/**
 * One item. Active inverts to a white chip with a green glyph, which reads as
 * the selected item connecting to the white panel beside it — a tab to its
 * page. Inactive glyphs sit at 80% white (~6:1 on the green, well past the 3:1
 * non-text bar, and bright enough not to look switched off next to the chip).
 */
function RailButton({
  label,
  active,
  onClick,
  badge,
  dot,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Unlocked-achievement count. White on green — a green badge would vanish. */
  badge?: string;
  /** Signed-out marker. Accent yellow is the only token with contrast here, and
   *  it stands in for the green "Sign in" button the rail replaces. */
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-card text-primary shadow-sm"
          : "text-primary-foreground/80 hover:bg-white/15 hover:text-primary-foreground"
      }`}
    >
      {children}
      {badge && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums ${
            active
              ? "bg-primary text-primary-foreground"
              : "bg-card text-primary"
          }`}
        >
          {badge}
        </span>
      )}
      {dot && !badge && (
        <span
          aria-hidden
          className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ${
            active ? "bg-primary ring-card" : "bg-accent ring-primary"
          }`}
        />
      )}
    </button>
  );
}

/**
 * The desktop panel's navigation: a brand-green rail down the left edge of the
 * panel card. It replaces the old stack of always-mounted header blocks — the
 * wordmark nav, the progress/auth block and the achievements fold-out — so the
 * panel body belongs entirely to whichever view is open, and a selected Place
 * is no longer buried under ~200px of chrome.
 *
 * The brand mark at the top links to the blog: the map lives at `/map` under
 * it, so "up" from here is the travelogue. Web-only DOM chrome.
 */
export default function MapRail({
  view,
  onSelectView,
  hasAccount,
  signedOut,
  unlocked,
}: {
  /** Which view the panel is showing — a selection still reads as `journey`. */
  view: PanelView;
  onSelectView: (view: PanelView) => void;
  /** Hide the account item on builds without sign-in (no Supabase config). */
  hasAccount: boolean;
  signedOut: boolean;
  unlocked: number;
}) {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 bg-primary py-2">
      <a
        href={withSiteBase("/")}
        aria-label="Viagem a Portugal"
        title="Viagem a Portugal"
        className="flex h-11 w-11 items-center justify-center rounded-lg font-serif text-[20px] font-bold text-primary-foreground no-underline transition-colors hover:bg-white/15"
      >
        V
      </a>
      <span aria-hidden className="my-1 h-px w-7 bg-white/25" />

      <RailButton
        label={t("theJourney")}
        active={view === "journey"}
        onClick={() => onSelectView("journey")}
      >
        {ICON.journey}
      </RailButton>
      <RailButton
        label={t("achievements")}
        active={view === "achievements"}
        onClick={() => onSelectView("achievements")}
        badge={unlocked > 0 ? String(unlocked) : undefined}
      >
        {ICON.achievements}
      </RailButton>
      {hasAccount && (
        <RailButton
          label={t("account")}
          active={view === "account"}
          onClick={() => onSelectView("account")}
          dot={signedOut}
        >
          {ICON.account}
        </RailButton>
      )}
    </nav>
  );
}
