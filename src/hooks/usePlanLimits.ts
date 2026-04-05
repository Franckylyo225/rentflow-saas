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
  propertyWarning: boolean;
  userWarning: boolean;
  propertyRatio: number;
  userRatio: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  periodEndsAt: string | null;
  daysUntilExpiry: number | null;
  expiryWarning: boolean;
  expired: boolean;
}

export function usePlanLimits(): PlanLimits {
  const { profile } = useProfile();
  const organizationId = profile?.organization_id;
  const [state, setState] = useState<Omit<PlanLimits, "canAddProperty" | "canAddUser" | "propertyLimitLabel" | "userLimitLabel" | "propertyWarning" | "userWarning" | "propertyRatio" | "userRatio" | "daysUntilExpiry" | "expiryWarning" | "expired">>({
    planName: "",
    maxProperties: null,
    maxUsers: null,
    currentProperties: 0,
    currentUsers: 0,
    loading: true,
    subscriptionStatus: "",
    trialEndsAt: null,
    periodEndsAt: null,
  });

  useEffect(() => {
    if (!organizationId) return;

    async function fetch() {
      const [subRes, propsRes, profilesRes, plansRes] = await Promise.all([
        supabase.from("subscriptions").select("plan, status, trial_ends_at, current_period_end").eq("organization_id", organizationId).maybeSingle(),
        supabase.from("properties").select("id").eq("organization_id", organizationId!),
        supabase.from("profiles").select("id").eq("organization_id", organizationId!),
        supabase.from("plans").select("slug, name, max_properties, max_users"),
      ]);

      const planSlug = subRes.data?.plan || "starter";
      const subStatus = subRes.data?.status || "trial";
      const trialEndsAt = subRes.data?.trial_ends_at || null;
      const periodEndsAt = subRes.data?.current_period_end || null;
      const plans = (plansRes.data || []) as { slug: string; name: string; max_properties: number | null; max_users: number | null }[];
      const currentPlan = plans.find((p) => p.slug === planSlug);

      setState({
        planName: currentPlan?.name || planSlug,
        maxProperties: currentPlan?.max_properties ?? null,
        maxUsers: currentPlan?.max_users ?? null,
        currentProperties: propsRes.data?.length || 0,
        currentUsers: profilesRes.data?.length || 0,
        loading: false,
        subscriptionStatus: subStatus,
        trialEndsAt,
        periodEndsAt,
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

  const propertyRatio = state.maxProperties !== null && state.maxProperties > 0
    ? state.currentProperties / state.maxProperties
    : 0;
  const userRatio = state.maxUsers !== null && state.maxUsers > 0
    ? state.currentUsers / state.maxUsers
    : 0;

  const propertyWarning = state.maxProperties !== null && propertyRatio >= 0.8;
  const userWarning = state.maxUsers !== null && userRatio >= 0.8;

  // Subscription expiry logic
  const expiryDate = state.subscriptionStatus === "trial"
    ? state.trialEndsAt
    : state.periodEndsAt;

  const daysUntilExpiry = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const expired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7;

  return {
    ...state,
    canAddProperty, canAddUser,
    propertyLimitLabel, userLimitLabel,
    propertyWarning, userWarning,
    propertyRatio, userRatio,
    daysUntilExpiry, expiryWarning, expired,
  };
}
