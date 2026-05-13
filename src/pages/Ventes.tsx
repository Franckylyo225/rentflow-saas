import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Building2, TrendingUp, Coins, Trophy, Plus, Pencil, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Search, ChevronLeft, ChevronRight, Download, Sparkles, Clock, Filter, Receipt,
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureLockedCard } from "@/components/auth/FeatureLockedCard";
import {
  usePropertySales, SALES_COMMISSION_RATE,
  type SaleListing, type ListingStatus, type PropertyType, type SaleRecord,
} from "@/hooks/usePropertySales";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ----------------------------- helpers ----------------------------- */

function fmtFCFA(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} Md FCFA`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M FCFA`;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}
function fmt(n: number) { return n.toLocaleString("fr-FR"); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

const PROPERTY_TYPES: { value: PropertyType; label: string; emoji: string; bg: string; text: string }[] = [
  { value: "villa", label: "Villa", emoji: "🏡", bg: "bg-success/15", text: "text-success" },
  { value: "appartement", label: "Appartement", emoji: "🏢", bg: "bg-info/15", text: "text-info" },
  { value: "studio", label: "Studio", emoji: "🛏️", bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400" },
  { value: "duplex", label: "Duplex", emoji: "🏘️", bg: "bg-warning/15", text: "text-warning" },
  { value: "local", label: "Local commercial", emoji: "🏬", bg: "bg-muted", text: "text-muted-foreground" },
  { value: "terrain", label: "Terrain", emoji: "🌿", bg: "bg-emerald-700/15", text: "text-emerald-700 dark:text-emerald-400" },
];
function typeMeta(t: PropertyType) {
  return PROPERTY_TYPES.find(p => p.value === t) ?? PROPERTY_TYPES[0];
}

function isNewListing(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  return days < 7;
}

function ListingStatusBadge({ status, listedAt }: { status: ListingStatus; listedAt: string }) {
  if (status === "en_vente" && isNewListing(listedAt)) {
    return (
      <Badge variant="outline" className="bg-info/10 text-info border-info/30 gap-1">
        <Sparkles className="h-3 w-3" /> Nouveau
      </Badge>
    );
  }
  if (status === "en_vente") {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
        </span>
        En vente
      </Badge>
    );
  }
  if (status === "offre") {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
        <Clock className="h-3 w-3" /> Offre en cours
      </Badge>
    );
  }
  return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Suspendu</Badge>;
}

function SaleStatusBadge({ status }: { status: SaleRecord["status"] }) {
  if (status === "finalise") return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20" variant="outline">Finalisé</Badge>;
  if (status === "notaire") return <Badge className="bg-info/15 text-info border-info/30 hover:bg-info/20" variant="outline">En cours notaire</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" variant="outline">Annulé</Badge>;
}

function PropertyThumb({ type, size = 38 }: { type: PropertyType; size?: number }) {
  const m = typeMeta(type);
  return (
    <div
      className={cn("flex items-center justify-center rounded-lg shrink-0 text-base", m.bg, m.text)}
      style={{ width: size, height: size }}
      aria-label={m.label}
    >
      <span>{m.emoji}</span>
    </div>
  );
}

