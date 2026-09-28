/**
 * Public Supabase settings. Both values are safe to expose to the browser: the
 * publishable (anon) key only grants what RLS and function grants allow.
 * No service-role key is used anywhere in this app.
 */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
