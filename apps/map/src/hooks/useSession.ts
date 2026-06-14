import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

/**
 * The Traveler's auth session. `configured` is false when the build has no
 * Supabase config — sign-in UI should not render at all then, and the map
 * stays read-only.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase != null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next),
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  /** Returns an error message to display, or null on success. */
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Sync is not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  /** Email confirmation is off (docs/adr/0008), so signup signs in directly. */
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Sync is not configured";
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return {
    session,
    loading,
    configured: supabase != null,
    signIn,
    signUp,
    signOut,
  };
}
