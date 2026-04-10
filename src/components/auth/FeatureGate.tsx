import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
}

export function FeatureGate({ featureKey, children }: FeatureGateProps) {
  const { hasFeature, planName, loading } = useFeatureAccess();
  const navigate = useNavigate();

  if (loading) return <>{children}</>;

  if (!hasFeature(featureKey)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full border-border">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Fonctionnalité non disponible
              </h2>
              <p className="text-muted-foreground text-sm">
                Cette fonctionnalité n'est pas incluse dans votre offre{" "}
                <span className="font-medium text-foreground">{planName}</span>.
                Passez à une offre supérieure pour y accéder.
              </p>
              <Button onClick={() => navigate("/settings")} className="mt-2">
                Voir les offres
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
