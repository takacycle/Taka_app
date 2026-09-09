import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session } from "@takacycle/supabase-client";
import type { AppUser } from "@takacycle/types";
import { supabase } from "./supabase";
import { registerForPushNotifications } from "./push-notifications";

interface AuthContextValue {
  session: Session | null;
  profile: AppUser | null;
  isLoading: boolean;
  signInWithOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  completeProfile: (fullName: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("app_users")
      .select("id, full_name, phone, organization_id, zone_id, created_at")
      .eq("id", userId)
      .maybeSingle();

    setProfile(
      data
        ? {
            id: data.id,
            fullName: data.full_name,
            phone: data.phone,
            organizationId: data.organization_id,
            zoneId: data.zone_id,
            createdAt: data.created_at,
          }
        : null,
    );

    // Fire-and-forget — a denied permission or missing EAS project shouldn't block sign-in.
    if (data) registerForPushNotifications(data.id).catch(() => {});
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      async signInWithOtp(phone: string) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        return { error: error?.message ?? null };
      },
      async verifyOtp(phone: string, token: string) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
        return { error: error?.message ?? null };
      },
      async completeProfile(fullName: string) {
        if (!session) return { error: "Not signed in" };
        const { error } = await supabase.from("app_users").update({ full_name: fullName }).eq("id", session.user.id);
        if (!error) await loadProfile(session.user.id);
        return { error: error?.message ?? null };
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id);
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async deleteAccount() {
        const { error } = await supabase.functions.invoke("delete-account");
        if (error) throw error;
        await supabase.auth.signOut();
      },
    }),
    [session, profile, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
