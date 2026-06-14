// Hermes lacks the full URL API that supabase-js relies on; the web build
// (supabase.web.ts) skips the polyfill.
import "react-native-url-polyfill/auto";

import { buildClient } from "./supabaseClient";

export const supabase = buildClient();