function buyerColor(name: string) {
  const palette = ["bg-success/20 text-success", "bg-info/20 text-info", "bg-warning/20 text-warning", "bg-purple-500/20 text-purple-600 dark:text-purple-400", "bg-pink-500/20 text-pink-600 dark:text-pink-400"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
function BuyerAvatar({ name }: { name: string }) {
  const initials = (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={cn("inline-flex items-center justify-center rounded-full text-[10px] font-semibold shrink-0", buyerColor(name))} style={{ width: 22, height: 22 }}>
        {initials}
      </span>
      <span className="truncate">{name || "—"}</span>
    </div>
  );
}

/* ----------------------------- KPI Card ----------------------------- */

function KpiCard({
  title, value, subtitle, subtitle2, icon: Icon, trend, accentColor, helpText,
}: {
  title: string;
  value: string;
  subtitle?: string;
  subtitle2?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean } | null;
  accentColor: string; // tailwind utility for icon bg/text and accent circle
  helpText?: string;
}) {
  return (
    <Card className="border-border relative overflow-hidden">
      <div
        aria-hidden
        className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]", accentColor)}
      />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between gap-3">
          {helpText ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">{title}</p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">{helpText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          )}
          <div className={cn("flex items-center justify-center rounded-lg", accentColor)} style={{ width: 36, height: 36 }}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-[22px] font-medium text-card-foreground tracking-tight mt-2 leading-tight">{value}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        {subtitle2 && <p className="text-[11px] text-muted-foreground/70">{subtitle2}</p>}
        {trend && (
          <div className={cn("inline-flex items-center gap-0.5 text-xs font-semibold mt-2", trend.positive ? "text-success" : "text-destructive")}>
            {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== PAGE ============================== */

export default function Ventes() {
  const navigate = useNavigate();
  const { hasFeature, planName, loading } = useFeatureAccess();
  const allowed = loading || hasFeature("property_sales");

  const { listings, sales, addListing, updateListing, removeListing, recordSale } = usePropertySales();

  const [addOpen, setAddOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);
  const [editing, setEditing] = useState<SaleListing | null>(null);
  const [deleting, setDeleting] = useState<SaleListing | null>(null);
  const [detail, setDetail] = useState<SaleListing | null>(null);

  const PAGE_SIZE = 5;
  const [listingsSearch, setListingsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingStatus>("all");
  const [listingsPage, setListingsPage] = useState(1);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);

  // Keep the open detail sheet in sync with fresh data
  useEffect(() => {
    if (!detail) return;
    const fresh = listings.find(l => l.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
  }, [listings, detail]);

  const filteredListings = useMemo(() => {
    const q = listingsSearch.trim().toLowerCase();
    return listings.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
    });
  }, [listings, listingsSearch, statusFilter]);

  const filteredSales = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.buyerName.toLowerCase().includes(q)
    );
  }, [sales, salesSearch]);

  const listingsTotalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const salesTotalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safeListingsPage = Math.min(listingsPage, listingsTotalPages);
  const safeSalesPage = Math.min(salesPage, salesTotalPages);
  const pagedListings = filteredListings.slice((safeListingsPage - 1) * PAGE_SIZE, safeListingsPage * PAGE_SIZE);
  const pagedSales = filteredSales.slice((safeSalesPage - 1) * PAGE_SIZE, safeSalesPage * PAGE_SIZE);

  /* -------- KPI calcs -------- */
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const finalisedSales = useMemo(() => sales.filter(s => s.status === "finalise"), [sales]);
  const monthSales = useMemo(() => finalisedSales.filter(s => s.saleDate.slice(0, 7) === currentMonth).reduce((a, s) => a + s.salePrice, 0), [finalisedSales, currentMonth]);
  const prevMonthSales = useMemo(() => finalisedSales.filter(s => s.saleDate.slice(0, 7) === prevMonth).reduce((a, s) => a + s.salePrice, 0), [finalisedSales, prevMonth]);
  const totalSales = useMemo(() => finalisedSales.reduce((a, s) => a + s.salePrice, 0), [finalisedSales]);
  const monthCommissions = Math.round(monthSales * SALES_COMMISSION_RATE);
  const totalCommissions = useMemo(() => finalisedSales.reduce((a, s) => a + s.commission, 0), [finalisedSales]);

  const variation = useMemo(() => {
    if (prevMonthSales === 0 && monthSales === 0) return null;
    if (prevMonthSales === 0) return { pct: 100, dir: "up" as const };
    const v = Math.round(((monthSales - prevMonthSales) / prevMonthSales) * 100);
    return { pct: Math.abs(v), dir: v >= 0 ? "up" as const : "down" as const };
  }, [monthSales, prevMonthSales]);

  const activeListingsThisMonth = listings.filter(l => l.listedAt.slice(0, 7) === currentMonth).length;
  const activeListings = listings.filter(l => l.status === "en_vente" || l.status === "offre").length;

  /* -------- Funnel -------- */
  const mandatesActifs = listings.filter(l => l.status === "en_vente").length;
  const visitsThisMonth = listings.reduce((a, l) => a + (l.visitsCount || 0), 0);
  const offresRecues = listings.filter(l => l.status === "offre").length;
  const ventesFinalisees = finalisedSales.filter(s => s.saleDate.slice(0, 7) === currentMonth).length;
  const conversionRate = visitsThisMonth > 0 ? ((ventesFinalisees / visitsThisMonth) * 100).toFixed(1) : "—";

  const funnelTotal = Math.max(1, mandatesActifs + visitsThisMonth + offresRecues + ventesFinalisees);
  const funnelSeg = [
    { value: mandatesActifs, color: "bg-success" },
    { value: visitsThisMonth, color: "bg-info" },
    { value: offresRecues, color: "bg-warning" },
    { value: ventesFinalisees, color: "bg-purple-500" },
  ];

  /* -------- Helpers UI -------- */
  function openSellFromListing(l: SaleListing) {
    setSelectedListingId(l.id);
    setPrefilledPrice(l.askingPrice);
    setSellOpen(true);
  }
  function openSellFromTopbar() {
    setSelectedListingId("");
    setPrefilledPrice(null);
    setSellOpen(true);
  }

  function exportSalesCSV() {
    const rows = [
      ["Bien", "Localisation", "Prix de vente (FCFA)", "Date de vente", "Acheteur", "Commission (FCFA)", "Statut"],
      ...sales.map(s => [s.name, s.location, String(s.salePrice), s.saleDate, s.buyerName, String(s.commission), s.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique-ventes-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  function exportSalesPDF() {
    // Use the print dialog as a lightweight PDF export to avoid new deps.
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const html = `
      <html><head><title>Historique des ventes</title>
      <style>body{font-family:Arial;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}</style>
      </head><body>
      <h1>Historique des ventes — ${new Date().toLocaleDateString("fr-FR")}</h1>
      <table><thead><tr><th>Bien</th><th>Localisation</th><th>Prix</th><th>Date</th><th>Acheteur</th><th>Commission</th><th>Statut</th></tr></thead>
      <tbody>${sales.map(s => `<tr><td>${s.name}</td><td>${s.location}</td><td>${fmt(s.salePrice)} FCFA</td><td>${fmtDate(s.saleDate)}</td><td>${s.buyerName}</td><td>${fmt(s.commission)} FCFA</td><td>${s.status}</td></tr>`).join("")}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`;
    w.document.write(html); w.document.close();
  }

  if (!allowed) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ventes de biens</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez vos mandats de vente et suivez vos transactions</p>
          </div>
          <FeatureLockedCard
            title="Module Ventes Immobilières"
            description="Cette fonctionnalité est disponible à partir du plan Pro."
            requiredPlan="Pro"
          />
        </div>
      </AppLayout>
    );
  }

  const isPro = (planName || "").toLowerCase().includes("pro") && !(planName || "").toLowerCase().includes("business");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* TOPBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ventes de biens</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez vos mandats de vente et suivez vos transactions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportSalesCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter un bien
            </Button>
            <Button onClick={openSellFromTopbar} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="h-4 w-4" /> Enregistrer une vente
            </Button>
          </div>
        </div>

        {/* SECTION 1 — KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Actifs en vente"
            value={String(activeListings)}
            subtitle={`${activeListings} bien${activeListings > 1 ? "s" : ""} actif${activeListings > 1 ? "s" : ""}`}
            icon={Building2}
            accentColor="bg-success"
            trend={activeListingsThisMonth > 0 ? { value: `+${activeListingsThisMonth} ce mois`, positive: true } : null}
          />
          <KpiCard
            title="Ventes ce mois"
            value={fmtFCFA(monthSales)}
            subtitle="FCFA encaissés"
            icon={TrendingUp}
            accentColor="bg-info"
            trend={variation ? { value: `${variation.pct}% vs mois précédent`, positive: variation.dir === "up" } : null}
          />
          <KpiCard
            title="Commissions"
            value={fmtFCFA(monthCommissions)}
            subtitle="FCFA ce mois (5%)"
            icon={Coins}
            accentColor="bg-warning"
            helpText="Commission agence calculée à 5% du prix de vente final"
            trend={variation ? { value: `${variation.pct}% vs mois précédent`, positive: variation.dir === "up" } : null}
          />
          <KpiCard
            title="CA total des ventes"
            value={fmtFCFA(totalSales)}
            subtitle="FCFA depuis le début"
            subtitle2={`Cumul ${now.getFullYear()}`}
            icon={Trophy}
            accentColor="bg-purple-500"
          />
        </div>

        {/* SECTION 2 — FUNNEL */}
        <Card className="border-border hidden md:block">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Mandats actifs", value: mandatesActifs, color: "text-success" },
                { label: "Visites ce mois", value: visitsThisMonth, color: "text-info" },
                { label: "Offres reçues", value: offresRecues, color: "text-warning" },
                { label: "Ventes finalisées", value: ventesFinalisees, color: "text-purple-600 dark:text-purple-400" },
              ].map(c => (
                <div key={c.label}>
                  <p className={cn("text-[18px] font-medium leading-none", c.color)}>{c.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-muted">
              {funnelSeg.map((s, i) => (
                <div key={i} className={cn("h-full", s.color)} style={{ width: `${(Math.max(0, s.value) / funnelTotal) * 100}%` }} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Entonnoir de vente · Taux de conversion visites → vente : <span className="font-medium text-foreground">{conversionRate}{conversionRate !== "—" ? "%" : ""}</span>
            </p>
          </CardContent>
        </Card>

        {/* SECTION 3 — LISTINGS TABLE */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
              <h2 className="text-base font-semibold text-card-foreground">Biens à vendre ({filteredListings.length})</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={listingsSearch}
                    onChange={(e) => { setListingsSearch(e.target.value); setListingsPage(1); }}
                    placeholder="Rechercher un bien…"
                    className="pl-8 h-9 w-full sm:w-56"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      <Filter className="h-3.5 w-3.5" /> Filtrer
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tous les statuts</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("en_vente")}>En vente</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("offre")}>Offre en cours</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("suspendu")}>Suspendu</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={() => setAddOpen(true)} className="h-9 gap-1.5 bg-success/15 text-success hover:bg-success/25 border border-success/30">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
            </div>

            {pagedListings.length === 0 && filteredListings.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {listings.length === 0 ? "Aucun bien à vendre pour le moment" : "Aucun bien ne correspond aux filtres"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {listings.length === 0
                    ? "Ajoutez votre premier mandat de vente pour commencer à suivre vos transactions."
                    : "Essayez de modifier vos critères de recherche."}
                </p>
                {listings.length === 0 && (
                  <Button onClick={() => setAddOpen(true)} className="mt-4 gap-2 bg-success hover:bg-success/90 text-success-foreground">
                    <Plus className="h-4 w-4" /> Ajouter votre premier bien
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bien</TableHead>
                        <TableHead className="text-right">Prix demandé</TableHead>
                        <TableHead>Ajouté le</TableHead>
                        <TableHead>Visites</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedListings.map(l => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <PropertyThumb type={l.propertyType} />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{l.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{l.location || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold whitespace-nowrap">{fmt(l.askingPrice)} FCFA</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(l.listedAt)}</TableCell>
                          <TableCell>
                            <InlineVisitsCell
                              value={l.visitsCount}
                              onSave={(n) => updateListing(l.id, { visitsCount: n })}
                            />
                          </TableCell>
                          <TableCell><ListingStatusBadge status={l.status} listedAt={l.listedAt} /></TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setDetail(l)}>Détail</Button>
                              <Button size="sm" className="h-8 gap-1 bg-success/15 text-success hover:bg-success/25 border border-success/30" onClick={() => openSellFromListing(l)}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Marquer vendu
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredListings.length > 0 && (
                  <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {safeListingsPage} sur {listingsTotalPages} — {filteredListings.length} bien{filteredListings.length > 1 ? "s" : ""}
                    </p>
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={safeListingsPage <= 1} onClick={() => setListingsPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-3.5 w-3.5" /> Préc.
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={safeListingsPage >= listingsTotalPages} onClick={() => setListingsPage(p => Math.min(listingsTotalPages, p + 1))}>
                        Suiv. <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4 — SALES HISTORY */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
              <h2 className="text-base font-semibold text-card-foreground">Historique des ventes ({filteredSales.length})</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={salesSearch}
                    onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
                    placeholder="Rechercher (bien, acheteur…)"
                    className="pl-8 h-9 w-full sm:w-56"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportSalesPDF} className="h-9 gap-1.5">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>

            {pagedSales.length === 0 && filteredSales.length === 0 ? (
              <div className="p-10 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {sales.length === 0 ? "Aucune vente enregistrée" : "Aucune vente ne correspond à votre recherche"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {sales.length === 0
                    ? "Vos transactions apparaîtront ici dès qu'une vente sera finalisée."
                    : "Essayez de modifier votre recherche."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bien vendu</TableHead>
                        <TableHead className="text-right">Prix final</TableHead>
                        <TableHead>Date de vente</TableHead>
                        <TableHead>Acheteur</TableHead>
                        <TableHead className="text-right">Commission 5%</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedSales.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <PropertyThumb type="villa" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.location || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold whitespace-nowrap">{fmt(s.salePrice)} FCFA</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(s.saleDate)}</TableCell>
                          <TableCell><BuyerAvatar name={s.buyerName} /></TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium" style={{ color: "#22C55E" }}>{fmt(s.commission)} FCFA</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Commission agence (5% du prix final)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell><SaleStatusBadge status={s.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-secondary border-t border-border">
                  <p className="text-[11px] text-muted-foreground">Total commissions encaissées</p>
                  <p className="text-[13px] font-medium" style={{ color: "#22C55E" }}>{fmt(totalCommissions)} FCFA</p>
                </div>

                {filteredSales.length > 0 && (
                  <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {safeSalesPage} sur {salesTotalPages} — {filteredSales.length} vente{filteredSales.length > 1 ? "s" : ""}
                    </p>
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={safeSalesPage <= 1} onClick={() => setSalesPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-3.5 w-3.5" /> Préc.
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={safeSalesPage >= salesTotalPages} onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}>
                        Suiv. <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5 — UPSELL BUSINESS */}
        {isPro && (
          <div
            className="rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ background: "#0F2942", padding: "16px 20px" }}
          >
            <div className="space-y-1">
              <span
                className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold"
                style={{ background: "rgba(34,197,94,.15)", color: "#9EF01A" }}
              >
                Business
              </span>
              <p className="text-[14px] font-medium text-white">Diffusez vos mandats sur les portails partenaires</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,.5)" }}>
                Plan Business : publication automatique sur proimmo.ci, immoneuf.ci et votre site agence — depuis Rentflow.
              </p>
            </div>
            <Button
              onClick={() => navigate("/pricing")}
              className="text-white shrink-0"
              style={{ background: "#22C55E" }}
            >
              Découvrir le plan Business →
            </Button>
          </div>
        )}
      </div>

      {/* DIALOGS / SHEETS */}
      <AddListingDialog open={addOpen} onOpenChange={setAddOpen} onAdd={(d) => { addListing(d); toast.success("Bien ajouté à la liste"); }} />
      <RecordSaleDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        listings={listings}
        defaultListingId={selectedListingId}
        defaultPrice={prefilledPrice}
        onConfirm={(listingId, data) => {
          recordSale(listingId, data);
          toast.success(`Vente enregistrée — +${fmt(data.salePrice)} FCFA ajouté au CA ✅`);
        }}
      />
      <EditListingDialog
        listing={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSave={(id, data) => { updateListing(id, data); toast.success("Bien mis à jour"); setEditing(null); }}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de retirer <span className="font-semibold text-foreground">{deleting?.name}</span> de la liste. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) { removeListing(deleting.id); toast.success("Bien retiré"); }
                setDeleting(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DETAIL DRAWER */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <PropertyThumb type={detail.propertyType} size={44} />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left">{detail.name}</SheetTitle>
                    <div className="mt-1"><ListingStatusBadge status={detail.status} listedAt={detail.listedAt} /></div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <section className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Informations</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Localisation</p><p className="font-medium">{detail.location || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{typeMeta(detail.propertyType).label}</p></div>
                    <div><p className="text-xs text-muted-foreground">Prix demandé</p><p className="font-medium">{fmt(detail.askingPrice)} FCFA</p></div>
                    <div><p className="text-xs text-muted-foreground">Mis en vente</p><p className="font-medium">{fmtDate(detail.listedAt)}</p></div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Nombre de visites</p>
                      <InlineVisitsCell value={detail.visitsCount} onSave={(n) => updateListing(detail.id, { visitsCount: n })} />
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Historique de ce bien</h3>
                  <ol className="border-l border-border pl-4 space-y-3">
                    <li className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-success" />
                      <p className="text-sm">Ajouté le <span className="font-medium">{fmtDate(detail.listedAt)}</span></p>
                    </li>
                    {detail.visitsCount > 0 && (
                      <li className="relative">
                        <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-info" />
                        <p className="text-sm">{detail.visitsCount} visite{detail.visitsCount > 1 ? "s" : ""} enregistrée{detail.visitsCount > 1 ? "s" : ""}</p>
                      </li>
                    )}
                    {detail.status === "offre" && (
                      <li className="relative">
                        <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-warning" />
                        <p className="text-sm">Offre reçue — en cours de négociation</p>
                      </li>
                    )}
                  </ol>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => { setEditing(detail); setDetail(null); }}>
                      <Pencil className="h-3.5 w-3.5" /> Modifier le prix
                    </Button>
                    <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => { openSellFromListing(detail); setDetail(null); }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marquer vendu
                    </Button>
                    {detail.status !== "suspendu" ? (
                      <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => { updateListing(detail.id, { status: "suspendu" }); toast.success("Mandat suspendu"); }}>
                        Suspendre le mandat
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => { updateListing(detail.id, { status: "en_vente" }); toast.success("Mandat réactivé"); }}>
                        Réactiver le mandat
                      </Button>
                    )}
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleting(detail); setDetail(null); }}>
                      Supprimer définitivement
                    </Button>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ----------------------------- Inline visits cell ----------------------------- */

function InlineVisitsCell({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));

  useEffect(() => { setV(String(value)); }, [value]);

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        min={0}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); const n = Math.max(0, Number(v) || 0); if (n !== value) onSave(n); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(String(value)); setEditing(false); } }}
        className="h-8 w-20"
      />
    );
  }

  if (value === 0) {
    return (
      <button onClick={() => setEditing(true)} className="text-left">
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border hover:bg-muted/80">Aucune visite</Badge>
      </button>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-left text-sm hover:underline">
      <span className="font-medium">{value}</span> <span className="text-muted-foreground">visite{value > 1 ? "s" : ""}</span>
    </button>
  );
}

/* ----------------------------- Add Listing Dialog ----------------------------- */

function AddListingDialog({
  open, onOpenChange, onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (d: { name: string; location: string; askingPrice: number; listedAt: string; propertyType: PropertyType }) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<PropertyType>("villa");

  function reset() { setName(""); setLocation(""); setPrice(""); setDate(todayISO()); setType("villa"); }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Ajouter un bien à vendre</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sname">Nom du bien</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Villa F4 Cocody" />
          </div>
          <div className="space-y-1.5">
            <Label>Type de bien</Label>
            <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.emoji} {p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sloc">Localisation / Quartier</Label>
            <Input id="sloc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Cocody Angré" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sprice">Prix de vente demandé (FCFA)</Label>
            <Input id="sprice" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 50000000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sdate">Date de mise en vente</Label>
            <Input id="sdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!name || !location || !price || !date}
            onClick={() => {
              onAdd({ name, location, askingPrice: Number(price) || 0, listedAt: date, propertyType: type });
              onOpenChange(false);
              reset();
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Record Sale Dialog ----------------------------- */

function RecordSaleDialog({
  open, onOpenChange, listings, defaultListingId, defaultPrice, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listings: SaleListing[];
  defaultListingId: string;
  defaultPrice: number | null;
  onConfirm: (listingId: string, data: { salePrice: number; saleDate: string; buyerName: string; commission: number }) => void;
}) {
  const [listingId, setListingId] = useState(defaultListingId);
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "");
  const [date, setDate] = useState(todayISO());
  const [buyer, setBuyer] = useState("");
  const [commission, setCommission] = useState(defaultPrice ? Math.round(defaultPrice * SALES_COMMISSION_RATE).toString() : "");
  const [commissionEdited, setCommissionEdited] = useState(false);

  if (open && defaultListingId !== listingId && defaultListingId) {
    setListingId(defaultListingId);
    if (defaultPrice != null) {
      setPrice(defaultPrice.toString());
      setCommission(Math.round(defaultPrice * SALES_COMMISSION_RATE).toString());
      setCommissionEdited(false);
    }
  }

  function handlePriceChange(v: string) {
    setPrice(v);
    if (!commissionEdited) {
      const n = Number(v) || 0;
      setCommission(Math.round(n * SALES_COMMISSION_RATE).toString());
    }
  }

  function reset() {
    setListingId(""); setPrice(""); setDate(todayISO()); setBuyer(""); setCommission(""); setCommissionEdited(false);
  }

  const commissionValid = Number(commission) > 0 && Number(price) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Enregistrer une vente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bien vendu</Label>
            <Select value={listingId} onValueChange={(v) => {
              setListingId(v);
              const l = listings.find(x => x.id === v);
              if (l && !commissionEdited) {
                setPrice(l.askingPrice.toString());
                setCommission(Math.round(l.askingPrice * SALES_COMMISSION_RATE).toString());
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un bien en vente" /></SelectTrigger>
              <SelectContent>
                {listings.length === 0 ? (
                  <SelectItem value="none" disabled>Aucun bien en vente</SelectItem>
                ) : listings.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — {fmt(l.askingPrice)} FCFA</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vprice">Prix de vente final (FCFA)</Label>
            <Input id="vprice" type="number" value={price} onChange={(e) => handlePriceChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vdate">Date de vente</Label>
            <Input id="vdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vbuyer">Nom de l'acheteur</Label>
            <Input id="vbuyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Ex: Kouassi Amani" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vcom">Commission agence (calculée à 5%)</Label>
            <Input
              id="vcom"
              type="number"
              value={commission}
              onChange={(e) => { setCommission(e.target.value); setCommissionEdited(true); }}
              className={cn(commissionValid && "bg-success/10 border-success/40")}
            />
            <p className="text-[11px] text-muted-foreground">
              Calculée automatiquement à 5% du prix de vente — modifiable si besoin.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!listingId || !price || !date || !buyer}
            onClick={() => {
              onConfirm(listingId, {
                salePrice: Number(price) || 0,
                saleDate: date,
                buyerName: buyer,
                commission: Number(commission) || 0,
              });
              onOpenChange(false);
              reset();
            }}
          >
            Confirmer la vente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Edit Listing Dialog ----------------------------- */

function EditListingDialog({
  listing, onOpenChange, onSave,
}: {
  listing: SaleListing | null;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, data: { name: string; location: string; askingPrice: number; listedAt: string; propertyType: PropertyType }) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<PropertyType>("villa");

  useMemo(() => {
    if (listing) {
      setName(listing.name);
      setLocation(listing.location);
      setPrice(listing.askingPrice.toString());
      setDate(listing.listedAt);
      setType(listing.propertyType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  return (
    <Dialog open={!!listing} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Modifier le bien</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ename">Nom du bien</Label>
            <Input id="ename" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Type de bien</Label>
            <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.emoji} {p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eloc">Localisation / Quartier</Label>
            <Input id="eloc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eprice">Prix de vente demandé (FCFA)</Label>
            <Input id="eprice" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edate">Date de mise en vente</Label>
            <Input id="edate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!listing || !name || !location || !price || !date}
            onClick={() => {
              if (!listing) return;
              onSave(listing.id, { name, location, askingPrice: Number(price) || 0, listedAt: date, propertyType: type });
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
