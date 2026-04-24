import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureLockedCardProps {
  title?: string;
  description?: string;
  requiredPlan?: string;
  className?: string;
}

/**
 * Carte affichée à la place d'une fonctionnalité non incluse dans le plan actuel.
 * Encourage la mise à niveau vers une offre supérieure.
 */
export function FeatureLockedCard({
  title = "Fonctionnalité Pro",
  description = "Passez à l'offre Pro pour activer les relances automatiques complètes et les envois programmés.",
  requiredPlan,
  className,
}: FeatureLockedCardProps) {
  const navigate = useNavigate();

  return (
    <Card className={`border-dashed border-primary/30 bg-primary/5 ${className ?? ""}`}>
      <CardContent className="py-10 px-6 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {requiredPlan && (
            <p className="text-xs text-muted-foreground pt-1">
              Disponible à partir de l'offre{" "}
              <span className="font-medium text-foreground">{requiredPlan}</span>
            </p>
          )}
        </div>
        <Button onClick={() => navigate("/settings?tab=subscription")} size="sm" className="gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Voir les offres
        </Button>
      </CardContent>
    </Card>
  );
}
