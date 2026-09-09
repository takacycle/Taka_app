import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session } from "@takacycle/supabase-client";
import type { Agent } from "@takacycle/types";
import { supabase } from "./supabase";

interface AuthContextValue {
  session: Session | null;
  profile: Agent | null;
  isLoading: boolean;
  signInWithOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("agents")
      .select("id, full_name, phone, zone_id, reputation_status, rejection_rate, created_at")
      .eq("id", userId)
      .maybeSingle();

    setProfile(
      data
        ? {
            id: data.id,
            fullName: data.full_name,
            phone: data.phone,
            zoneId: data.zone_id,
            reputationStatus: data.reputation_status,
            rejectionRate: data.rejection_rate,
            createdAt: data.created_at,
          }
        : null,
    );
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
        // Agents are provisioned by dispatcher staff, never self-registered — this
        // makes sign-in fail for any phone number the dispatcher hasn't created.
        const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        return { error: error?.message ?? null };
      },
      async verifyOtp(phone: string, token: string) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
        return { error: error?.message ?? null };
      },
      async signOut() {
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
