import { useId, useState } from "react";

import { t } from "../lib/i18n";

export interface AuthPanelProps {
  /** Both return an error message to display, or null on success. */
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
  onCancel: () => void;
}

/** Email+password sign-in/sign-up (docs/adr/0008). Success is signalled via
 * the auth state change, so the parent closes this panel — not us. */
export default function AuthPanel({ onSignIn, onSignUp, onCancel }: AuthPanelProps) {
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (action: AuthPanelProps["onSignIn"]) => {
    if (busy || !email || !password) return;
    setBusy(true);
    setError(null);
    const message = await action(email, password);
    setBusy(false);
    if (message) setError(message);
  };

  const inputClass =
    "h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(onSignIn);
      }}
    >
      <input
        type="email"
        autoComplete="email"
        value={email}
        placeholder={t("email")}
        aria-label={t("email")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        placeholder={t("password")}
        aria-label={t("password")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      {error && (
        <span id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {t("signIn")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(onSignUp)}
          className="h-8 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
        >
          {t("signUp")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
