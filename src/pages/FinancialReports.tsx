import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { useRentPayments, useProperties } from "@/hooks/useData";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp, TrendingDown, Wallet, Percent, Loader2, FileDown, FileSpreadsheet,
  RefreshCw, Building2, MailWarning, AlertTriangle, Home, ArrowUp, ArrowDown,
  CalendarIcon, Search, Lock, Sparkles, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, isWithinInterval, parseISO, differenceInDays, addMonths, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

// ---------- Format ----------
const nf = new Intl.NumberFormat("fr-CI");
const formatFCFA = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} M FCFA`;
  if (abs >= 1_000) return `${nf.format(v)} FCFA`;
  return `${v} FCFA`;
};
const formatShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${v}`;
};

type PeriodPreset = "this_month" | "last_month" | "last_3_months" | "this_year" | "all" | "custom";

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_month: "Ce mois",
  last_month: "Mois dernier",
  last_3_months: "3 derniers mois",
  this_year: "Cette année",
  all: "Toutes périodes",
  custom: "Personnalisé…",
};

const METHOD_COLORS: Record<string, string> = {
  "Orange Money": "bg-orange-500",
  "Wave": "bg-blue-500",
  "MTN MoMo": "bg-yellow-500",
  "Mobile Money": "bg-orange-400",
  "Virement": "bg-slate-400",
  "Espèces": "bg-slate-500",
  "Chèque": "bg-slate-400",
};

