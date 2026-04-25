import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChevronLeft } from "lucide-react";

export default function RelancesHistorique() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <Link to="/relances" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Retour aux relances
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Historique complet des relances</h1>
        <p className="text-sm text-muted-foreground">
          Cette page sera bientôt disponible.
        </p>
      </div>
    </AppLayout>
  );
}
