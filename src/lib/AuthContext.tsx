import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, initSupabase } from "./supabaseClient";
import { recordProfileLogin } from "./invitationService";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, inviteToken?: string) => Promise<{ error: string | null; needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CONFIG_ERROR =
  "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your environment.";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let finished = false;

    const finishLoading = () => {
      if (!mounted || finished) return;
      finished = true;
      setLoading(false);
    };

    const timeoutId = window.setTimeout(() => {
      if (!mounted || finished) return;
      setInitError("Authentication initialization timed out. You can still try to sign in.");
      finishLoading();
    }, 8000);

    const initialize = async () => {
      try {
        const client = await initSupabase();
        if (!mounted) return;

        if (!client) {
          setInitError(CONFIG_ERROR);
          setIsConfigured(false);
          finishLoading();
          return;
        }

        setInitError(null);
        setIsConfigured(true);

        const {
          data: { session: initialSession },
        } = await client.auth.getSession();

        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        const {
          data: { subscription: authSubscription },
        } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (!mounted) return;
          setSession(nextSession);
          // Supabase's client silently re-validates the session whenever the
          // browser tab regains focus/visibility, re-emitting this callback
          // with a brand-new `user` object even though the signed-in user
          // hasn't actually changed. If we always swap in the new object
          // reference, every downstream effect keyed on `user` (notably
          // OrganizationContext's org/CRM reload effect, which cascades into
          // CrmProvider re-hydrating from Supabase) fires again — causing a
          // full reload + loading spinner every time you switch back to this
          // tab. Keep the same object reference when the user id is
          // unchanged so those effects stay quiet.
          setUser((prevUser) =>
            prevUser?.id === nextSession?.user?.id ? prevUser : (nextSession?.user ?? null)
          );
          finishLoading();
        });

        subscription = authSubscription;
        finishLoading();
      } catch (err) {
        if (!mounted) return;
        console.error("Auth session initialization failed:", err);
        setInitError(err instanceof Error ? err.message : "Failed to initialize authentication.");
        finishLoading();
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void initialize();

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      initError,
      isConfigured,
      signIn: async (email, password) => {
        const client = getSupabase() ?? (await initSupabase());
        if (!client) return { error: CONFIG_ERROR };

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: mapAuthError(error.message) };
        }
        if (data.user && !data.user.email_confirmed_at) {
          await client.auth.signOut();
          return { error: "Please verify your email before signing in." };
        }
        void recordProfileLogin();
        return { error: null };
      },
      signUp: async (email, password, fullName, inviteToken) => {
        const client = getSupabase() ?? (await initSupabase());
        if (!client) return { error: CONFIG_ERROR, needsEmailVerification: false };

        const redirectPath = inviteToken
          ? `/join?token=${encodeURIComponent(inviteToken)}`
          : "/login";

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectPath}`,
            data: {
              full_name: fullName.trim(),
              invitation_token: inviteToken || null,
            },
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
        const client = getSupabase() ?? (await initSupabase());
        if (!client) return { error: CONFIG_ERROR };

        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error: error ? mapAuthError(error.message) : null };
      },
      updatePassword: async (password) => {
        const client = getSupabase() ?? (await initSupabase());
        if (!client) return { error: CONFIG_ERROR };

        const { error } = await client.auth.updateUser({ password });
        return { error: error ? mapAuthError(error.message) : null };
      },
    }),
    [user, session, loading, initError, isConfigured]
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
