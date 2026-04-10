import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export function useFeatureAccess() {
  const { profile } = useProfile();
  const organizationId = profile?.organization_id;
  const [featureFlags, setFeatureFlags] = useState<string[]>([]);
  const [planName, setPlanName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    async function fetch() {
      setLoading(true);
      const subRes = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      const planSlug = subRes.data?.plan || "starter";

      const planRes = await supabase
        .from("plans")
        .select("name, feature_flags")
        .eq("slug", planSlug)
        .maybeSingle();

      setFeatureFlags((planRes.data?.feature_flags as string[]) || []);
      setPlanName(planRes.data?.name || planSlug);
      setLoading(false);
    }

    fetch();
  }, [organizationId]);

  const hasFeature = (featureKey: string) => featureFlags.includes(featureKey);

  return { featureFlags, hasFeature, planName, loading };
}
