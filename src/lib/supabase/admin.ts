import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE Supabase client. Bypasses RLS.
 *
 * Only ever import this from server route handlers. It is how member/captain
 * devices (which have no account) read & write — the route validates the
 * group's join code first, then acts on their behalf. The `server-only`
 * import above makes the build fail if this file is ever pulled into a client
 * bundle.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