export default function FinancialReports() {
  const { data: expenses, loading: expLoading, refetch: refetchExp } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: payments, loading: payLoading, refetch: refetchPay } = useRentPayments();
  const { data: properties } = useProperties();
  const { hasFeature, planName } = useFeatureAccess();
  const { settings: orgSettings } = useOrganizationSettings();
  const canExport = hasFeature("advanced_reports");

  const [period, setPeriod] = useState<PeriodPreset>("this_month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [propertyId, setPropertyId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);
  const [paymentRecords, setPaymentRecords] = useState<Array<{ rent_payment_id: string; method: string }>>([]);
  const [reminderLogs, setReminderLogs] = useState<Array<{ id: string; rent_payment_id: string; template_key: string; sent_at: string; status: string }>>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const loading = expLoading || payLoading;

  // Fetch extra data
  useEffect(() => {
    (async () => {
      const { data: pr } = await supabase.from("payment_records").select("rent_payment_id, method");
      if (pr) setPaymentRecords(pr as any);
      const { data: rl } = await supabase.from("email_reminder_logs").select("id, rent_payment_id, template_key, sent_at, status").order("sent_at", { ascending: false }).limit(500);
      if (rl) setReminderLogs(rl as any);
    })();
  }, []);

  // Period range
  const range = useMemo(() => {
    const now = new Date();
    if (period === "this_month") return { from: startOfMonth(now), to: endOfMonth(now), label: format(now, "MMMM yyyy", { locale: fr }) };
    if (period === "last_month") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm), label: format(lm, "MMMM yyyy", { locale: fr }) };
    }
    if (period === "last_3_months") return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now), label: "3 derniers mois" };
    if (period === "this_year") return { from: startOfYear(now), to: endOfMonth(now), label: format(now, "yyyy") };
    if (period === "custom" && customRange.from && customRange.to) {
      return { from: customRange.from, to: customRange.to, label: `${format(customRange.from, "dd/MM/yyyy")} → ${format(customRange.to, "dd/MM/yyyy")}` };
    }
    return { from: undefined, to: undefined, label: "Toutes périodes" };
  }, [period, customRange]);

  // Previous period (same length) for variation
  const previousRange = useMemo(() => {
    if (!range.from || !range.to) return null;
    const days = differenceInDays(range.to, range.from) + 1;
    const to = new Date(range.from.getTime() - 86400000);
    const from = new Date(to.getTime() - (days - 1) * 86400000);
    return { from, to };
  }, [range]);

  const inRange = (d: Date) => {
    if (!range.from || !range.to) return true;
    return isWithinInterval(d, { start: range.from, end: range.to });
  };
  const inPrev = (d: Date) => {
    if (!previousRange) return false;
    return isWithinInterval(d, { start: previousRange.from, end: previousRange.to });
  };
  const matchProperty = (pid?: string | null) => propertyId === "all" || pid === propertyId;

  // Filtered datasets
  const fPayments = useMemo(() => payments.filter(p => {
    const d = parseISO(p.due_date);
    const pid = p.tenants?.units?.properties ? (payments && (p as any).tenants?.units?.property_id) : null;
    // We need property id from tenants.units.property_id
    const propId = (p.tenants?.units as any)?.property_id ?? null;
    return inRange(d) && matchProperty(propId);
  }), [payments, range, propertyId]);

  const fPrevPayments = useMemo(() => payments.filter(p => {
    const d = parseISO(p.due_date);
    const propId = (p.tenants?.units as any)?.property_id ?? null;
    return inPrev(d) && matchProperty(propId);
  }), [payments, previousRange, propertyId]);

  const fExpenses = useMemo(() => expenses.filter(e => {
    const d = parseISO(e.expense_date);
    return inRange(d) && matchProperty(e.property_id);
  }), [expenses, range, propertyId]);

  const fPrevExpenses = useMemo(() => expenses.filter(e => {
    const d = parseISO(e.expense_date);
    return inPrev(d) && matchProperty(e.property_id);
  }), [expenses, previousRange, propertyId]);

  // KPIs
  const ca = fPayments.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const caPrev = fPrevPayments.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const caDelta = caPrev > 0 ? Math.round(((ca - caPrev) / caPrev) * 100) : null;

  const totalExpenses = fExpenses.reduce((s, e) => s + e.amount, 0);
  const expPrev = fPrevExpenses.reduce((s, e) => s + e.amount, 0);
  const expDelta = expPrev > 0 ? Math.round(((totalExpenses - expPrev) / expPrev) * 100) : null;

  const expectedRent = fPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = fPayments.filter(p => p.status !== "paid").reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.paid_amount || 0)), 0);
  const collectionRate = expectedRent > 0 ? Math.round((ca / expectedRent) * 100) : 0;

  const benefice = ca - totalExpenses;
  const marge = ca > 0 ? Number(((benefice / ca) * 100).toFixed(1)) : 0;

  // Properties (filtered by selection if needed)
  const propsList = useMemo(() => propertyId === "all" ? properties : properties.filter(p => p.id === propertyId), [properties, propertyId]);
  const occupied = propsList.length; // we don't have units detail; approximate by properties with active payments
  const activeProps = useMemo(() => {
    const set = new Set<string>();
    fPayments.forEach(p => {
      const pid = (p.tenants?.units as any)?.property_id;
      if (pid) set.add(pid);
    });
    return set.size;
  }, [fPayments]);
  const totalProps = propsList.length;
  const vacant = Math.max(0, totalProps - activeProps);
  const occupationRate = totalProps > 0 ? Math.round((activeProps / totalProps) * 100) : 0;

  // Impayés
  const unpaid = fPayments.filter(p => p.status === "late" || (p.status === "pending" && parseISO(p.due_date) < new Date()));
  const unpaidAmount = unpaid.reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.paid_amount || 0)), 0);
  const unpaidTenants = new Set(unpaid.map(p => p.tenant_id)).size;
  const avgLateDays = unpaid.length > 0
    ? Math.round(unpaid.reduce((s, p) => s + Math.max(0, differenceInDays(new Date(), parseISO(p.due_date))), 0) / unpaid.length)
    : 0;

  // Relances
  const remindersInPeriod = useMemo(() => reminderLogs.filter(r => inRange(parseISO(r.sent_at))), [reminderLogs, range]);
  const remindersCount = remindersInPeriod.length;
  // "Réponse": paiements après relance — approx = paiements payés du mois
  const respondedRate = remindersCount > 0
    ? Math.round((fPayments.filter(p => p.status === "paid").length / Math.max(1, remindersCount)) * 100)
    : 0;

  // Monthly trend (6 derniers mois)
  const last6 = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; ca: number; depenses: number; attendu: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthPayments = payments.filter(p => {
        const d = parseISO(p.due_date);
        const propId = (p.tenants?.units as any)?.property_id ?? null;
        return isWithinInterval(d, { start, end }) && matchProperty(propId);
      });
      const monthExp = expenses.filter(e => {
        const d = parseISO(e.expense_date);
        return isWithinInterval(d, { start, end }) && matchProperty(e.property_id);
      });
      months.push({
        key: format(m, "yyyy-MM"),
        label: format(m, "MMM", { locale: fr }),
        ca: monthPayments.reduce((s, p) => s + (p.paid_amount || 0), 0),
        depenses: monthExp.reduce((s, e) => s + e.amount, 0),
        attendu: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
      });
    }
    return months;
  }, [payments, expenses, propertyId]);

  // Trend pct & projection
  const trendInfo = useMemo(() => {
    const last3 = last6.slice(-3);
    if (last3.length < 2) return { pct: 0, projection: 0 };
    const first = last3[0].ca || 1;
    const last = last3[last3.length - 1].ca;
    const pct = Math.round(((last - first) / first) * 100 / Math.max(1, last3.length - 1));
    const avgDelta = (last - first) / Math.max(1, last3.length - 1);
    const projection = Math.max(0, Math.round(last + avgDelta));
    return { pct, projection };
  }, [last6]);

  // Rent status distribution
  const statusDist = useMemo(() => {
    const paid = fPayments.filter(p => p.status === "paid").reduce((s, p) => s + (p.paid_amount || 0), 0);
    const pending = fPayments.filter(p => p.status === "pending" || p.status === "partial").reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.paid_amount || 0)), 0);
    const late = fPayments.filter(p => p.status === "late").reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.paid_amount || 0)), 0);
    const vacantAmount = vacant * 0; // unknown rent for vacant
    return [
      { name: "Payé", value: paid, color: "hsl(160, 84%, 39%)" },
      { name: "En attente", value: pending, color: "hsl(38, 92%, 50%)" },
      { name: "Impayé", value: late, color: "hsl(0, 72%, 51%)" },
      { name: "Vacant", value: vacantAmount, color: "hsl(220, 10%, 70%)" },
    ];
  }, [fPayments, vacant]);

  // Performance par bien
  const perfByProperty = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; paid: number; status: string }>();
    propsList.forEach(p => map.set(p.id, { name: p.name, amount: 0, paid: 0, status: "vacant" }));
    fPayments.forEach(p => {
      const pid = (p.tenants?.units as any)?.property_id;
      const name = p.tenants?.units?.properties?.name;
      if (!pid || !name) return;
      const cur = map.get(pid) || { name, amount: 0, paid: 0, status: "pending" };
      cur.amount += p.amount || 0;
      cur.paid += p.paid_amount || 0;
      if (p.status === "late") cur.status = "late";
      else if (cur.status !== "late" && p.status === "paid") cur.status = "paid";
      else if (cur.status !== "late" && cur.status !== "paid") cur.status = "pending";
      map.set(pid, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [fPayments, propsList]);

  // Method lookup
  const methodByPayment = useMemo(() => {
    const m = new Map<string, string>();
    paymentRecords.forEach(pr => { if (pr.rent_payment_id && pr.method) m.set(pr.rent_payment_id, pr.method); });
    return m;
  }, [paymentRecords]);

  // Table filters
  const [tableTab, setTableTab] = useState<"all" | "paid" | "pending" | "late">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filteredRows = useMemo(() => {
    let rows = fPayments;
    if (tableTab === "paid") rows = rows.filter(p => p.status === "paid");
    else if (tableTab === "pending") rows = rows.filter(p => p.status === "pending" || p.status === "partial");
    else if (tableTab === "late") rows = rows.filter(p => p.status === "late");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(p => p.tenants?.full_name?.toLowerCase().includes(q));
    }
    return rows;
  }, [fPayments, tableTab, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [tableTab, search, period, propertyId]);

  const tableTotalPaid = filteredRows.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const tableTotalExpected = filteredRows.reduce((s, p) => s + (p.amount || 0), 0);

  // Refresh
  const handleRefresh = async () => {
    await Promise.all([refetchPay(), refetchExp()]);
    toast.success("Données actualisées");
  };

  // Excel export
  const handleExportExcel = () => {
    if (!canExport) return;
    try {
      const wb = XLSX.utils.book_new();
      const summary = [
        ["Période", range.label],
        ["Bien", propertyId === "all" ? "Tous les biens" : (properties.find(p => p.id === propertyId)?.name ?? "—")],
        [],
        ["Chiffre d'affaires", ca],
        ["Dépenses", totalExpenses],
        ["Bénéfice net", benefice],
        ["Marge (%)", marge],
        ["Taux d'encaissement (%)", collectionRate],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Résumé");

      const paySheet = [["Locataire", "Bien", "Montant", "Payé", "Méthode", "Date d'échéance", "Statut"]];
      filteredRows.forEach(p => paySheet.push([
        p.tenants?.full_name || "—",
        p.tenants?.units?.properties?.name || "—",
        p.amount,
        p.paid_amount,
        methodByPayment.get(p.id) || "—",
        p.due_date,
        p.status,
      ]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paySheet), "Loyers");

      const expSheet = [["Catégorie", "Description", "Montant", "Date"]];
      fExpenses.forEach(e => expSheet.push([e.expense_categories?.name || "—", e.description || "", e.amount, e.expense_date]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expSheet), "Dépenses");

      XLSX.writeFile(wb, `rapport-financier-${Date.now()}.xlsx`);
      toast.success("Export Excel généré");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'export Excel");
    }
  };

  // PDF export (kept simple)
  const handleExportPdf = async () => {
    if (!canExport || !reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgW = pageWidth - 20;
      const imgH = (canvas.height / canvas.width) * imgW;
      pdf.setFontSize(14); pdf.text(orgSettings?.name || "Rapport", 10, 12);
      pdf.setFontSize(10); pdf.text(`Rapport financier · ${range.label}`, 10, 18);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 10, 22, imgW, imgH);
      pdf.save(`rapport-financier-${Date.now()}.pdf`);
      toast.success("Rapport PDF généré");
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

  // KPI card mini-component
  const KpiCard = ({ icon: Icon, label, value, sub, delta, iconBg, valueClass, footer }: any) => (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {delta !== undefined && delta !== null && (
            <span className={`text-[10px] inline-flex items-center gap-0.5 ${delta >= 0 ? "text-success" : "text-destructive"}`}>
              {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className={`text-xl font-medium mt-0.5 ${valueClass || "text-card-foreground"}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        {footer && <div className="text-[10px] mt-1">{footer}</div>}
      </CardContent>
    </Card>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: "Payé", cls: "bg-success/10 text-success border-success/20" },
      pending: { label: "En attente", cls: "bg-warning/10 text-warning border-warning/20" },
      partial: { label: "Partiel", cls: "bg-warning/10 text-warning border-warning/20" },
      late: { label: "Impayé", cls: "bg-destructive/10 text-destructive border-destructive/20" },
    };
    const s = map[status] || { label: status, cls: "" };
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  // Rent calendar (current period)
  const calendarDays = useMemo(() => {
    if (!range.from || !range.to) return [];
    return eachDayOfInterval({ start: range.from, end: range.to }).map(d => {
      const dueCount = fPayments.filter(p => parseISO(p.due_date).toDateString() === d.toDateString()).length;
      return { date: d, count: dueCount };
    });
  }, [range, fPayments]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Topbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Rapports financiers</h1>
            <p className="text-muted-foreground text-sm mt-1">Performance globale de {orgSettings?.name || "votre agence"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map(k => (
                  <SelectItem key={k} value={k}>{PERIOD_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {period === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customRange.from ? format(customRange.from, "dd/MM/yyyy") : "Du"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customRange.from} onSelect={(d) => setCustomRange(r => ({ ...r, from: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customRange.to ? format(customRange.to, "dd/MM/yyyy") : "Au"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customRange.to} onSelect={(d) => setCustomRange(r => ({ ...r, to: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Bien" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les biens</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>

            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" onClick={handleExportExcel} disabled={!canExport}>
                      {canExport ? <FileSpreadsheet className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                      Exporter en Excel
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canExport && <TooltipContent>Disponible avec une offre supérieure (offre actuelle : {planName})</TooltipContent>}
              </UITooltip>
            </TooltipProvider>

            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={handleExportPdf} disabled={!canExport || exporting}>
                      {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : canExport ? <FileDown className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                      Exporter en PDF
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canExport && <TooltipContent>Disponible avec une offre supérieure (offre actuelle : {planName})</TooltipContent>}
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">Vue globale</TabsTrigger>
            <TabsTrigger value="rents">Loyers</TabsTrigger>
            <TabsTrigger value="expenses">Dépenses</TabsTrigger>
            <TabsTrigger value="reminders">Relances</TabsTrigger>
            <TabsTrigger value="properties">Biens</TabsTrigger>
          </TabsList>

          {/* ============= OVERVIEW ============= */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div ref={reportRef} className="space-y-6 bg-background">

              {/* KPI row 1 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={TrendingUp}
                  iconBg="bg-success"
                  label="Chiffre d'affaires"
                  value={formatFCFA(ca)}
                  sub={`FCFA · ${range.label}`}
                  delta={caDelta}
                  valueClass="text-success"
                />
                <KpiCard
                  icon={TrendingDown}
                  iconBg="bg-destructive"
                  label="Dépenses"
                  value={formatFCFA(totalExpenses)}
                  sub={`FCFA · ${range.label}`}
                  delta={expDelta}
                  valueClass={totalExpenses > 0 ? "text-destructive" : ""}
                />
                <KpiCard
                  icon={Wallet}
                  iconBg="bg-primary"
                  label="Loyers attendus"
                  value={formatFCFA(expectedRent)}
                  sub="FCFA attendus"
                  footer={pendingAmount > 0 ? <span className="text-warning">{formatFCFA(pendingAmount)} en attente</span> : null}
                />
                <KpiCard
                  icon={Percent}
                  iconBg={collectionRate >= 75 ? "bg-success" : collectionRate >= 50 ? "bg-warning" : "bg-destructive"}
                  label="Taux d'encaissement"
                  value={`${collectionRate}%`}
                  sub="Objectif : 90%"
                  footer={
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, collectionRate)}%`,
                          backgroundColor: collectionRate >= 75 ? "hsl(160, 84%, 39%)" : collectionRate >= 50 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)",
                        }}
                      />
                    </div>
                  }
                />
              </div>

              {/* KPI row 2 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={Building2}
                  iconBg="bg-primary"
                  label="Biens actifs"
                  value={`${activeProps}`}
                  sub={`${vacant} vacants sur ${totalProps} total`}
                  footer={<span className="text-muted-foreground">{occupationRate}% d'occupation</span>}
                />
                <KpiCard
                  icon={MailWarning}
                  iconBg="bg-warning"
                  label="Relances envoyées"
                  value={`${remindersCount}`}
                  sub="Ce mois"
                  footer={<span className="text-success">{respondedRate}% de réponse</span>}
                />
                <KpiCard
                  icon={AlertTriangle}
                  iconBg="bg-destructive"
                  label="Impayés en cours"
                  value={formatFCFA(unpaidAmount)}
                  sub={`FCFA · ${unpaidTenants} locataire${unpaidTenants > 1 ? "s" : ""}`}
                  valueClass={unpaidAmount > 0 ? "text-destructive" : ""}
                  footer={<span className="text-muted-foreground">Avg. {avgLateDays} jours de retard</span>}
                />
                <KpiCard
                  icon={Home}
                  iconBg={benefice >= 0 ? "bg-success" : "bg-destructive"}
                  label="Bénéfice net"
                  value={formatFCFA(benefice)}
                  sub={`FCFA · Marge ${marge}%`}
                  valueClass={benefice >= 0 ? "text-success" : "text-destructive"}
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card className="border-border lg:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Évolution CA vs Dépenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={last6} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="ca" name="CA" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="depenses" name="Dépenses" fill="hsl(0, 72%, 65%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="attendu" name="Attendu" fill="hsl(220, 10%, 80%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Tendance : <strong className={trendInfo.pct >= 0 ? "text-success" : "text-destructive"}>{trendInfo.pct >= 0 ? "+" : ""}{trendInfo.pct}% par mois</strong></span>
                      <span>Projeté mois prochain : <strong className="text-foreground">~{formatFCFA(trendInfo.projection)}</strong></span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Répartition des loyers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={statusDist.filter(s => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                            {statusDist.filter(s => s.value > 0).map((s, i) => <Cell key={i} fill={s.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-2xl font-bold text-foreground">{collectionRate}%</div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Encaissé</div>
                      </div>
                    </div>
                    <div className="space-y-1 mt-3">
                      {statusDist.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{formatFCFA(s.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grid 2 cols */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Performance par bien</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {perfByProperty.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-6 text-center">Aucune donnée</div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {perfByProperty.map(p => {
                          const pct = p.amount > 0 ? Math.min(100, Math.round((p.paid / p.amount) * 100)) : 0;
                          const color = p.status === "paid" ? "hsl(160, 84%, 39%)" : p.status === "late" ? "hsl(0, 72%, 51%)" : p.status === "vacant" ? "hsl(220, 10%, 70%)" : "hsl(38, 92%, 50%)";
                          const label = p.status === "late" ? "Impayé" : p.status === "vacant" ? "Vacant" : null;
                          return (
                            <div key={p.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-card-foreground truncate max-w-[60%]">{p.name}</span>
                                <span className="text-foreground">{formatFCFA(p.paid)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${p.status === "vacant" ? 0 : pct}%`, backgroundColor: color }} />
                              </div>
                              {label && <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Insights automatiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Tendance CA */}
                    <div className={`p-3 rounded-lg border-l-4 ${trendInfo.pct >= 0 ? "bg-success/5 border-success" : "bg-destructive/5 border-destructive"}`}>
                      <div className="font-medium text-sm">{trendInfo.pct >= 0 ? "Tendance positive" : "Tendance à surveiller"}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {trendInfo.pct >= 0
                          ? `Votre CA progresse de +${trendInfo.pct}%/mois. Projection : ${formatFCFA(trendInfo.projection)} le mois prochain.`
                          : `Votre CA baisse de ${trendInfo.pct}%/mois. Surveillez vos relances.`}
                      </div>
                    </div>

                    {/* Occupation */}
                    {vacant > 0 ? (
                      <div className="p-3 rounded-lg border-l-4 bg-warning/5 border-warning">
                        <div className="font-medium text-sm">Taux d'occupation à améliorer</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {vacant} bien{vacant > 1 ? "s" : ""} vacant{vacant > 1 ? "s" : ""} — pensez à publier les annonces.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border-l-4 bg-success/5 border-success">
                        <div className="font-medium text-sm">Occupation maximale</div>
                        <div className="text-xs text-muted-foreground mt-1">Tous vos biens sont occupés.</div>
                      </div>
                    )}

                    {/* Impayés */}
                    {unpaidAmount > 0 ? (
                      <div className="p-3 rounded-lg border-l-4 bg-destructive/5 border-destructive">
                        <div className="font-medium text-sm">Impayés en cours</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatFCFA(unpaidAmount)} impayés depuis {avgLateDays} jour{avgLateDays > 1 ? "s" : ""} en moyenne. Lancez vos relances.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border-l-4 bg-success/5 border-success">
                        <div className="font-medium text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Aucun impayé ce mois</div>
                        <div className="text-xs text-muted-foreground mt-1">Félicitations, tous vos loyers ont été encaissés !</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Historique table */}
              <PaymentsTable
                title={`Historique des encaissements — ${range.label}`}
                rows={pageRows}
                tableTab={tableTab} setTableTab={setTableTab}
                search={search} setSearch={setSearch}
                page={page} setPage={setPage} totalPages={totalPages}
                methodByPayment={methodByPayment}
                totalPaid={tableTotalPaid} totalExpected={tableTotalExpected}
                StatusBadge={StatusBadge}
              />
            </div>
          </TabsContent>

          {/* ============= LOYERS ============= */}
          <TabsContent value="rents" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Répartition des loyers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={statusDist.filter(s => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {statusDist.filter(s => s.value > 0).map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Échéances du mois</CardTitle>
                </CardHeader>
                <CardContent>
                  {calendarDays.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Sélectionnez une période bornée pour voir le calendrier.</div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarDays.map(d => (
                        <div key={d.date.toISOString()} className={`aspect-square rounded-md flex flex-col items-center justify-center text-[10px] ${d.count > 0 ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
                          <span className="text-foreground font-medium">{format(d.date, "d")}</span>
                          {d.count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-0.5" />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <PaymentsTable
              title={`Historique des loyers — ${range.label}`}
              rows={pageRows}
              tableTab={tableTab} setTableTab={setTableTab}
              search={search} setSearch={setSearch}
              page={page} setPage={setPage} totalPages={totalPages}
              methodByPayment={methodByPayment}
              totalPaid={tableTotalPaid} totalExpected={tableTotalExpected}
              StatusBadge={StatusBadge}
            />
          </TabsContent>

          {/* ============= DEPENSES ============= */}
          <TabsContent value="expenses" className="space-y-6 mt-6">
            {fExpenses.length === 0 ? (
              <Card className="border-border">
                <CardContent className="py-16 text-center text-muted-foreground">
                  Aucune dépense enregistrée ce mois.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Dépenses par catégorie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ExpenseCategoryChart expenses={fExpenses} />
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Détail des dépenses</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2 px-2">Catégorie</th>
                          <th className="py-2 px-2">Description</th>
                          <th className="py-2 px-2 text-right">Montant</th>
                          <th className="py-2 px-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fExpenses.map(e => (
                          <tr key={e.id} className="border-b border-border/50">
                            <td className="py-2 px-2">{e.expense_categories?.name || "—"}</td>
                            <td className="py-2 px-2 text-muted-foreground">{e.description || "—"}</td>
                            <td className="py-2 px-2 text-right font-medium">{formatFCFA(e.amount)}</td>
                            <td className="py-2 px-2 text-muted-foreground">{format(parseISO(e.expense_date), "dd/MM/yyyy")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ============= RELANCES ============= */}
          <TabsContent value="reminders" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={MailWarning} iconBg="bg-primary" label="Envoyées" value={remindersCount} />
              <KpiCard icon={CheckCircle2} iconBg="bg-success" label="Livrées" value={remindersInPeriod.filter(r => r.status === "sent" || r.status === "delivered").length} />
              <KpiCard icon={MailWarning} iconBg="bg-warning" label="Répondues" value={`${respondedRate}%`} />
              <KpiCard icon={CheckCircle2} iconBg="bg-success" label="Converties" value={fPayments.filter(p => p.status === "paid").length} />
            </div>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Historique des relances</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {remindersInPeriod.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">Aucune relance sur la période.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Séquence</th>
                        <th className="py-2 px-2">Canal</th>
                        <th className="py-2 px-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remindersInPeriod.slice(0, 50).map(r => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-2 px-2 text-muted-foreground">{format(parseISO(r.sent_at), "dd/MM/yyyy HH:mm")}</td>
                          <td className="py-2 px-2">{r.template_key}</td>
                          <td className="py-2 px-2">Email</td>
                          <td className="py-2 px-2"><Badge variant="outline">{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============= BIENS ============= */}
          <TabsContent value="properties" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Performance des biens</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(220, perfByProperty.length * 32)}>
                  <BarChart data={perfByProperty} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" horizontal={false} />
                    <XAxis type="number" tickFormatter={formatShort} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} width={120} />
                    <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="paid" name="CA généré" fill="hsl(160, 84%, 39%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Détail par bien</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-2">Bien</th>
                      <th className="py-2 px-2 text-right">Loyer attendu</th>
                      <th className="py-2 px-2 text-right">CA encaissé</th>
                      <th className="py-2 px-2 text-right">Taux</th>
                      <th className="py-2 px-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfByProperty.map(p => {
                      const rate = p.amount > 0 ? Math.round((p.paid / p.amount) * 100) : 0;
                      return (
                        <tr key={p.name} className="border-b border-border/50">
                          <td className="py-2 px-2 font-medium">{p.name}</td>
                          <td className="py-2 px-2 text-right">{formatFCFA(p.amount)}</td>
                          <td className="py-2 px-2 text-right">{formatFCFA(p.paid)}</td>
                          <td className="py-2 px-2 text-right">{rate}%</td>
                          <td className="py-2 px-2"><StatusBadge status={p.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ---------- Sub-components ----------

function PaymentsTable({ title, rows, tableTab, setTableTab, search, setSearch, page, setPage, totalPages, methodByPayment, totalPaid, totalExpected, StatusBadge }: any) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {[
                { v: "all", l: "Tous" },
                { v: "paid", l: "Payé" },
                { v: "pending", l: "En attente" },
                { v: "late", l: "Impayé" },
              ].map(t => (
                <button
                  key={t.v}
                  onClick={() => setTableTab(t.v)}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${tableTab === t.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-7 h-8 w-44" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 px-2">Locataire</th>
              <th className="py-2 px-2">Bien</th>
              <th className="py-2 px-2 text-right">Montant</th>
              <th className="py-2 px-2">Méthode</th>
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Aucun encaissement.</td></tr>
            )}
            {rows.map((p: any) => {
              const method = methodByPayment.get(p.id) || "—";
              const bgClass = p.status === "pending" || p.status === "partial" ? "bg-warning/5" : p.status === "late" ? "bg-destructive/5" : "";
              const methodColor = METHOD_COLORS[method] || "bg-muted-foreground/30";
              return (
                <tr key={p.id} className={`border-b border-border/50 ${bgClass}`}>
                  <td className="py-2 px-2 font-medium">{p.tenants?.full_name || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{p.tenants?.units?.properties?.name || "—"}</td>
                  <td className="py-2 px-2 text-right font-medium">{new Intl.NumberFormat("fr-CI").format(p.paid_amount || 0)} FCFA</td>
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${methodColor}`} />
                      <span className="text-xs">{method}</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{format(parseISO(p.due_date), "dd/MM/yyyy")}</td>
                  <td className="py-2 px-2"><StatusBadge status={p.status} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td colSpan={2} className="py-2 px-2 text-xs text-muted-foreground">
                Total encaissé : <strong className="text-success">{new Intl.NumberFormat("fr-CI").format(totalPaid)} FCFA</strong>
                <span className="mx-2">·</span>
                Total attendu : <strong className="text-foreground">{new Intl.NumberFormat("fr-CI").format(totalExpected)} FCFA</strong>
              </td>
              <td colSpan={4} className="py-2 px-2 text-right text-xs">
                <span className="text-muted-foreground mr-2">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 rounded border border-border disabled:opacity-40 mr-1">‹</button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded border border-border disabled:opacity-40">›</button>
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

function ExpenseCategoryChart({ expenses }: { expenses: any[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const k = e.expense_categories?.name || "Autre";
      map.set(k, (map.get(k) || 0) + e.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);
  const COLORS = ["hsl(160, 84%, 39%)", "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)", "hsl(190, 70%, 50%)"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${new Intl.NumberFormat("fr-CI").format(v)} FCFA`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
