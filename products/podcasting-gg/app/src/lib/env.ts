import { z } from "zod";

/**
 * Typed access to environment configuration.
 * Public values are safe for the browser; server values must never be imported
 * from client components (the `server` object is only built on the server).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32).optional(),
  AI_DEFAULT_PROVIDER: z.string().optional(),
  AI_DEFAULT_API_KEY: z.string().optional(),
  AI_DEFAULT_MODEL: z.string().optional(),
  AI_DEFAULT_BASE_URL: z.string().url().optional(),
  GHL_API_KEY: z.string().optional(),
  GHL_LOCATION_ID: z.string().optional(),
});

function emptyToUndefined(source: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v === "" ? undefined : v]));
}

export const publicEnv = publicSchema.parse(
  emptyToUndefined({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }),
);

/** Server-only configuration. Throws if imported in the browser. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  return serverSchema.parse(emptyToUndefined({ ...process.env }));
}

/** True when Supabase is configured; otherwise the app runs in setup mode. */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
