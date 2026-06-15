import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/**
 * The map sidebar's header, mirroring the blog's whiteglass nav
 * (_data/navigation.yml): a green Cardo wordmark linking home, then the same
 * Map / About items. Web-only DOM chrome. Links go through withSiteBase so
 * they resolve next to the blog under a sub-path host (e.g. /viagem-a-portugal/).
 * `Mapa` is the current page, marked active with a filled brand-green chip;
 * `Sobre` is a muted link that warms to the brand on hover/focus.
 */
export default function MapNav() {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3">
      <a
        href={withSiteBase("/")}
        className="rounded font-serif text-lg font-bold leading-none text-primary no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Viagem a Portugal
      </a>
      <nav className="flex items-center gap-1 text-[13px]">
        <span
          aria-current="page"
          className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary"
        >
          {t("navMap")}
        </span>
        <a
          href={withSiteBase("/about/")}
          className="rounded-md px-2.5 py-1 text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("navAbout")}
        </a>
      </nav>
    </div>
  );
}
