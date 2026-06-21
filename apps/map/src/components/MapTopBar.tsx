import { withSiteBase } from "../lib/assets";

/**
 * Mobile-only full-width top navigation bar: the brand wordmark on a brand-green
 * field, linking home (Map is implicit — you're on it). Replaces the old
 * floating brand card; the journey/account/search live in the bottom glass nav
 * now. Web-only DOM chrome — the link goes through withSiteBase so it resolves
 * next to the blog under a sub-path host (e.g. /viagem-a-portugal/).
 */
export default function MapTopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-primary px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground shadow-sm">
      <a
        href={withSiteBase("/")}
        className="font-serif text-lg font-normal leading-none tracking-wide text-primary-foreground no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        Viagem a Portugal
      </a>
    </header>
  );
}
