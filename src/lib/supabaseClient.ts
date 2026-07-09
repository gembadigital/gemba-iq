import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseEnv {
  url: string;
  key: string;
}

function readBuildTimeEnv(): SupabaseEnv {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  return { url, key };
}

async function fetchRuntimeEnv(): Promise<SupabaseEnv | null> {
  try {
    const response = await fetch("/api/env", { cache: "no-store" });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    };

    const url = data.VITE_SUPABASE_URL?.trim() ?? "";
    const key =
      data.VITE_SUPABASE_ANON_KEY?.trim() ||
      data.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      "";

    if (!url || !key) return null;
    return { url, key };
  } catch {
    return null;
  }
}

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

export async function initSupabase(): Promise<SupabaseClient | null> {
  if (supabaseClient) return supabaseClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let { url, key } = readBuildTimeEnv();

    if (!url || !key) {
      const runtimeEnv = await fetchRuntimeEnv();
      if (runtimeEnv) {
        url = runtimeEnv.url;
        key = runtimeEnv.key;
      }
    }

    if (!url || !key) {
      return null;
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return supabaseClient;
  })();

  return initPromise;
}

export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

export function isSupabaseReady(): boolean {
  return supabaseClient !== null;
}

/** @deprecated Use getSupabase() — kept for gradual migration; may be null until initSupabase() resolves. */
export const supabase = supabaseClient;
