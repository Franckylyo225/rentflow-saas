import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function PlanLimitBanner() {
  const { loading, planName, propertyWarning, userWarning, propertyRatio, userRatio, propertyLimitLabel, userLimitLabel, canAddProperty, canAddUser } = usePlanLimits();
  const navigate = useNavigate();

  if (loading || (!propertyWarning && !userWarning)) return null;

  const atLimit = !canAddProperty || !canAddUser;

  return (
    <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-lg border px-4 py-3 ${atLimit ? "border-destructive/40 bg-destructive/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${atLimit ? "text-destructive" : "text-yellow-600 dark:text-yellow-500"}`} />
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {atLimit
                ? `Limite du plan ${planName} atteinte`
                : `Vous approchez des limites du plan ${planName}`}
            </p>
            <div className="flex flex-wrap gap-4">
              {propertyWarning && (
                <div className="space-y-1 min-w-[140px]">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Biens</span>
                    <span className="font-medium">{propertyLimitLabel}</span>
                  </div>
                  <Progress value={Math.min(propertyRatio * 100, 100)} className="h-1.5" />
                </div>
              )}
              {userWarning && (
                <div className="space-y-1 min-w-[140px]">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Utilisateurs</span>
                    <span className="font-medium">{userLimitLabel}</span>
                  </div>
                  <Progress value={Math.min(userRatio * 100, 100)} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant={atLimit ? "default" : "outline"}
          className="gap-1.5 shrink-0 self-start sm:self-center"
          onClick={() => navigate("/settings")}
        >
          Upgrader <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
