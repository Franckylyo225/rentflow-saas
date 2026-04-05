import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Users, CreditCard, TrendingUp, Loader2,
  ArrowUpRight, ArrowDownRight, Banknote, AlertTriangle, PiggyBank, Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  trialOrgs: number;
  paidOrgs: number;
  recentOrgs: { id: string; name: string; created_at: string; is_active: boolean }[];
  // Financial
  totalExpected: number;
  totalCollected: number;
  totalUnpaid: number;
  totalExpenses: number;
  lateCount: number;
  monthlyRevenue: { month: string; collected: number; expected: number }[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [orgsRes, profilesRes, subsRes, rentsRes, expensesRes] = await Promise.all([
        supabase.from("organizations").select("id, name, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id"),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("rent_payments").select("amount, paid_amount, status, month"),
        supabase.from("expenses").select("amount"),
      ]);

      const orgs = orgsRes.data || [];
      const profiles = profilesRes.data || [];
      const subs = subsRes.data || [];
      const rents = rentsRes.data || [];
      const expenses = expensesRes.data || [];

      // Financial aggregation
      const totalExpected = rents.reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalCollected = rents.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
      const totalUnpaid = totalExpected - totalCollected;
      const lateCount = rents.filter((r) => r.status === "late").length;
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

      // Monthly revenue (last 6 months)
      const monthMap = new Map<string, { collected: number; expected: number }>();
      for (const r of rents) {
        if (!r.month) continue;
        const existing = monthMap.get(r.month) || { collected: 0, expected: 0 };
        existing.collected += Number(r.paid_amount || 0);
        existing.expected += Number(r.amount || 0);
        monthMap.set(r.month, existing);
      }
      const monthlyRevenue = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, data]) => ({ month, ...data }));

      setStats({
        totalOrgs: orgs.length,
        activeOrgs: orgs.filter((o: any) => o.is_active).length,
        totalUsers: profiles.length,
        trialOrgs: subs.filter((s: any) => s.status === "trial").length,
        paidOrgs: subs.filter((s: any) => s.status === "active").length,
        recentOrgs: orgs.slice(0, 5),
        totalExpected,
        totalCollected,
        totalUnpaid,
        totalExpenses,
        lateCount,
        monthlyRevenue,
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

  const collectionRate =
    stats && stats.totalExpected > 0
      ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
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
      title: "Abonnements payants",
      value: stats?.paidOrgs || 0,
      subtitle: `${stats?.trialOrgs || 0} en essai`,
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

  const financeCards = [
    {
      title: "Loyers attendus",
      value: `${fmt(stats?.totalExpected || 0)} FCFA`,
      subtitle: "Total cumulé toutes organisations",
      icon: Receipt,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Loyers encaissés",
      value: `${fmt(stats?.totalCollected || 0)} FCFA`,
      subtitle: `Taux de recouvrement : ${collectionRate}%`,
      icon: Banknote,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "Impayés",
      value: `${fmt(stats?.totalUnpaid || 0)} FCFA`,
      subtitle: `${stats?.lateCount || 0} échéance${(stats?.lateCount || 0) > 1 ? "s" : ""} en retard`,
      icon: AlertTriangle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      title: "Dépenses totales",
      value: `${fmt(stats?.totalExpenses || 0)} FCFA`,
      subtitle: "Toutes catégories confondues",
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

        {/* Financial stats */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Finances globales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {financeCards.map((card) => (
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

        {/* Revenue chart + recent orgs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Recouvrement mensuel</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Loyers attendus vs encaissés (6 derniers mois)</p>
              </div>
              <div className="p-5">
                {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.monthlyRevenue} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <ReTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${fmt(value)} FCFA`]}
                      />
                      <Bar dataKey="expected" name="Attendu" fill="hsl(var(--muted-foreground) / 0.2)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Encaissé" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                    Aucune donnée de loyer disponible
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
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
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
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;
