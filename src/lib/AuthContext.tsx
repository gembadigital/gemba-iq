import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, supabaseConfigError } from "./supabaseClient";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  return message;
}

function notConfiguredError(): string {
  return supabaseConfigError ?? "Authentication is not configured.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitError(supabaseConfigError);
      setLoading(false);
      return;
    }

    const client = getSupabase();
    if (!client) {
      setInitError("Failed to initialize Supabase client.");
      setLoading(false);
      return;
    }

    let mounted = true;

    client.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        console.error("Auth session initialization failed:", err);
        setInitError(err.message || "Failed to initialize authentication.");
        setLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      initError,
      isConfigured: isSupabaseConfigured,
      signIn: async (email, password) => {
        const client = getSupabase();
        if (!client) return { error: notConfiguredError() };

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: mapAuthError(error.message) };
        }
        if (data.user && !data.user.email_confirmed_at) {
          await client.auth.signOut();
          return { error: "Please verify your email before signing in." };
        }
        return { error: null };
      },
      signUp: async (email, password, fullName) => {
        const client = getSupabase();
        if (!client) return { error: notConfiguredError(), needsEmailVerification: false };

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) {
          return { error: mapAuthError(error.message), needsEmailVerification: false };
        }
        const needsEmailVerification = !data.session;
        return { error: null, needsEmailVerification };
      },
      signOut: async () => {
        const client = getSupabase();
        if (client) {
          await client.auth.signOut();
        }
        setSession(null);
        setUser(null);
      },
      resetPassword: async (email) => {
        const client = getSupabase();
        if (!client) return { error: notConfiguredError() };

        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error: error ? mapAuthError(error.message) : null };
      },
      updatePassword: async (password) => {
        const client = getSupabase();
        if (!client) return { error: notConfiguredError() };

        const { error } = await client.auth.updateUser({ password });
        return { error: error ? mapAuthError(error.message) : null };
      },
    }),
    [user, session, loading, initError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
