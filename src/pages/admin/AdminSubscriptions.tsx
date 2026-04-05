import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SubRow {
  id: string;
  organization_id: string;
  org_name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface PlanOption {
  slug: string;
  name: string;
  price_monthly: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  trial: { label: "Essai", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  past_due: { label: "Impayé", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

const AdminSubscriptions = () => {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const [subsRes, orgsRes] = await Promise.all([
        supabase.from("subscriptions").select("*"),
        supabase.from("organizations").select("id, name"),
      ]);

      const orgs = orgsRes.data || [];
      const enriched: SubRow[] = (subsRes.data || []).map((s: any) => ({
        ...s,
        org_name: orgs.find((o: any) => o.id === s.organization_id)?.name || "—",
      }));

      setSubs(enriched);
      setLoading(false);
    }
    fetch();
  }, []);

  const updateField = async (subId: string, field: string, value: string) => {
    setUpdating(subId);
    const { error } = await supabase
      .from("subscriptions")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", subId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Abonnement mis à jour");
      setSubs((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, [field]: value } : s))
      );
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abonnements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les plans et statuts des abonnements
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Fin d'essai</TableHead>
                    <TableHead>Fin de période</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun abonnement
                      </TableCell>
                    </TableRow>
                  ) : (
                    subs.map((sub) => {
                      const statusCfg = STATUS_CONFIG[sub.status] || {
                        label: sub.status,
                        variant: "outline" as const,
                      };
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.org_name}</TableCell>
                          <TableCell>
                            <Select
                              value={sub.plan}
                              onValueChange={(v) => updateField(sub.id, "plan", v)}
                              disabled={updating === sub.id}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Entreprise</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={sub.status}
                              onValueChange={(v) => updateField(sub.id, "status", v)}
                              disabled={updating === sub.id}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="trial">Essai</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="past_due">Impayé</SelectItem>
                                <SelectItem value="cancelled">Annulé</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub.trial_ends_at
                              ? format(new Date(sub.trial_ends_at), "dd MMM yyyy", { locale: fr })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub.current_period_end
                              ? format(new Date(sub.current_period_end), "dd MMM yyyy", { locale: fr })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(sub.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminSubscriptions;
