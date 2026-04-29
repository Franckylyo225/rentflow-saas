import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Sparkles, ShieldCheck, Plus, ArrowUpRight, Rocket, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid, Legend } from "recharts";
import { AiContentDrawer } from "@/components/admin/growth/AiContentDrawer";
import { ClaudeChatDrawer } from "@/components/admin/growth/ClaudeChatDrawer";

type Task = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  due_date: string;
  due_time: string | null;
  done: boolean;
  done_at: string | null;
};

type Metric = { date: string; users_count: number; new_users: number };

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Email: { bg: "bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-700", dot: "bg-emerald-500" },
  Réseaux: { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700", dot: "bg-blue-500" },
  Tech: { bg: "bg-violet-50", border: "border-l-violet-500", text: "text-violet-700", dot: "bg-violet-500" },
  PR: { bg: "bg-orange-50", border: "border-l-orange-500", text: "text-orange-700", dot: "bg-orange-500" },
  Produit: { bg: "bg-yellow-50", border: "border-l-yellow-500", text: "text-yellow-700", dot: "bg-yellow-500" },
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function AdminGrowth() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [usersCount, setUsersCount] = useState(0);
  const [suggestions, setSuggestions] = useState<{ titre: string; explication: string; type: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [aiDrawer, setAiDrawer] = useState<{ open: boolean; title: string; type?: string; taskTitle?: string; taskDescription?: string; onMarkDone?: () => void }>({ open: false, title: "" });
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", type: "Email", priority: "Normal", due_date: todayISO() });
  const [dayDrawer, setDayDrawer] = useState<{ open: boolean; date?: string }>({ open: false });

  const today = todayISO();

  const fetchAll = async () => {
    const [tasksRes, metricsRes, settingsRes, orgsRes] = await Promise.all([
      supabase.from("growth_tasks").select("*").order("due_date").order("priority"),
      supabase.from("growth_metrics").select("date,users_count,new_users").order("date"),
      supabase.from("growth_settings").select("*"),
      supabase.from("organizations").select("*", { count: "exact", head: true }),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if (metricsRes.data) setMetrics(metricsRes.data as Metric[]);
    if (settingsRes.data) setSettings(Object.fromEntries(settingsRes.data.map((s: any) => [s.key, s.value])));
    if (orgsRes.count !== null) setUsersCount(orgsRes.count);
  };

  useEffect(() => { fetchAll(); }, []);

  // KPIs
  const target = parseInt(settings.target_users ?? "1000");
  const targetMonths = parseInt(settings.target_months ?? "24");
  const startDate = settings.start_date ? new Date(settings.start_date) : new Date();
  const realUsers = Math.max(usersCount, metrics[metrics.length - 1]?.users_count ?? 0);
  const lastMetric = metrics[metrics.length - 1];
  const prevMetric = metrics[metrics.length - 2];
  const weeklyDelta = lastMetric && prevMetric ? lastMetric.users_count - prevMetric.users_count : 0;

  const monthsElapsed = Math.max(1, Math.round((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const monthsRemaining = Math.max(1, targetMonths - monthsElapsed);
  const monthlyTarget = Math.ceil((target - realUsers) / monthsRemaining);

  const todayTasks = tasks.filter(t => t.due_date === today);
  const todayPending = todayTasks.filter(t => !t.done).length;

  const weeksRemaining = Math.max(0, Math.ceil((targetMonths * 4.33) - ((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))));

  const expectedGrowth = (target / targetMonths) * monthsElapsed;
  const pace: { label: string; color: string } = realUsers > expectedGrowth * 1.05
    ? { label: "En avance", color: "text-emerald-600 bg-emerald-50" }
    : realUsers < expectedGrowth * 0.95
      ? { label: "En retard", color: "text-red-600 bg-red-50" }
      : { label: "Dans les temps", color: "text-amber-600 bg-amber-50" };

  const progressPct = Math.min(100, (realUsers / target) * 100);
  const milestones = [realUsers, 100, 250, 500, 750, 1000];

  // Calendrier
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const firstDow = (monthStart.getDay() + 6) % 7; // L=0
  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const tasksByDate = useMemo(() => {
    const m: Record<string, Task[]> = {};
    tasks.forEach(t => { (m[t.due_date] ||= []).push(t); });
    return m;
  }, [tasks]);

  // Semaine
  const monday = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });

  // Graph 12 mois
  const chartData = useMemo(() => {
    const monthly: Record<string, number> = {};
    metrics.forEach(m => {
      const k = m.date.slice(0, 7);
      monthly[k] = Math.max(monthly[k] ?? 0, m.users_count);
    });
    const entries: { mois: string; reel: number; cible: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const key = d.toISOString().slice(0, 7);
      const cible = Math.round((target / targetMonths) * (i + 1));
      entries.push({
        mois: d.toLocaleDateString("fr-FR", { month: "short" }),
        reel: monthly[key] ?? (i === 0 ? 0 : NaN),
        cible,
      });
    }
    return entries;
  }, [metrics, settings]);

  const isLate = realUsers < expectedGrowth * 0.95;

  // Toggle done
  const toggleDone = async (t: Task) => {
    const newVal = !t.done;
    const { error } = await supabase.from("growth_tasks").update({
      done: newVal,
      done_at: newVal ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: newVal ? "Tâche validée" : "Tâche rouverte" }); fetchAll(); }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { error } = await supabase.from("growth_tasks").insert(newTask);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Tâche créée" }); setAddOpen(false); setNewTask({ title: "", description: "", type: "Email", priority: "Normal", due_date: todayISO() }); fetchAll(); }
  };

  const lastDoneTask = tasks.filter(t => t.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""))[0]?.title ?? "aucune";
  const overdueTasks = tasks.filter(t => !t.done && t.due_date < today).length;

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-ai", {
        body: { mode: "suggestions", context: { users: realUsers, overdue_tasks: overdueTasks, last_done_task: lastDoneTask, today } },
      });
      if (error) throw error;
      setSuggestions(data?.suggestions ?? []);
    } catch (e: any) {
      toast({ title: "IA indisponible", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => { if (settings.target_users) fetchSuggestions(); }, [settings.target_users]);

  const addSuggestionAsTask = async (s: { titre: string; explication: string; type: string }) => {
    const { error } = await supabase.from("growth_tasks").insert({
      title: s.titre, description: s.explication, type: s.type, priority: "Normal", due_date: today,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Tâche ajoutée" }); fetchAll(); }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        {/* TOPBAR */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" /> Pilote de croissance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Objectif 1 000 agences · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-sm py-1.5 px-3">{realUsers} / 1 000 agences</Badge>
            <Button onClick={() => setClaudeOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 gap-2">
              <Sparkles className="h-4 w-4" /> Demander à Claude
            </Button>
          </div>
        </div>

        {/* SECTION 1 — KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <Kpi title="Agences actives" value={realUsers} sub={`+${weeklyDelta} cette semaine`} subColor="text-emerald-600" />
          <Kpi title="Objectif mensuel" value={monthlyTarget} sub={`sur ${monthsRemaining} mois restants`} />
          <Kpi title="Tâches aujourd'hui" value={todayPending} sub={todayPending === 0 ? "Tout est fait !" : "à finir"} valueColor={todayPending > 0 ? "text-orange-600" : "text-emerald-600"} />
          <Kpi title="Semaines restantes" value={weeksRemaining} sub="avant la deadline" />
          <Kpi title="Rythme actuel" value={pace.label} sub={`Cible : ${Math.round(expectedGrowth)}`} valueClass={`text-base ${pace.color} px-2 py-1 rounded`} />
        </div>

        {/* SECTION 2 — Progression */}
        <Card className="p-3.5">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="font-semibold text-sm">Progression vers 1 000 utilisateurs</h3>
            <span className="text-sm font-bold text-emerald-600">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {milestones.map((m, i) => {
              const reached = realUsers >= m;
              const current = i === 0;
              return (
                <div key={i} className="text-center flex-1">
                  <div className={`h-2.5 w-2.5 mx-auto rounded-full mb-1 ${current ? "bg-orange-500" : reached ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <div className="text-xs font-semibold">{m}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {current ? "auj." : `M+${Math.max(0, Math.ceil((m - realUsers) / Math.max(1, monthlyTarget)))}`}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* SECTION 3 — Suggestions IA */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Suggestions Claude</h3>
            {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mb-3">Mises à jour à chaque ouverture de la page</p>
          <div className="grid md:grid-cols-3 gap-3">
            {suggestions.length === 0 && !loadingSuggestions && (
              <p className="text-sm text-muted-foreground col-span-3">Aucune suggestion disponible.</p>
            )}
            {suggestions.map((s, i) => {
              const c = TYPE_COLORS[s.type] ?? TYPE_COLORS.Email;
              return (
                <div key={i} className={`border-l-[3px] ${c.border} bg-card border border-border rounded-md p-3 space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{s.titre}</h4>
                    <Badge variant="outline" className={`text-[10px] ${c.text}`}>{s.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.explication}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAiDrawer({ open: true, title: s.titre, type: s.type, taskTitle: s.titre, taskDescription: s.explication })}>
                      <Sparkles className="h-3 w-3" /> Générer
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addSuggestionAsTask(s)}>
                      <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* SECTION 4 — Tâches du jour + Calendrier */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Tâches du jour */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Tâches d'aujourd'hui</h3>
                {todayPending > 0 && <Badge className="bg-orange-500 text-white">{todayPending}</Badge>}
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {todayTasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche aujourd'hui.</p>}
              {[...todayTasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_time ?? "").localeCompare(b.due_time ?? "")).map(t => {
                const c = TYPE_COLORS[t.type] ?? TYPE_COLORS.Email;
                return (
                  <div key={t.id} className="flex gap-3 items-start p-2.5 hover:bg-muted/30 rounded-md group">
                    <Checkbox checked={t.done} onCheckedChange={() => toggleDone(t)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                      <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${c.text}`}>{t.type}</Badge>
                        <Badge variant={t.priority === "Urgent" ? "destructive" : "secondary"} className="text-[10px]">{t.priority}</Badge>
                        {t.due_time && <span className="text-[10px] text-muted-foreground">{t.due_time.slice(0, 5)}</span>}
                        <button onClick={() => setAiDrawer({ open: true, title: t.title, type: t.type, taskTitle: t.title, taskDescription: t.description ?? "", onMarkDone: () => toggleDone(t) })} className="text-[11px] text-emerald-600 hover:underline ml-auto flex items-center gap-0.5">
                          Générer le contenu <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Calendrier */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">{now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calCells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const date = fmt(new Date(now.getFullYear(), now.getMonth(), d));
                const dayTasks = tasksByDate[date] ?? [];
                const isToday = date === today;
                const types = Array.from(new Set(dayTasks.map(t => t.type)));
                return (
                  <button key={i} onClick={() => setDayDrawer({ open: true, date })} className={`aspect-square rounded-md border text-xs flex flex-col items-center justify-center gap-0.5 hover:bg-muted/40 ${isToday ? "bg-emerald-50 border-emerald-500 font-bold" : "border-border/50"}`}>
                    <span>{d}</span>
                    {types.length > 0 && (
                      <div className="flex gap-0.5">
                        {types.slice(0, 4).map(tp => <span key={tp} className={`h-1 w-1 rounded-full ${TYPE_COLORS[tp]?.dot ?? "bg-gray-400"}`} />)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-[10px]">
              {Object.entries(TYPE_COLORS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${v.dot}`} /> {k}</span>
              ))}
            </div>
          </Card>
        </div>

        {/* SECTION 5 — Vue semaine */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Semaine du {weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au {weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const iso = fmt(d);
              const dayTasks = tasksByDate[iso] ?? [];
              const isToday = iso === today;
              return (
                <div key={i} className={`rounded-md p-2 min-h-[120px] ${isToday ? "border-[1.5px] border-emerald-500 bg-emerald-50/30" : "border border-border/50"}`}>
                  <div className="text-[10px] text-muted-foreground uppercase">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                  <div className="text-sm font-bold">{d.getDate()}</div>
                  <div className="space-y-1 mt-1.5">
                    {dayTasks.slice(0, 3).map(t => {
                      const c = TYPE_COLORS[t.type] ?? TYPE_COLORS.Email;
                      return (
                        <div key={t.id} className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text} truncate`} title={t.title}>
                          {t.title.slice(0, 20)}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} autres</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* SECTION 6 — Graph */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Croissance — 12 prochains mois</h3>
            {isLate && <Badge variant="destructive">En retard</Badge>}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mois" fontSize={11} />
              <YAxis domain={[0, 1100]} fontSize={11} />
              <RTooltip formatter={(v: any, n: any) => [v, n === "reel" ? "Réel" : "Cible"]} />
              <Legend />
              <Area type="monotone" dataKey="reel" name="Croissance réelle" stroke="hsl(160 84% 39%)" fill="url(#g1)" strokeWidth={2} />
              <Line type="monotone" dataKey="cible" name="Croissance cible" stroke="hsl(220 9% 60%)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Drawers & dialogs */}
      <AiContentDrawer
        open={aiDrawer.open}
        onOpenChange={(v) => setAiDrawer(s => ({ ...s, open: v }))}
        title={aiDrawer.title}
        type={aiDrawer.type}
        taskTitle={aiDrawer.taskTitle}
        taskDescription={aiDrawer.taskDescription}
        onMarkDone={aiDrawer.onMarkDone}
      />
      <ClaudeChatDrawer
        open={claudeOpen}
        onOpenChange={setClaudeOpen}
        context={{ users: realUsers, pending_tasks: tasks.filter(t => !t.done).length, pace: pace.label }}
        onTaskCreated={fetchAll}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Titre" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
            <Input placeholder="Description (optionnel)" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Select value={newTask.type} onValueChange={v => setNewTask({ ...newTask, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(TYPE_COLORS).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Faible">Faible</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={addTask}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={dayDrawer.open} onOpenChange={(v) => setDayDrawer({ open: v, date: dayDrawer.date })}>
        <SheetContent>
          <SheetHeader><SheetTitle>Tâches du {dayDrawer.date}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {dayDrawer.date && (tasksByDate[dayDrawer.date] ?? []).map(t => (
              <div key={t.id} className="p-2 border rounded-md flex items-start gap-2">
                <Checkbox checked={t.done} onCheckedChange={() => toggleDone(t)} className="mt-1" />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{t.type}</Badge>
                </div>
              </div>
            ))}
            {dayDrawer.date && (tasksByDate[dayDrawer.date] ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune tâche ce jour-là.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </SuperAdminLayout>
  );
}

function Kpi({ title, value, sub, subColor, valueColor, valueClass }: { title: string; value: number | string; sub?: string; subColor?: string; valueColor?: string; valueClass?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor ?? ""} ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subColor ?? "text-muted-foreground"}`}>{sub}</p>}
    </Card>
  );
}
