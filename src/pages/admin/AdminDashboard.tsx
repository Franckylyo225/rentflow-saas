import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Users, CreditCard, TrendingUp, Loader2,
  Banknote, AlertTriangle, PiggyBank, Receipt, DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

// Prix mensuels par plan (FCFA)
const PLAN_PRICES: Record<string, number> = {
  starter: 15000,
  pro: 35000,
  enterprise: 75000,
};

interface SubRow {
  plan: string;
  status: string;
  organization_id: string;
}

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  trialOrgs: number;
  paidOrgs: number;
  cancelledOrgs: number;
  recentOrgs: { id: string; name: string; created_at: string; is_active: boolean }[];
  // SaaS financials
  mrr: number;
  arr: number;
  churnRate: number;
  revenueByPlan: { name: string; value: number; count: number }[];
  subsByStatus: { name: string; value: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  past_due: "Impayé",
  cancelled: "Annulé",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(160 84% 50%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [orgsRes, profilesRes, subsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id"),
        supabase.from("subscriptions").select("plan, status, organization_id"),
      ]);

      const orgs = orgsRes.data || [];
      const profiles = profilesRes.data || [];
      const subs: SubRow[] = (subsRes.data || []) as SubRow[];

      const activeSubs = subs.filter((s) => s.status === "active");
      const trialSubs = subs.filter((s) => s.status === "trial");
      const cancelledSubs = subs.filter((s) => s.status === "cancelled");

      // MRR = sum of monthly prices for active subscriptions
      const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      const arr = mrr * 12;

      // Churn rate = cancelled / total
      const churnRate = subs.length > 0 ? Math.round((cancelledSubs.length / subs.length) * 100) : 0;

      // Revenue by plan
      const planMap = new Map<string, { value: number; count: number }>();
      for (const s of activeSubs) {
        const price = PLAN_PRICES[s.plan] || 0;
        const existing = planMap.get(s.plan) || { value: 0, count: 0 };
        existing.value += price;
        existing.count += 1;
        planMap.set(s.plan, existing);
      }
      const revenueByPlan = Array.from(planMap.entries()).map(([plan, data]) => ({
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
        ...data,
      }));

      // Subscriptions by status
      const statusMap = new Map<string, number>();
      for (const s of subs) {
        statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
      }
      const subsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
      }));

      setStats({
        totalOrgs: orgs.length,
        activeOrgs: orgs.filter((o: any) => o.is_active).length,
        totalUsers: profiles.length,
        trialOrgs: trialSubs.length,
        paidOrgs: activeSubs.length,
        cancelledOrgs: cancelledSubs.length,
        recentOrgs: orgs.slice(0, 5),
        mrr,
        arr,
        churnRate,
        revenueByPlan,
        subsByStatus,
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

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const conversionRate =
    stats && stats.totalOrgs > 0
      ? Math.round(((stats.paidOrgs || 0) / stats.totalOrgs) * 100)
      : 0;

  const platformCards = [
    {
      title: "Organisations",
      value: stats?.totalOrgs || 0,
      subtitle: `${stats?.activeOrgs || 0} actives`,
      icon: Building2,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Utilisateurs",
      value: stats?.totalUsers || 0,
      subtitle: "Comptes enregistrés",
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Abonnements actifs",
      value: stats?.paidOrgs || 0,
      subtitle: `${stats?.trialOrgs || 0} en essai · ${stats?.cancelledOrgs || 0} annulés`,
      icon: CreditCard,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "Taux de conversion",
      value: `${conversionRate}%`,
      subtitle: "Essai → Payant",
      icon: TrendingUp,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  const revenueCards = [
    {
      title: "MRR",
      value: `${fmt(stats?.mrr || 0)} FCFA`,
      subtitle: "Revenu mensuel récurrent",
      icon: Banknote,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "ARR",
      value: `${fmt(stats?.arr || 0)} FCFA`,
      subtitle: "Revenu annuel récurrent",
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Taux de churn",
      value: `${stats?.churnRate || 0}%`,
      subtitle: `${stats?.cancelledOrgs || 0} abonnement${(stats?.cancelledOrgs || 0) > 1 ? "s" : ""} annulé${(stats?.cancelledOrgs || 0) > 1 ? "s" : ""}`,
      icon: AlertTriangle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      title: "ARPU",
      value: stats?.paidOrgs ? `${fmt(Math.round((stats.mrr) / stats.paidOrgs))} FCFA` : "—",
      subtitle: "Revenu moyen par client",
      icon: PiggyBank,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
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

        {/* Platform stats */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plateforme</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformCards.map((card) => (
              <Card key={card.title} className="border-border hover:shadow-md transition-shadow duration-200 bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{card.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* SaaS Revenue */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenus SaaS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueCards.map((card) => (
              <Card key={card.title} className="border-border hover:shadow-md transition-shadow duration-200 bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{card.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by plan */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">MRR par plan</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Répartition du revenu mensuel</p>
              </div>
              <div className="p-5">
                {stats?.revenueByPlan && stats.revenueByPlan.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={stats.revenueByPlan}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.revenueByPlan.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${fmt(value)} FCFA`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {stats.revenueByPlan.map((plan, i) => (
                        <div key={plan.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{plan.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{plan.count} client{plan.count > 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                    Aucun abonnement actif
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions by status */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Abonnements par statut</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Répartition actuelle</p>
              </div>
              <div className="p-5">
                {stats?.subsByStatus && stats.subsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.subsByStatus} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={60} />
                      <ReTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" name="Nombre" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                    Aucun abonnement
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent orgs */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Dernières organisations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Inscriptions récentes</p>
              </div>
              <div className="divide-y divide-border">
                {stats?.recentOrgs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Aucune organisation
                  </div>
                ) : (
                  stats?.recentOrgs.map((org) => (
                    <div key={org.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(org.created_at), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${org.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing reference */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Grille tarifaire</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Prix mensuels par plan utilisés pour le calcul du MRR</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              {Object.entries(PLAN_PRICES).map(([plan, price]) => (
                <div key={plan} className="px-5 py-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{plan}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{fmt(price)} <span className="text-xs font-normal text-muted-foreground">FCFA/mois</span></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;
