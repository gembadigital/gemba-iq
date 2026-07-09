import type { User } from "@supabase/supabase-js";

export function getUserDisplayName(user: User | null): string {
  if (!user) return "";
  const fullName = user.user_metadata?.full_name as string | undefined;
  if (fullName?.trim()) return fullName.trim();
  return user.email?.split("@")[0] ?? "User";
}

export function getUserInitials(user: User | null): string {
  if (!user) return "?";

  const fullName = user.user_metadata?.full_name as string | undefined;
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }

  const email = user.email ?? "";
  return email.slice(0, 2).toUpperCase() || "?";
}

export function getUserEmail(user: User | null): string {
  return user?.email ?? "";
}
