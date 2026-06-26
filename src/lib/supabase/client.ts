import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for the admin's device. Used for Realtime
 * subscriptions on the live pre-game dashboard (members submitting, captains
 * picking topics). RLS applies via the admin's session, so it only streams
 * rows from groups the admin owns.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
