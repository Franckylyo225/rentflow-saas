import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EarlyAdopterStatus {
  isEarlyAdopter: boolean;
  discountPercent: number;
  freeMonths: number;
  joinedAt: string | null;
  appliedAt: string | null;
  loading: boolean;
}

export function useEarlyAdopterStatus(): EarlyAdopterStatus {
  const { user } = useAuth();
  const [state, setState] = useState<EarlyAdopterStatus>({
    isEarlyAdopter: false,
    discountPercent: 0,
    freeMonths: 0,
    joinedAt: null,
    appliedAt: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    supabase.rpc("get_user_early_adopter_status", { _user_id: user.id }).then(({ data }) => {
      const r = (data ?? {}) as any;
      setState({
        isEarlyAdopter: !!r.is_early_adopter,
        discountPercent: r.discount_percent ?? 0,
        freeMonths: r.free_months ?? 0,
        joinedAt: r.joined_at ?? null,
        appliedAt: r.applied_at ?? null,
        loading: false,
      });
    });
  }, [user]);

  return state;
}

export interface EarlyAdopterPublicConfig {
  active: boolean;
  total_slots: number;
  slots_taken: number;
  discount_percent: number;
  free_months: number;
  price_before: number;
  price_after: number;
  label: string;
  description: string;
  expires_at: string;
}

export function useEarlyAdopterConfig() {
  const [config, setConfig] = useState<EarlyAdopterPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_early_adopter_public_config").then(({ data }) => {
      const r = (data ?? {}) as Record<string, string>;
      setConfig({
        active: r.active === "true",
        total_slots: Number(r.total_slots || 100),
        slots_taken: Number(r.slots_taken || 0),
        discount_percent: Number(r.discount_percent || 25),
        free_months: Number(r.free_months || 3),
        price_before: Number(r.price_before || 20000),
        price_after: Number(r.price_after || 15000),
        label: r.label || "Early Adopter",
        description: r.description || "",
        expires_at: r.expires_at || "",
      });
      setLoading(false);
    });
  }, []);

  return { config, loading, reload: () => setLoading(true) };
}
