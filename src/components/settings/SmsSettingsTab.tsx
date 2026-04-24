import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";
import { SmsHistoryTable } from "./SmsHistoryTable";

/**
 * Stub Phase 1A — l'éditeur complet de schedules / templates SMS arrive en Phase 1B.
 * Pour l'instant : affichage de l'historique + carte d'information.
 */
export function SmsSettingsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Système SMS intelligent
                <Badge variant="outline" className="text-[10px] font-normal gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Phase 1B
                </Badge>
              </CardTitle>
              <CardDescription>
                Le backend SMS (envoi, file d'attente, génération automatique) est en place.
                L'interface d'édition des modèles et de la chronologie arrive très bientôt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <SmsHistoryTable />
    </div>
  );
}
