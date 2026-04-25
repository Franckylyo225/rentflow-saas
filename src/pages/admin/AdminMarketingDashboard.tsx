import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MousePointerClick, Eye, Users, TrendingUp, Send, Activity, Target } from "lucide-react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Period = "7d" | "30d" | "90d" | "all";

interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
}

interface EventRow {
  id: string;
  campaign_id: string;
  event_type: string;
  created_at: string;
}

interface ContactRow {
  id: string;
  status: string;
  source: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "hsl(160, 84%, 39%)",
  sending: "hsl(38, 92%, 50%)",
  draft: "hsl(220, 9%, 60%)",
  failed: "hsl(0, 72%, 51%)",
};

const SOURCE_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(210, 100%, 52%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 55%)",
  "hsl(340, 75%, 55%)",
];

function periodToDays(p: Period): number | null {
  if (p === "7d") return 7;
  if (p === "30d") return 30;
  if (p === "90d") return 90;
  return null;
}

export default function AdminMarketingDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);

  const sinceIso = useMemo(() => {
    const days = periodToDays(period);
    if (days == null) return null;
    return startOfDay(subDays(new Date(), days)).toISOString();
  }, [period]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      let cQ = supabase.from("marketing_campaigns")
        .select("id,name,subject,status,sent_at,created_at,total_recipients,total_sent,total_failed,total_opened,total_clicked")
        .order("created_at", { ascending: false });
      let eQ = supabase.from("campaign_events")
        .select("id,campaign_id,event_type,created_at")
        .order("created_at", { ascending: true });
      let ctQ = supabase.from("marketing_contacts")
        .select("id,status,source,created_at");
      if (sinceIso) {
        cQ = cQ.gte("created_at", sinceIso);
        eQ = eQ.gte("created_at", sinceIso);
        ctQ = ctQ.gte("created_at", sinceIso);
      }
      const [c, e, ct] = await Promise.all([cQ, eQ, ctQ]);
      if (!mounted) return;
      setCampaigns((c.data ?? []) as CampaignRow[]);
      setEvents((e.data ?? []) as EventRow[]);
      setContacts((ct.data ?? []) as ContactRow[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [sinceIso]);

  // KPIs
  const kpis = useMemo(() => {
    const sent = campaigns.reduce((s, c) => s + (c.total_sent ?? 0), 0);
    const opened = campaigns.reduce((s, c) => s + (c.total_opened ?? 0), 0);
    const clicked = campaigns.reduce((s, c) => s + (c.total_clicked ?? 0), 0);
    const recipients = campaigns.reduce((s, c) => s + (c.total_recipients ?? 0), 0);
    const failed = campaigns.reduce((s, c) => s + (c.total_failed ?? 0), 0);
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const ctr = opened > 0 ? (clicked / opened) * 100 : 0;
    const deliveryRate = recipients > 0 ? (sent / recipients) * 100 : 0;
    const conversions = contacts.filter(c => c.status === "converted").length;
    const totalContacts = contacts.length;
    const conversionRate = totalContacts > 0 ? (conversions / totalContacts) * 100 : 0;
    const activeCampaigns = campaigns.filter(c => c.status === "sending" || c.status === "sent").length;
    return {
      sent, opened, clicked, recipients, failed,
      openRate, clickRate, ctr, deliveryRate,
      conversions, totalContacts, conversionRate, activeCampaigns,
    };
  }, [campaigns, contacts]);

  // Time series — events per day (opens/clicks)
  const timeSeries = useMemo(() => {
    const days = periodToDays(period) ?? 90;
    const buckets: Record<string, { date: string; opens: number; clicks: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      buckets[d] = { date: d, opens: 0, clicks: 0 };
    }
    events.forEach(ev => {
      const d = format(parseISO(ev.created_at), "yyyy-MM-dd");
      if (!buckets[d]) buckets[d] = { date: d, opens: 0, clicks: 0 };
      if (ev.event_type === "open") buckets[d].opens += 1;
      else if (ev.event_type === "click") buckets[d].clicks += 1;
    });
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [events, period]);

  // Campaigns performance — top 8 by sent
  const campaignsBar = useMemo(() => {
    return [...campaigns]
      .filter(c => (c.total_sent ?? 0) > 0)
      .sort((a, b) => (b.total_sent ?? 0) - (a.total_sent ?? 0))
      .slice(0, 8)
      .map(c => ({
        name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
        openRate: c.total_sent ? Math.round((c.total_opened / c.total_sent) * 100) : 0,
        clickRate: c.total_sent ? Math.round((c.total_clicked / c.total_sent) * 100) : 0,
      }));
  }, [campaigns]);

  // Contact sources distribution
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => { map[c.source] = (map[c.source] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [contacts]);

  // Funnel — recipients → sent → opened → clicked → converted
  const funnel = useMemo(() => ([
    { stage: "Destinataires", value: kpis.recipients, color: "hsl(220, 9%, 60%)" },
    { stage: "Envoyés", value: kpis.sent, color: "hsl(210, 100%, 52%)" },
    { stage: "Ouverts", value: kpis.opened, color: "hsl(38, 92%, 50%)" },
    { stage: "Cliqués", value: kpis.clicked, color: "hsl(280, 65%, 55%)" },
    { stage: "Convertis", value: kpis.conversions, color: "hsl(160, 84%, 39%)" },
  ]), [kpis]);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header + period filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Marketing</h1>
            <p className="text-sm text-muted-foreground">Performance des campagnes email et engagement des contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="7d">7 jours</TabsTrigger>
                <TabsTrigger value="30d">30 jours</TabsTrigger>
                <TabsTrigger value="90d">90 jours</TabsTrigger>
                <TabsTrigger value="all">Tout</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Send} label="Emails envoyés" value={kpis.sent.toLocaleString()} sub={`${kpis.failed} échecs`} variant="info" />
          <KpiCard icon={Eye} label="Taux d'ouverture" value={`${kpis.openRate.toFixed(1)}%`} sub={`${kpis.opened.toLocaleString()} ouvertures`} variant="warning" />
          <KpiCard icon={MousePointerClick} label="Taux de clic" value={`${kpis.clickRate.toFixed(1)}%`} sub={`${kpis.clicked.toLocaleString()} clics`} variant="primary" />
          <KpiCard icon={Target} label="Conversions" value={`${kpis.conversionRate.toFixed(1)}%`} sub={`${kpis.conversions} / ${kpis.totalContacts} contacts`} variant="success" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Activity} label="Campagnes actives" value={String(kpis.activeCampaigns)} sub={`${campaigns.length} au total`} variant="primary" />
          <KpiCard icon={TrendingUp} label="CTR (cliqués/ouverts)" value={`${kpis.ctr.toFixed(1)}%`} sub="Engagement après ouverture" variant="warning" />
          <KpiCard icon={Mail} label="Délivrabilité" value={`${kpis.deliveryRate.toFixed(1)}%`} sub={`${kpis.recipients.toLocaleString()} destinataires`} variant="info" />
          <KpiCard icon={Users} label="Nouveaux contacts" value={kpis.totalContacts.toLocaleString()} sub="Sur la période" variant="success" />
        </div>

        {/* Engagement chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement dans le temps</CardTitle>
            <CardDescription>Ouvertures et clics par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                opens: { label: "Ouvertures", color: "hsl(38, 92%, 50%)" },
                clicks: { label: "Clics", color: "hsl(280, 65%, 55%)" },
              }}
              className="h-[280px] w-full"
            >
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), "d MMM", { locale: fr })}
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <ChartTooltip
                  content={<ChartTooltipContent
                    labelFormatter={(d) => format(parseISO(d as string), "d MMMM yyyy", { locale: fr })}
                  />}
                />
                <Legend />
                <Area type="monotone" dataKey="opens" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fill="url(#gOpens)" name="Ouvertures" />
                <Area type="monotone" dataKey="clicks" stroke="hsl(280, 65%, 55%)" strokeWidth={2} fill="url(#gClicks)" name="Clics" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Funnel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Entonnoir de conversion</CardTitle>
              <CardDescription>Du destinataire au contact converti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((row, i) => {
                  const max = funnel[0].value || 1;
                  const pct = (row.value / max) * 100;
                  const dropFromPrev = i > 0 && funnel[i - 1].value > 0
                    ? Math.round((row.value / funnel[i - 1].value) * 100)
                    : null;
                  return (
                    <div key={row.stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{row.stage}</span>
                        <span className="text-muted-foreground">
                          {row.value.toLocaleString()}
                          {dropFromPrev != null && <span className="ml-2 text-muted-foreground/70">({dropFromPrev}%)</span>}
                        </span>
                      </div>
                      <div className="h-8 rounded-md bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sources de contacts</CardTitle>
              <CardDescription>Origine des leads</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Aucun contact sur la période</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaigns performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance par campagne</CardTitle>
            <CardDescription>Taux d'ouverture et de clic par campagne (top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsBar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune campagne envoyée sur la période</p>
            ) : (
              <ChartContainer
                config={{
                  openRate: { label: "Taux d'ouverture (%)", color: "hsl(38, 92%, 50%)" },
                  clickRate: { label: "Taux de clic (%)", color: "hsl(280, 65%, 55%)" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={campaignsBar} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={60} />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="openRate" fill="hsl(38, 92%, 50%)" name="Ouverture (%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clickRate" fill="hsl(280, 65%, 55%)" name="Clic (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent campaigns table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campagnes récentes</CardTitle>
            <CardDescription>Détail des dernières campagnes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Campagne</th>
                    <th className="text-left px-4 py-2 font-medium">Statut</th>
                    <th className="text-right px-4 py-2 font-medium">Envoyés</th>
                    <th className="text-right px-4 py-2 font-medium">Ouv.</th>
                    <th className="text-right px-4 py-2 font-medium">Clics</th>
                    <th className="text-right px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 && !loading && (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Aucune campagne</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Chargement…</td></tr>
                  )}
                  {campaigns.slice(0, 10).map(c => {
                    const openRate = c.total_sent ? ((c.total_opened / c.total_sent) * 100).toFixed(1) : "0.0";
                    const clickRate = c.total_sent ? ((c.total_clicked / c.total_sent) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            style={{
                              color: STATUS_COLORS[c.status] ?? "hsl(var(--foreground))",
                              borderColor: STATUS_COLORS[c.status] ?? "hsl(var(--border))",
                            }}
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.total_sent}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.total_opened} <span className="text-muted-foreground text-xs">({openRate}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.total_clicked} <span className="text-muted-foreground text-xs">({clickRate}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {c.sent_at
                            ? format(parseISO(c.sent_at), "d MMM yyyy", { locale: fr })
                            : format(parseISO(c.created_at), "d MMM yyyy", { locale: fr })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, variant,
}: {
  icon: any; label: string; value: string; sub?: string;
  variant: "primary" | "success" | "warning" | "info";
}) {
  const styles = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  }[variant];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className={`p-2 rounded-lg ${styles}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
