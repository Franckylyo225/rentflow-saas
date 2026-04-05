import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  trialOrgs: number;
  paidOrgs: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [orgsRes, profilesRes, subsRes] = await Promise.all([
        supabase.from("organizations").select("id, is_active"),
        supabase.from("profiles").select("id"),
        supabase.from("subscriptions").select("id, status"),
      ]);

      const orgs = orgsRes.data || [];
      const profiles = profilesRes.data || [];
      const subs = subsRes.data || [];

      setStats({
        totalOrgs: orgs.length,
        activeOrgs: orgs.filter((o: any) => o.is_active).length,
        totalUsers: profiles.length,
        trialOrgs: subs.filter((s: any) => s.status === "trial").length,
        paidOrgs: subs.filter((s: any) => s.status === "active").length,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  const cards = [
    {
      title: "Organisations",
      value: stats?.totalOrgs || 0,
      subtitle: `${stats?.activeOrgs || 0} actives`,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Utilisateurs",
      value: stats?.totalUsers || 0,
      subtitle: "Tous les utilisateurs",
      icon: Users,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      title: "Abonnements payants",
      value: stats?.paidOrgs || 0,
      subtitle: `${stats?.trialOrgs || 0} en essai`,
      icon: CreditCard,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Taux de conversion",
      value:
        stats && stats.totalOrgs > 0
          ? `${Math.round(((stats.paidOrgs || 0) / stats.totalOrgs) * 100)}%`
          : "0%",
      subtitle: "Essai → Payant",
      icon: TrendingUp,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vue d'ensemble</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistiques globales de la plateforme
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;
