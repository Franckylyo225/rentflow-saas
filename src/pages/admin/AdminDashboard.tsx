import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, CreditCard, TrendingUp, Loader2,
  Banknote, AlertTriangle, PiggyBank, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity, UserPlus,
  Crown, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";

// Plans are now loaded dynamically from the database

interface SubRow {
  plan: string;
  status: string;
  organization_id: string;
  created_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface OrgRow {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  organization_id: string;
  created_at: string;
}

interface MonthlyRevenue {
  month: string;
  mrr: number;
  newOrgs: number;
}

interface TopTenant {
  name: string;
  plan: string;
  mrr: number;
  users: number;
  status: string;
}

interface RecentActivity {
  id: string;
  type: "signup" | "upgrade" | "churn" | "trial_end";
  title: string;
  description: string;
  date: string;
  icon: typeof Building2;
  iconColor: string;
  iconBg: string;
}

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  trialOrgs: number;
  paidOrgs: number;
  cancelledOrgs: number;
  mrr: number;
  arr: number;
  churnRate: number;
  arpu: number;
  conversionRate: number;
  revenueByPlan: { name: string; value: number; count: number }[];
  subsByStatus: { name: string; value: number; color: string }[];
  monthlyRevenue: MonthlyRevenue[];
  topTenants: TopTenant[];
  recentActivities: RecentActivity[];
  recentOrgs: OrgRow[];
  mrrGrowth: number;
  newOrgsThisMonth: number;
  newOrgsLastMonth: number;
  planPrices: Record<string, number>;
  planLabels: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  trial: "hsl(38 92% 50%)",
  active: "hsl(160 84% 39%)",
  past_due: "hsl(0 72% 51%)",
  cancelled: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  past_due: "Impayé",
  cancelled: "Annulé",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(160 84% 39%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [orgsRes, profilesRes, subsRes, plansRes] = await Promise.all([
        supabase.from("organizations").select("id, name, email, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, organization_id, created_at"),
        supabase.from("subscriptions").select("plan, status, organization_id, created_at, current_period_start, current_period_end"),
        supabase.from("plans").select("slug, name, price_monthly"),
      ]);

      // Build dynamic price/label maps from plans table
      const planRows = (plansRes.data || []) as { slug: string; name: string; price_monthly: number }[];
      const PLAN_PRICES: Record<string, number> = {};
      const PLAN_LABELS: Record<string, string> = {};
      for (const p of planRows) {
        PLAN_PRICES[p.slug] = p.price_monthly;
        PLAN_LABELS[p.slug] = p.name;
      }

      const orgs: OrgRow[] = (orgsRes.data || []) as OrgRow[];
      const profiles: ProfileRow[] = (profilesRes.data || []) as ProfileRow[];
      const subs: SubRow[] = (subsRes.data || []) as SubRow[];

      const activeSubs = subs.filter((s) => s.status === "active");
      const trialSubs = subs.filter((s) => s.status === "trial");
      const cancelledSubs = subs.filter((s) => s.status === "cancelled");

      const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      const arr = mrr * 12;
      const churnRate = subs.length > 0 ? Math.round((cancelledSubs.length / subs.length) * 100) : 0;
      const arpu = activeSubs.length > 0 ? Math.round(mrr / activeSubs.length) : 0;
      const conversionRate = orgs.length > 0 ? Math.round((activeSubs.length / orgs.length) * 100) : 0;

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
        name: PLAN_LABELS[plan] || plan,
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
        color: STATUS_COLORS[status] || "hsl(var(--muted-foreground))",
      }));

      // Monthly revenue (last 6 months)
      const monthlyRevenue: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const label = format(monthDate, "MMM yy", { locale: fr });

        const newOrgsInMonth = orgs.filter((o) => {
          const d = new Date(o.created_at);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        }).length;

        // Simple MRR approximation: count active subs created before month end
        const activeAtMonth = subs.filter((s) => {
          const created = new Date(s.created_at);
          return created <= monthEnd && (s.status === "active" || s.status === "trial");
        });
        const monthMrr = activeAtMonth
          .filter((s) => s.status === "active")
          .reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);

        monthlyRevenue.push({ month: label, mrr: monthMrr, newOrgs: newOrgsInMonth });
      }

      // MRR growth
      const prevMrr = monthlyRevenue.length >= 2 ? monthlyRevenue[monthlyRevenue.length - 2].mrr : 0;
      const mrrGrowth = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 100) : 0;

      // New orgs this/last month
      const thisMonthStart = startOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
      const newOrgsThisMonth = orgs.filter((o) => new Date(o.created_at) >= thisMonthStart).length;
      const newOrgsLastMonth = orgs.filter((o) => {
        const d = new Date(o.created_at);
        return isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd });
      }).length;

      // Top tenants by revenue
      const topTenants: TopTenant[] = activeSubs
        .map((s) => {
          const org = orgs.find((o) => o.id === s.organization_id);
          const users = profiles.filter((p) => p.organization_id === s.organization_id).length;
          return {
            name: org?.name || "—",
            plan: s.plan,
            mrr: PLAN_PRICES[s.plan] || 0,
            users,
            status: s.status,
          };
        })
        .sort((a, b) => b.mrr - a.mrr || b.users - a.users)
        .slice(0, 5);

      // Recent activities
      const recentActivities: RecentActivity[] = [];

      // Recent signups
      for (const org of orgs.slice(0, 3)) {
        recentActivities.push({
          id: `signup-${org.id}`,
          type: "signup",
          title: "Nouvelle inscription",
          description: org.name,
          date: org.created_at,
          icon: UserPlus,
          iconColor: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
        });
      }

      // Trial ending soon
      for (const s of trialSubs.slice(0, 2)) {
        const org = orgs.find((o) => o.id === s.organization_id);
        recentActivities.push({
          id: `trial-${s.organization_id}`,
          type: "trial_end",
          title: "Essai en cours",
          description: `${org?.name || "—"} — Plan ${PLAN_LABELS[s.plan] || s.plan}`,
          date: s.created_at,
          icon: Zap,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-500/10",
        });
      }

      // Cancelled
      for (const s of cancelledSubs.slice(0, 2)) {
        const org = orgs.find((o) => o.id === s.organization_id);
        recentActivities.push({
          id: `churn-${s.organization_id}`,
          type: "churn",
          title: "Abonnement annulé",
          description: org?.name || "—",
          date: s.created_at,
          icon: AlertTriangle,
          iconColor: "text-destructive",
          iconBg: "bg-destructive/10",
        });
      }

      recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        totalOrgs: orgs.length,
        activeOrgs: orgs.filter((o) => o.is_active).length,
        totalUsers: profiles.length,
        trialOrgs: trialSubs.length,
        paidOrgs: activeSubs.length,
        cancelledOrgs: cancelledSubs.length,
        mrr,
        arr,
        churnRate,
        arpu,
        conversionRate,
        revenueByPlan,
        subsByStatus,
        monthlyRevenue,
        topTenants,
        recentActivities,
        recentOrgs: orgs.slice(0, 5),
        mrrGrowth,
        newOrgsThisMonth,
        newOrgsLastMonth,
        planPrices: PLAN_PRICES,
        planLabels: PLAN_LABELS,
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

  if (!stats) return null;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const GrowthIndicator = ({ value, suffix = "%" }: { value: number; suffix?: string }) => (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${value >= 0 ? "text-emerald-500" : "text-destructive"}`}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}{suffix}
    </span>
  );

  const kpiCards = [
    {
      title: "MRR",
      value: `${fmt(stats.mrr)} FCFA`,
      subtitle: <GrowthIndicator value={stats.mrrGrowth} />,
      icon: Banknote,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "ARR",
      value: `${fmt(stats.arr)} FCFA`,
      subtitle: <span className="text-xs text-muted-foreground">Projection annuelle</span>,
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Abonnements actifs",
      value: stats.paidOrgs,
      subtitle: <span className="text-xs text-muted-foreground">{stats.trialOrgs} en essai</span>,
      icon: CreditCard,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Organisations",
      value: stats.totalOrgs,
      subtitle: (
        <span className="text-xs text-muted-foreground">
          +{stats.newOrgsThisMonth} ce mois
          {stats.newOrgsLastMonth > 0 && ` (${stats.newOrgsLastMonth} le mois dernier)`}
        </span>
      ),
      icon: Building2,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
    },
    {
      title: "Utilisateurs",
      value: stats.totalUsers,
      subtitle: <span className="text-xs text-muted-foreground">Tous comptes</span>,
      icon: Users,
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-500",
    },
    {
      title: "ARPU",
      value: stats.arpu > 0 ? `${fmt(stats.arpu)} FCFA` : "—",
      subtitle: <span className="text-xs text-muted-foreground">Revenu moyen / client</span>,
      icon: PiggyBank,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      title: "Taux de conversion",
      value: `${stats.conversionRate}%`,
      subtitle: <span className="text-xs text-muted-foreground">Essai → Payant</span>,
      icon: TrendingUp,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-500",
    },
    {
      title: "Taux de churn",
      value: `${stats.churnRate}%`,
      subtitle: <span className="text-xs text-muted-foreground">{stats.cancelledOrgs} annulé{stats.cancelledOrgs > 1 ? "s" : ""}</span>,
      icon: AlertTriangle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {new Date().getHours() < 12 ? "Bonjour" : "Bonsoir"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue d'ensemble de la plateforme · {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <Card key={card.title} className="border-border hover:shadow-md transition-shadow duration-200 bg-card group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${card.iconBg} transition-transform group-hover:scale-110`}>
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground tracking-tight leading-none">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5 truncate">{card.title}</p>
                <div className="mt-1">{card.subtitle}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row: Revenue Trend + MRR by Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Revenue trend - 3 cols */}
          <Card className="lg:col-span-3 border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Évolution du MRR</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">6 derniers mois</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{fmt(stats.mrr)} FCFA</p>
                  <GrowthIndicator value={stats.mrrGrowth} />
                </div>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.monthlyRevenue}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${fmt(value)} FCFA`, "MRR"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#mrrGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* MRR by plan - 2 cols */}
          <Card className="lg:col-span-2 border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">MRR par plan</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Répartition du revenu</p>
              </div>
              <div className="p-5">
                {(stats.revenueByPlan?.length ?? 0) > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={stats.revenueByPlan}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(stats.revenueByPlan || []).map((_, i) => (
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
                    <div className="space-y-2.5 mt-3">
                      {(stats.revenueByPlan || []).map((plan, i) => (
                        <div key={plan.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-sm text-muted-foreground">{plan.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-foreground">{fmt(plan.value)} FCFA</span>
                            <span className="text-xs text-muted-foreground ml-1.5">({plan.count})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Aucun abonnement actif
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row: New orgs trend + Subscriptions by status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New orgs per month */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Nouvelles inscriptions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Organisations créées par mois</p>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [value, "Inscriptions"]}
                    />
                    <Bar dataKey="newOrgs" name="Inscriptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Subs by status */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Abonnements par statut</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Répartition actuelle</p>
              </div>
              <div className="p-5">
                {(stats.subsByStatus?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {(stats.subsByStatus || []).map((item) => {
                      const total = (stats.subsByStatus || []).reduce((s, i) => s + i.value, 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-foreground font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">{item.value} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Aucun abonnement
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row: Top tenants + Recent activities */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Top tenants - 3 cols */}
          <Card className="lg:col-span-3 border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Top clients par revenu
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Abonnements actifs les plus contributeurs</p>
              </div>
              <div className="divide-y divide-border">
                {(stats.topTenants?.length ?? 0) === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Aucun abonnement actif
                  </div>
                ) : (
                  (stats.topTenants || []).map((tenant, idx) => (
                    <div key={idx} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.users} utilisateur{tenant.users > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {PLAN_LABELS[tenant.plan] || tenant.plan}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {fmt(tenant.mrr)} FCFA
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent activities - 2 cols */}
          <Card className="lg:col-span-2 border-border bg-card">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Activité récente
                </h2>
              </div>
              <div className="divide-y divide-border">
                {(stats.recentActivities?.length ?? 0) === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Aucune activité récente
                  </div>
                ) : (
                  (stats.recentActivities || []).slice(0, 7).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`p-1.5 rounded-lg ${activity.iconBg} mt-0.5 shrink-0`}>
                        <activity.icon className={`h-3.5 w-3.5 ${activity.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {format(new Date(activity.date), "dd MMM", { locale: fr })}
                      </span>
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
              <p className="text-xs text-muted-foreground mt-0.5">Prix mensuels utilisés pour le calcul du MRR</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              {Object.entries(PLAN_PRICES).map(([plan, price]) => (
                <div key={plan} className="px-5 py-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{PLAN_LABELS[plan] || plan}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {fmt(price)} <span className="text-xs font-normal text-muted-foreground">FCFA/mois</span>
                  </p>
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
