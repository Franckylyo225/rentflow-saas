import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_approved: boolean;
}

export interface UserRole {
  role: "admin" | "gestionnaire" | "comptable";
}

export interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  invite_token?: string;
  onboarding_completed?: boolean;
}

interface ProfileContextType {
  profile: Profile | null;
  role: UserRole | null;
  organization: Organization | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setRole(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    ]);

    // If no profile exists (e.g. Google OAuth user), auto-create via RPC
    if (!profileRes.data && profileRes.error?.code === "PGRST116") {
      const { data: rpcResult } = await supabase.rpc("ensure_user_profile" as any);
      if (rpcResult && (rpcResult as any).status === "created") {
        // Re-fetch after creation
        [profileRes, roleRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
        ]);
      }
    }

    if (profileRes.data) {
      const p = profileRes.data as unknown as Profile;
      setProfile(p);
      const orgRes = await supabase
        .from("organizations")
        .select("*")
        .eq("id", p.organization_id)
        .single();
      if (orgRes.data) setOrganization(orgRes.data as unknown as Organization);
    }

    if (roleRes.data) setRole(roleRes.data as UserRole);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, role, organization, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}
