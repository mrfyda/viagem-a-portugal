import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/**
 * Mobile-only full-width top navigation bar: the brand wordmark on a brand-green
 * field, with just the About link (Map is implicit — you're on it). Replaces the
 * old floating brand card; the journey/account/search live in the bottom glass
 * nav now. Web-only DOM chrome — links go through withSiteBase so they resolve
 * next to the blog under a sub-path host (e.g. /viagem-a-portugal/).
 */
export default function MapTopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-primary px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground shadow-sm">
      <a
        href={withSiteBase("/")}
        className="font-serif text-lg font-normal leading-none tracking-wide text-primary-foreground no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        Viagem a Portugal
      </a>
      <a
        href={withSiteBase("/about/")}
        className="rounded-md px-2.5 py-1 text-sm font-medium text-primary-foreground/90 no-underline transition-colors hover:bg-white/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {t("navAbout")}
      </a>
    </header>
  );
}
