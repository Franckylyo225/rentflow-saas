import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrgRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  userCount?: number;
  subscription?: { plan: string; status: string } | null;
}

const AdminOrganizations = () => {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchOrgs = async () => {
    const [orgsRes, profilesRes, subsRes] = await Promise.all([
      supabase.from("organizations").select("id, name, email, phone, is_active, created_at"),
      supabase.from("profiles").select("id, organization_id"),
      supabase.from("subscriptions").select("organization_id, plan, status"),
    ]);

    const profiles = profilesRes.data || [];
    const subs = subsRes.data || [];

    const enriched: OrgRow[] = (orgsRes.data || []).map((org: any) => ({
      ...org,
      userCount: profiles.filter((p: any) => p.organization_id === org.id).length,
      subscription: subs.find((s: any) => s.organization_id === org.id) || null,
    }));

    setOrgs(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const toggleActive = async (orgId: string, currentActive: boolean) => {
    setToggling(orgId);
    const { error } = await supabase
      .from("organizations")
      .update({ is_active: !currentActive })
      .eq("id", orgId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(
        !currentActive ? "Organisation activée" : "Organisation désactivée"
      );
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === orgId ? { ...o, is_active: !currentActive } : o
        )
      );
    }
    setToggling(null);
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      trial: { label: "Essai", variant: "secondary" },
      active: { label: "Actif", variant: "default" },
      past_due: { label: "Impayé", variant: "destructive" },
      cancelled: { label: "Annulé", variant: "outline" },
    };
    const config = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organisations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {orgs.length} organisation{orgs.length > 1 ? "s" : ""} enregistrée{orgs.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Utilisateurs</TableHead>
                    <TableHead>Abonnement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune organisation trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {org.email || org.phone || "—"}
                        </TableCell>
                        <TableCell className="text-center">{org.userCount}</TableCell>
                        <TableCell>
                          {org.subscription
                            ? statusBadge(org.subscription.status)
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.is_active ? "default" : "destructive"}>
                            {org.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(org.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => toggleActive(org.id, org.is_active)}
                            disabled={toggling === org.id}
                          >
                            {toggling === org.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : org.is_active ? (
                              <PowerOff className="h-3.5 w-3.5" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            {org.is_active ? "Désactiver" : "Activer"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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

export default AdminOrganizations;
