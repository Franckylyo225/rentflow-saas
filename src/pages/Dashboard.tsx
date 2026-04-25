import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatHistoryDrawer } from "@/components/dashboard/StatHistoryDrawer";
import { UrgentAlertsSection } from "@/components/dashboard/UrgentAlertsSection";
import { StatusDonut } from "@/components/dashboard/StatusDonut";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { PaymentsTable } from "@/components/dashboard/PaymentsTable";
import { RemindersWidgets } from "@/components/dashboard/RemindersWidgets";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Building2, Users, AlertTriangle, TrendingUp, Loader2, Wallet, TrendingDown, ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Minus, Plus, Send, Megaphone, Inbox, LineChart } from "lucide-react";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { useExpenses } from "@/hooks/useExpenses";
import { usePropertySales } from "@/hooks/usePropertySales";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const formatAmount = (v: number, short: boolean) => {
  if (short) {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toLocaleString();
  }
  return v.toLocaleString();
};

const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTH_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number): string {
  const d = new Date(month + "-01");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default function Dashboard() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { data: properties, loading: pLoading } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const { data: expenses } = useExpenses();
  const { sales } = usePropertySales();
  const { hasFeature, loading: featLoading } = useFeatureAccess();

  const canRents = featLoading || hasFeature("rents");
  const canExpenses = featLoading || hasFeature("expenses");

  const isMobile = useIsMobile();
  const short = isMobile;

  const now = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(now);
  const isCurrentMonth = selectedMonth === now;

  // Drawer states for KPI history
  const [historyDrawer, setHistoryDrawer] = useState<null | "ca" | "expenses" | "occupancy">(null);

  const prevMonth = useMemo(() => shiftMonth(selectedMonth, -1), [selectedMonth]);
  const monthCA = useMemo(() => payments.filter(p => p.month === selectedMonth).reduce((s, p) => s + p.paid_amount, 0), [payments, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.expense_date.slice(0, 7) === selectedMonth).reduce((s, e) => s + e.amount, 0), [expenses, selectedMonth]);
  const monthBenefice = monthCA - monthExpenses;

  const prevCA = useMemo(() => payments.filter(p => p.month === prevMonth).reduce((s, p) => s + p.paid_amount, 0), [payments, prevMonth]);
  const prevExpenses = useMemo(() => expenses.filter(e => e.expense_date.slice(0, 7) === prevMonth).reduce((s, e) => s + e.amount, 0), [expenses, prevMonth]);
  const prevBenefice = prevCA - prevExpenses;

  function pctChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
    if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
    if (previous === 0) return { pct: 100, direction: "up" };
    const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
    return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  }

  const caChange = pctChange(monthCA, prevCA);
  const expChange = pctChange(monthExpenses, prevExpenses);
  const benChange = pctChange(monthBenefice, prevBenefice);

  const monthPayments = useMemo(() => payments.filter(p => p.month === selectedMonth), [payments, selectedMonth]);
  const unpaidTotal = useMemo(() => monthPayments.filter(r => r.status !== "paid").reduce((sum, r) => sum + (r.amount - r.paid_amount), 0), [monthPayments]);
  const unpaidCount = useMemo(() => new Set(monthPayments.filter(r => r.status !== "paid" && r.amount > r.paid_amount).map(p => p.tenant_id)).size, [monthPayments]);
  const totalExpected = useMemo(() => monthPayments.reduce((s, p) => s + p.amount, 0), [monthPayments]);
  const totalPaid = useMemo(() => monthPayments.reduce((s, p) => s + p.paid_amount, 0), [monthPayments]);
  const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
  const expectedCount = monthPayments.length;

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const vacantUnits = totalUnits - occupiedUnits;
  const vacantRevenue = units.filter(u => u.status !== "occupied").reduce((s, u) => s + (u.rent || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // 6-month history series
  const sixMonths = useMemo(() => {
    const m: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const k = shiftMonth(selectedMonth, -i);
      const idx = parseInt(k.split("-")[1], 10) - 1;
      m.push({ key: k, label: `${MONTH_SHORT[idx]} ${k.slice(2, 4)}` });
    }
    return m;
  }, [selectedMonth]);

  const sparklineData = useMemo(() =>
    sixMonths.map(m => payments.filter(p => p.month === m.key).reduce((s, p) => s + p.paid_amount, 0)),
    [payments, sixMonths]);

  const sparklineExpenses = useMemo(() =>
    sixMonths.map(m => expenses.filter(e => e.expense_date.slice(0, 7) === m.key).reduce((s, e) => s + e.amount, 0)),
    [expenses, sixMonths]);

  const occupancySpark = useMemo(() => sixMonths.map(() => occupancyRate), [sixMonths, occupancyRate]);

  const caHistory = sixMonths.map((m, i) => ({ label: m.label, value: sparklineData[i] }));
  const expHistory = sixMonths.map((m, i) => ({ label: m.label, value: sparklineExpenses[i] }));
  const occHistory = sixMonths.map((m, i) => ({ label: m.label, value: occupancySpark[i] }));

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { month: string; paid: number; unpaid: number }> = {};
    payments.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { month: p.month, paid: 0, unpaid: 0 };
      byMonth[p.month].paid += p.paid_amount;
      byMonth[p.month].unpaid += (p.amount - p.paid_amount);
    });
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: new Date(d.month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      }));
  }, [payments]);

  // Occupancy progress color
  const occColor = occupancyRate < 50 ? "bg-destructive" : occupancyRate < 75 ? "bg-warning" : "bg-success";

  if (pLoading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  function handleRelancerTout() {
    toast.success(`Relances déclenchées pour ${unpaidCount} locataire(s)`);
  }

  return (
    <AppLayout>
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
                  const firstName = profile?.full_name?.split(" ")[0] || "";
                  return `${greeting}${firstName ? `, ${firstName}` : ""} 👋`;
                })()}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile drawer for reminders */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="xl:hidden gap-1.5 h-8">
                    <Megaphone className="h-3.5 w-3.5" /> Relances
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[340px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Relances & échéances</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <RemindersWidgets />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  onClick={() => setSelectedMonth(now)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isCurrentMonth ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {formatMonthLabel(selectedMonth)}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))} disabled={isCurrentMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className={cn("grid gap-4", canRents && canExpenses ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2")}>
            {canRents && (
              <StatCard
                title="CA du mois"
                value={`${formatAmount(monthCA, short)} FCFA`}
                icon={TrendingUp}
                variant="success"
                trend={caChange.direction !== "flat" ? { value: `${caChange.pct}%`, positive: caChange.direction === "up" } : undefined}
                subtitle="vs mois précédent"
                sparkData={sparklineData}
                helpText="Somme des montants encaissés sur le mois sélectionné, tous statuts confondus."
                onSparkClick={() => setHistoryDrawer("ca")}
              />
            )}
            {canExpenses && (
              <StatCard
                title="Dépenses"
                value={`${formatAmount(monthExpenses, short)} FCFA`}
                icon={TrendingDown}
                variant="destructive"
                trend={expChange.direction !== "flat" ? { value: `${expChange.pct}%`, positive: expChange.direction === "down" } : undefined}
                subtitle="vs mois précédent"
                sparkData={sparklineExpenses}
                helpText="Somme des dépenses (charges, salaires, maintenance) imputées au mois sélectionné."
                onSparkClick={() => setHistoryDrawer("expenses")}
              />
            )}
            <StatCard
              title="Taux d'occupation"
              value={`${occupancyRate}%`}
              icon={Users}
              variant="info"
              sparkData={occupancySpark}
              helpText="Unités occupées ÷ unités totales × 100. Calculé sur l'ensemble du portefeuille."
              onSparkClick={() => setHistoryDrawer("occupancy")}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{occupiedUnits}/{totalUnits} unités</span>
                  <span className="font-semibold text-card-foreground">{occupancyRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", occColor)} style={{ width: `${occupancyRate}%` }} />
                </div>
              </div>
            </StatCard>
            <StatCard
              title="Biens gérés"
              value={properties.length.toString()}
              icon={Building2}
              variant="default"
              subtitle={`${totalUnits} unités · ${tenants.length} locataires`}
              helpText="Nombre total de biens immobiliers actifs dans votre portefeuille."
            >
              <button
                onClick={() => navigate("/properties?action=new")}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Ajouter un bien
              </button>
            </StatCard>
          </div>

          {/* Bottom KPI Cards (financial) */}
          {canRents && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Loyers attendus */}
              <Card className="border-border overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-success/15 text-success text-lg">📥</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Loyers attendus</p>
                      <p className="text-xl font-bold text-card-foreground">{formatAmount(totalExpected, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{expectedCount} paiement{expectedCount > 1 ? "s" : ""} attendu{expectedCount > 1 ? "s" : ""} ce mois</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Encaissé</span>
                      <span className="font-semibold text-success">{collectionRate}% du total</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${collectionRate}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Impayés */}
              <Card className={cn("border-border overflow-hidden", unpaidTotal === 0 ? "bg-success/5 border-success/30" : "bg-destructive/5 border-destructive/30")}>
                <CardContent className="p-4">
                  {unpaidTotal === 0 ? (
                    <div className="flex items-center gap-3 h-full">
                      <div className="p-2.5 rounded-xl bg-success/15 text-success text-lg">✅</div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Impayés</p>
                        <p className="text-base font-bold text-success">Aucun impayé ce mois !</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="relative p-2.5 rounded-xl bg-destructive/15 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Impayés</p>
                          <p className="text-xl font-bold text-destructive">{formatAmount(unpaidTotal, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{unpaidCount} locataire{unpaidCount > 1 ? "s" : ""} concerné{unpaidCount > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive" className="w-full h-8 text-xs gap-1.5" onClick={handleRelancerTout}>
                        <Send className="h-3 w-3" /> Relancer tout
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bénéfice net */}
              <Card className="border-border overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-xl text-lg", monthBenefice >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>💹</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bénéfice net</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className={cn("text-xl font-bold", monthBenefice >= 0 ? "text-success" : "text-destructive")}>{formatAmount(monthBenefice, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                        <span className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-semibold",
                          benChange.direction === "up" ? "text-success" : benChange.direction === "down" ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {benChange.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : benChange.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {benChange.pct}% vs mois précédent
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Charges déduites : {formatAmount(monthExpenses, short)} FCFA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Urgent alerts section */}
          {properties.length > 0 && <UrgentAlertsSection selectedMonth={selectedMonth} />}

          {properties.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Bienvenue sur RentFlow</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Commencez par ajouter vos biens immobiliers pour voir apparaître vos données ici.
                </p>
                <div className="mt-6">
                  <OnboardingChecklist />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Charts row */}
              {canRents && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <StatusDonut
                    monthLabel={formatMonthLabel(selectedMonth)}
                    payments={monthPayments}
                    vacantUnits={vacantUnits}
                    vacantPotentialRevenue={vacantRevenue}
                  />
                  <MonthlyRevenueChart data={monthlyData} />
                </div>
              )}

              {/* Payments table */}
              {canRents && <PaymentsTable payments={monthPayments} monthLabel={formatMonthLabel(selectedMonth)} />}

              <OnboardingChecklist />
            </>
          )}
        </div>

        {/* Right column (desktop ≥1280px) */}
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <RemindersWidgets />
          </div>
        </aside>
      </div>

      {/* History drawers */}
      <StatHistoryDrawer
        open={historyDrawer === "ca"}
        onClose={() => setHistoryDrawer(null)}
        title="CA des 6 derniers mois"
        description="Évolution de votre chiffre d'affaires encaissé"
        data={caHistory}
        unit="FCFA"
        color="hsl(var(--success))"
      />
      <StatHistoryDrawer
        open={historyDrawer === "expenses"}
        onClose={() => setHistoryDrawer(null)}
        title="Dépenses des 6 derniers mois"
        description="Évolution de vos dépenses mensuelles"
        data={expHistory}
        unit="FCFA"
        color="hsl(var(--destructive))"
      />
      <StatHistoryDrawer
        open={historyDrawer === "occupancy"}
        onClose={() => setHistoryDrawer(null)}
        title="Taux d'occupation"
        description="Pourcentage d'unités occupées sur les 6 derniers mois"
        data={occHistory}
        unit="%"
        color="hsl(var(--info))"
      />
    </AppLayout>
  );
}
