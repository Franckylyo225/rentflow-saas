import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Info } from "lucide-react";

/**
 * Les emails de relance automatiques ont été supprimés (Phase 1 SMS).
 * Cet onglet sera repensé dans une prochaine itération.
 */
export function NotificationsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Notifications email
                <Badge variant="outline" className="text-[10px] font-normal">Bientôt</Badge>
              </CardTitle>
              <CardDescription>Les notifications email seront proposées dans une prochaine version</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border">
            <Info className="h-4 w-4 text-accent-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-accent-foreground">
              Les relances par email automatiques ont été remplacées par le nouveau système SMS intelligent.
              Rendez-vous dans l'onglet <strong>SMS</strong> pour configurer vos relances.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
