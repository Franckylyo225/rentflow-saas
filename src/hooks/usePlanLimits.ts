import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

interface PlanLimits {
  planName: string;
  maxProperties: number | null;
  maxUsers: number | null;
  currentProperties: number;
  currentUsers: number;
  loading: boolean;
  canAddProperty: boolean;
  canAddUser: boolean;
  propertyLimitLabel: string;
  userLimitLabel: string;
}

export function usePlanLimits(): PlanLimits {
  const { organizationId } = useProfile();
  const [state, setState] = useState<Omit<PlanLimits, "canAddProperty" | "canAddUser" | "propertyLimitLabel" | "userLimitLabel">>({
    planName: "",
    maxProperties: null,
    maxUsers: null,
    currentProperties: 0,
    currentUsers: 0,
    loading: true,
  });

  useEffect(() => {
    if (!organizationId) return;

    async function fetch() {
      const [subRes, propsRes, profilesRes, plansRes] = await Promise.all([
        supabase.from("subscriptions").select("plan").eq("organization_id", organizationId).maybeSingle(),
        supabase.from("properties").select("id").eq("organization_id", organizationId!),
        supabase.from("profiles").select("id").eq("organization_id", organizationId!),
        supabase.from("plans").select("slug, name, max_properties, max_users"),
      ]);

      const planSlug = subRes.data?.plan || "starter";
      const plans = (plansRes.data || []) as { slug: string; name: string; max_properties: number | null; max_users: number | null }[];
      const currentPlan = plans.find((p) => p.slug === planSlug);

      setState({
        planName: currentPlan?.name || planSlug,
        maxProperties: currentPlan?.max_properties ?? null,
        maxUsers: currentPlan?.max_users ?? null,
        currentProperties: propsRes.data?.length || 0,
        currentUsers: profilesRes.data?.length || 0,
        loading: false,
      });
    }

    fetch();
  }, [organizationId]);

  const canAddProperty = state.maxProperties === null || state.currentProperties < state.maxProperties;
  const canAddUser = state.maxUsers === null || state.currentUsers < state.maxUsers;

  const propertyLimitLabel = state.maxProperties !== null
    ? `${state.currentProperties}/${state.maxProperties} biens`
    : "";

  const userLimitLabel = state.maxUsers !== null
    ? `${state.currentUsers}/${state.maxUsers} utilisateurs`
    : "";

  return { ...state, canAddProperty, canAddUser, propertyLimitLabel, userLimitLabel };
}
