import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  trialOrgs: number;
  paidOrgs: number;
  recentOrgs: { id: string; name: string; created_at: string; is_active: boolean }[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [orgsRes, profilesRes, subsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, is_active, created_at").order("created_at", { ascending: false }),
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
        recentOrgs: orgs.slice(0, 5),
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

  const conversionRate =
    stats && stats.totalOrgs > 0
      ? Math.round(((stats.paidOrgs || 0) / stats.totalOrgs) * 100)
      : 0;

  const cards = [
    {
      title: "Organisations",
      value: stats?.totalOrgs || 0,
      subtitle: `${stats?.activeOrgs || 0} actives`,
      icon: Building2,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: null,
    },
    {
      title: "Utilisateurs",
      value: stats?.totalUsers || 0,
      subtitle: "Comptes enregistrés",
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      trend: null,
    },
    {
      title: "Abonnements payants",
      value: stats?.paidOrgs || 0,
      subtitle: `${stats?.trialOrgs || 0} en essai`,
      icon: CreditCard,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      trend: "up" as const,
    },
    {
      title: "Taux de conversion",
      value: `${conversionRate}%`,
      subtitle: "Essai → Payant",
      icon: TrendingUp,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      trend: conversionRate > 30 ? ("up" as const) : ("down" as const),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {new Date().getHours() < 12 ? "Bonjour" : "Bonsoir"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voici un aperçu de l'activité de la plateforme
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="border-border hover:shadow-md transition-shadow duration-200 bg-card"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  {card.trend && (
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        card.trend === "up" ? "text-emerald-500" : "text-destructive"
                      }`}
                    >
                      {card.trend === "up" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent orgs */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Dernières organisations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Les 5 inscriptions les plus récentes</p>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentOrgs.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Aucune organisation
                </div>
              ) : (
                stats?.recentOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(org.created_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        org.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;
