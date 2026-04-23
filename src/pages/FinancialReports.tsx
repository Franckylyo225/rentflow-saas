import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { useRentPayments, useProperties, useCities } from "@/hooks/useData";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Wallet, Percent, Loader2, FileDown, Lock } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const FCFA = (v: number) => `${(v / 1000).toFixed(0)}k`;
const CATEGORY_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)", "hsl(190, 70%, 50%)",
  "hsl(330, 70%, 55%)", "hsl(120, 60%, 40%)", "hsl(50, 80%, 50%)",
];

type PeriodMode = "all" | "month" | "quarter" | "year";

export default function FinancialReports() {
  const { data: expenses, loading: expLoading } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: payments, loading: payLoading } = useRentPayments();
  const { data: properties } = useProperties();
  const { data: cities } = useCities();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [periodValue, setPeriodValue] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { hasFeature, planName } = useFeatureAccess();
  const { settings: orgSettings } = useOrganizationSettings();
  const canExport = hasFeature("advanced_reports");

  const loading = expLoading || payLoading;

  const toQuarter = (ym: string) => {
    const [y, m] = ym.split("-");
    const q = Math.floor((parseInt(m, 10) - 1) / 3) + 1;
    return `${y}-Q${q}`;
  };
  const toYear = (ym: string) => ym.slice(0, 4);

  const matchesPeriod = (ym: string) => {
    if (periodMode === "all" || periodValue === "all") return true;
    if (periodMode === "month") return ym === periodValue;
    if (periodMode === "quarter") return toQuarter(ym) === periodValue;
    if (periodMode === "year") return toYear(ym) === periodValue;
    return true;
  };

  const filteredPayments = useMemo(
    () => payments.filter(p => matchesPeriod(p.month)),
    [payments, periodMode, periodValue]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter(e => matchesPeriod(e.expense_date.slice(0, 7))),
    [expenses, periodMode, periodValue]
  );

  const periodOptions = useMemo(() => {
    const months = new Set<string>();
    payments.forEach(p => months.add(p.month));
    expenses.forEach(e => months.add(e.expense_date.slice(0, 7)));
    const sorted = [...months].sort().reverse();
    if (periodMode === "month") return sorted;
    if (periodMode === "quarter") return [...new Set(sorted.map(toQuarter))];
    if (periodMode === "year") return [...new Set(sorted.map(toYear))];
    return [];
  }, [payments, expenses, periodMode]);

  const formatPeriodLabel = (v: string) => {
    if (periodMode === "month") {
      return new Date(v + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    if (periodMode === "quarter") {
      const [y, q] = v.split("-");
      return `${q} ${y}`;
    }
    return v;
  };

  const handleModeChange = (mode: PeriodMode) => {
    setPeriodMode(mode);
    setPeriodValue("all");
  };

  const periodLabel = useMemo(() => {
    if (periodMode === "all" || periodValue === "all") {
      if (periodMode === "all") return "Toutes périodes";
      if (periodMode === "month") return "Tous les mois";
      if (periodMode === "quarter") return "Tous les trimestres";
      if (periodMode === "year") return "Toutes les années";
    }
    return formatPeriodLabel(periodValue);
  }, [periodMode, periodValue]);

  // KPIs
  const ca = useMemo(() => filteredPayments.reduce((s, p) => s + p.paid_amount, 0), [filteredPayments]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const benefice = ca - totalExpenses;
  const marge = ca > 0 ? Math.round((benefice / ca) * 100) : 0;

  // CA vs Dépenses par mois
  const monthlyComparison = useMemo(() => {
    const byMonth: Record<string, { month: string; ca: number; depenses: number }> = {};
    payments.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { month: p.month, ca: 0, depenses: 0 };
      byMonth[p.month].ca += p.paid_amount;
    });
    expenses.forEach(e => {
      const m = e.expense_date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, ca: 0, depenses: 0 };
      byMonth[m].depenses += e.amount;
    });
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: new Date(d.month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        benefice: d.ca - d.depenses,
      }));
  }, [payments, expenses]);

  // Dépenses par catégorie
  const categoryData = useMemo(() => {
    const byCategory: Record<string, { name: string; value: number }> = {};
    filteredExpenses.forEach(e => {
      const catName = e.expense_categories?.name || "Autre";
      if (!byCategory[catName]) byCategory[catName] = { name: catName, value: 0 };
      byCategory[catName].value += e.amount;
    });
    return Object.values(byCategory).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Bénéfice par ville
  const cityProfitData = useMemo(() => {
    const byCity: Record<string, { city: string; ca: number; depenses: number }> = {};
    // CA by city
    filteredPayments.forEach(p => {
      const cityName = p.tenants?.units?.properties?.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, ca: 0, depenses: 0 };
      byCity[cityName].ca += p.paid_amount;
    });
    // Expenses by city
    filteredExpenses.forEach(e => {
      const cityName = e.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, ca: 0, depenses: 0 };
      byCity[cityName].depenses += e.amount;
    });
    return Object.values(byCity).map(c => ({
      ...c,
      benefice: c.ca - c.depenses,
    })).sort((a, b) => b.benefice - a.benefice);
  }, [filteredPayments, filteredExpenses]);

  const captureChart = async (selector: string): Promise<{ data: string; ratio: number } | null> => {
    const el = reportRef.current?.querySelector(selector) as HTMLElement | null;
    if (!el) return null;
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    return { data: canvas.toDataURL("image/jpeg", 0.95), ratio: canvas.width / canvas.height };
  };

  const handleExportPdf = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const headerH = 24;
      const footerH = 10;
      const contentTop = margin + headerH + 4;
      const contentBottom = pageHeight - margin - footerH;
      const contentMaxW = pageWidth - margin * 2;

      const generatedAt = new Date().toLocaleString("fr-FR");
      const orgName = orgSettings?.name || "Rapport financier";
      let pageNum = 1;
      let cursorY = contentTop;

      const drawHeader = () => {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, headerH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(orgName, margin, 10);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Rapport financier · ${periodLabel}`, margin, 17);
        pdf.setFontSize(8);
        pdf.text(`Généré le ${generatedAt}`, pageWidth - margin, 10, { align: "right" });
      };

      const drawFooter = () => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 6, { align: "right" });
        pdf.text(orgName, margin, pageHeight - 6);
      };

      const ensureSpace = (h: number) => {
        if (cursorY + h > contentBottom) {
          drawFooter();
          pdf.addPage();
          pageNum++;
          drawHeader();
          cursorY = contentTop;
        }
      };

      drawHeader();

      // === Section title ===
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Indicateurs clés", margin, cursorY);
      cursorY += 6;

      // === KPI cards as vector text ===
      const kpis = [
        { label: "Chiffre d'affaires", value: `${ca.toLocaleString("fr-FR")} FCFA`, color: [16, 185, 129] as [number, number, number] },
        { label: "Dépenses", value: `${totalExpenses.toLocaleString("fr-FR")} FCFA`, color: [239, 68, 68] as [number, number, number] },
        { label: "Bénéfice net", value: `${benefice.toLocaleString("fr-FR")} FCFA`, color: benefice >= 0 ? [16, 185, 129] as [number, number, number] : [239, 68, 68] as [number, number, number] },
        { label: "Marge", value: `${marge}%`, color: marge >= 50 ? [16, 185, 129] as [number, number, number] : marge >= 20 ? [245, 158, 11] as [number, number, number] : [239, 68, 68] as [number, number, number] },
      ];
      const cardGap = 4;
      const cardW = (contentMaxW - cardGap * 3) / 4;
      const cardH = 26;
      ensureSpace(cardH + 4);
      kpis.forEach((k, i) => {
        const x = margin + i * (cardW + cardGap);
        // card bg
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, cursorY, cardW, cardH, 2, 2, "FD");
        // label
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(k.label, x + 4, cursorY + 6);
        // value
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(...k.color);
        pdf.text(k.value, x + 4, cursorY + 14);
        // period
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(periodLabel, x + 4, cursorY + 21);
      });
      cursorY += cardH + 8;

      // === Charts (captured as images, but titles are vector) ===
      const charts = [
        { selector: "[data-pdf='chart-monthly']", title: "CA vs Dépenses" },
        { selector: "[data-pdf='chart-categories']", title: "Dépenses par catégorie" },
        { selector: "[data-pdf='chart-cities']", title: "Bénéfice par ville" },
      ];

      for (const c of charts) {
        const captured = await captureChart(c.selector);
        if (!captured) continue;
        const imgW = contentMaxW;
        const imgH = imgW / captured.ratio;
        ensureSpace(imgH + 10);
        // chart title (vector)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(c.title, margin, cursorY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`· ${periodLabel}`, margin + pdf.getTextWidth(c.title) + 2, cursorY);
        cursorY += 4;
        pdf.addImage(captured.data, "JPEG", margin, cursorY, imgW, imgH);
        cursorY += imgH + 6;
      }

      drawFooter();
      pdf.save(`rapport-financier-${periodValue !== "all" ? periodValue : periodMode}-${Date.now()}.pdf`);
      toast.success(`Rapport exporté (${pageNum} page${pageNum > 1 ? "s" : ""})`);
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Rapports financiers</h1>
            <p className="text-muted-foreground text-sm mt-1">Performance financière globale</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={periodMode} onValueChange={(v) => handleModeChange(v as PeriodMode)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes périodes</SelectItem>
                <SelectItem value="month">Par mois</SelectItem>
                <SelectItem value="quarter">Par trimestre</SelectItem>
                <SelectItem value="year">Par année</SelectItem>
              </SelectContent>
            </Select>
            {periodMode !== "all" && (
              <Select value={periodValue} onValueChange={setPeriodValue}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder={
                    periodMode === "month" ? "Choisir un mois" :
                    periodMode === "quarter" ? "Choisir un trimestre" : "Choisir une année"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {periodMode === "month" ? "Tous les mois" : periodMode === "quarter" ? "Tous les trimestres" : "Toutes les années"}
                  </SelectItem>
                  {periodOptions.map(v => (
                    <SelectItem key={v} value={v}>{formatPeriodLabel(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={canExport ? -1 : 0}>
                    <Button
                      onClick={handleExportPdf}
                      disabled={!canExport || exporting}
                      variant="default"
                      className="w-full sm:w-auto"
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : canExport ? (
                        <FileDown className="h-4 w-4 mr-2" />
                      ) : (
                        <Lock className="h-4 w-4 mr-2" />
                      )}
                      Exporter en PDF
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canExport && (
                  <TooltipContent>
                    Disponible avec l'offre Pro ou Business (offre actuelle : {planName})
                  </TooltipContent>
                )}
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>

        <div ref={reportRef} className="space-y-6 bg-background">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Chiffre d'affaires" value={`${ca.toLocaleString("fr-FR")} FCFA`} subtitle={periodLabel} icon={TrendingUp} variant="success" />
          <StatCard title="Dépenses" value={`${totalExpenses.toLocaleString("fr-FR")} FCFA`} subtitle={periodLabel} icon={TrendingDown} variant="destructive" />
          <StatCard title="Bénéfice net" value={`${benefice.toLocaleString("fr-FR")} FCFA`} subtitle={periodLabel} icon={Wallet} variant={benefice >= 0 ? "success" : "destructive"} />
          <StatCard title="Marge" value={`${marge}%`} subtitle={periodLabel} icon={Percent} variant={marge >= 50 ? "success" : marge >= 20 ? "warning" : "destructive"} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CA vs Dépenses */}
          <Card className="border-border lg:col-span-2" data-pdf="chart-monthly">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">CA vs Dépenses <span className="text-xs font-normal text-muted-foreground ml-1">· {periodLabel}</span></CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyComparison.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyComparison} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={FCFA} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 90%)", fontSize: 13 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ca" name="Chiffre d'affaires" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="depenses" name="Dépenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Dépenses par catégorie */}
          <Card className="border-border" data-pdf="chart-categories">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Dépenses par catégorie <span className="text-xs font-normal text-muted-foreground ml-1">· {periodLabel}</span></CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} FCFA`} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {categoryData.slice(0, 5).map((c, i) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        {c.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bénéfice par ville */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Bénéfice par ville <span className="text-xs font-normal text-muted-foreground ml-1">· {periodLabel}</span></CardTitle>
          </CardHeader>
          <CardContent>
            {cityProfitData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <div className="space-y-3 mt-2">
                {cityProfitData.map((c, i) => {
                  const maxAbs = Math.max(...cityProfitData.map(x => Math.abs(x.benefice)), 1);
                  const pct = Math.round((Math.abs(c.benefice) / maxAbs) * 100);
                  return (
                    <div key={c.city}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-card-foreground">{c.city}</span>
                        <span className={c.benefice >= 0 ? "text-success" : "text-destructive"}>
                          {c.benefice >= 0 ? "+" : ""}{c.benefice.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>CA: {c.ca.toLocaleString()}</span>
                        <span>·</span>
                        <span>Dépenses: {c.depenses.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: c.benefice >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AppLayout>
  );
}
