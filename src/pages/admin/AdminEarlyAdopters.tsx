import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Download, Loader2, Search, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConfigState {
  active: boolean;
  total_slots: number;
  slots_taken: number;
  discount_percent: number;
  free_months: number;
  price_before: number;
  label: string;
  description: string;
  expires_at: string;
}

interface EARow {
  id: string;
  user_id: string | null;
  email: string;
  joined_at: string;
  discount_percent: number;
  free_months: number;
  is_active: boolean;
  notes: string | null;
}

const PAGE_SIZE = 20;

export default function AdminEarlyAdopters() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adopters, setAdopters] = useState<EARow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [counterAdjust, setCounterAdjust] = useState<number>(0);

  // Manual add
  const [addEmail, setAddEmail] = useState("");
  const [addDiscount, setAddDiscount] = useState<number>(25);
  const [addMonths, setAddMonths] = useState<number>(3);
  const [addNotes, setAddNotes] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [cfgRes, listRes] = await Promise.all([
      supabase.from("early_adopter_config").select("key, value"),
      supabase.from("early_adopters").select("*").order("joined_at", { ascending: false }),
    ]);
    const map = Object.fromEntries((cfgRes.data ?? []).map((r: any) => [r.key, r.value]));
    setConfig({
      active: map.active === "true",
      total_slots: Number(map.total_slots || 100),
      slots_taken: Number(map.slots_taken || 0),
      discount_percent: Number(map.discount_percent || 25),
      free_months: Number(map.free_months || 3),
      price_before: Number(map.price_before || 20000),
      label: map.label || "Early Adopter",
      description: map.description || "",
      expires_at: map.expires_at || "",
    });
    setCounterAdjust(Number(map.slots_taken || 0));
    setAdopters((listRes.data as EARow[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const updateConfigKeys = async (entries: Record<string, string>) => {
    const rows = Object.entries(entries).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("early_adopter_config").upsert(rows, { onConflict: "key" });
    if (error) throw error;
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const priceAfter = Math.round(config.price_before * (1 - config.discount_percent / 100));
      await updateConfigKeys({
        active: String(config.active),
        total_slots: String(config.total_slots),
        discount_percent: String(config.discount_percent),
        free_months: String(config.free_months),
        price_before: String(config.price_before),
        price_after: String(priceAfter),
        label: config.label,
        description: config.description,
        expires_at: config.expires_at,
      });
      toast.success("Configuration mise à jour");
      loadAll();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (next: boolean) => {
    if (!config) return;
    setConfig({ ...config, active: next });
  };

  const handleAdjustCounter = async () => {
    try {
      await updateConfigKeys({ slots_taken: String(counterAdjust) });
      toast.success("Compteur mis à jour");
      loadAll();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleRevoke = async (id: string, restore = false) => {
    const { error } = await supabase.from("early_adopters").update({ is_active: restore }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(restore ? "Restauré" : "Réduction révoquée");
    loadAll();
  };

  const handleManualAdd = async () => {
    if (!addEmail || !config) return toast.error("Email requis");
    const { error } = await supabase.from("early_adopters").insert({
      email: addEmail.trim().toLowerCase(),
      discount_percent: addDiscount,
      free_months: addMonths,
      notes: addNotes || null,
    });
    if (error) return toast.error(error.message);
    await updateConfigKeys({ slots_taken: String(config.slots_taken + 1) });
    toast.success("Early adopter ajouté");
    setAddEmail(""); setAddNotes("");
    loadAll();
  };

  const handleExportCSV = () => {
    const header = "Email,Date d'inscription,Réduction (%),Mois offerts,Statut,Notes\n";
    const rows = adopters.map((a) =>
      [a.email, format(new Date(a.joined_at), "yyyy-MM-dd HH:mm"), a.discount_percent, a.free_months, a.is_active ? "Actif" : "Révoqué", `"${(a.notes || "").replace(/"/g, '""')}"`].join(","),
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `early-adopters-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(
    () => adopters.filter((a) => a.email.toLowerCase().includes(search.toLowerCase())),
    [adopters, search],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading || !config) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      </SuperAdminLayout>
    );
  }

  const slotsRemaining = Math.max(0, config.total_slots - config.slots_taken);
  const fillPct = Math.min(100, Math.round((config.slots_taken / Math.max(1, config.total_slots)) * 100));
  const previewPriceAfter = Math.round(config.price_before * (1 - config.discount_percent / 100));
  const fillColor = fillPct >= 95 ? "text-destructive" : fillPct >= 80 ? "text-warning" : "text-success";

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Topbar */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Programme Early Adopters
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Configuration et gestion des places</p>
          </div>
          <Badge variant={config.active ? "default" : "secondary"} className={config.active ? "bg-success text-success-foreground" : ""}>
            {config.active ? "Programme actif" : "Programme inactif"}
          </Badge>
        </div>

        {/* SECTION 1 — Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration du programme</CardTitle>
            <CardDescription>Toutes les valeurs sont éditables. N'oubliez pas d'enregistrer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Programme actif</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quand actif, les nouveaux inscrits reçoivent automatiquement la réduction tant qu'il reste des places.
                </p>
              </div>
              {config.active ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Switch checked={true} onClick={(e) => e.preventDefault()} />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Désactiver le programme ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Les early adopters existants conservent leur réduction. Plus aucune nouvelle attribution automatique ne sera faite.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleToggleActive(false)}>Désactiver</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Switch checked={false} onCheckedChange={(v) => handleToggleActive(v)} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nombre total de places</Label>
                <Input type="number" value={config.total_slots} onChange={(e) => setConfig({ ...config, total_slots: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">Les inscrits au-delà de cette limite ne bénéficient pas de la réduction.</p>
              </div>
              <div className="space-y-2">
                <Label>Réduction à vie (%)</Label>
                <Input type="number" min={0} max={100} value={config.discount_percent} onChange={(e) => setConfig({ ...config, discount_percent: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">
                  Prix actuel : <strong>{config.price_before.toLocaleString("fr-FR")} FCFA</strong> →
                  Prix early adopter : <strong className="text-success">{previewPriceAfter.toLocaleString("fr-FR")} FCFA/mois</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Mois d'essai offerts</Label>
                <Input type="number" value={config.free_months} onChange={(e) => setConfig({ ...config, free_months: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Prix normal (FCFA/mois)</Label>
                <Input type="number" value={config.price_before} onChange={(e) => setConfig({ ...config, price_before: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Label de l'offre</Label>
                <Input value={config.label} onChange={(e) => setConfig({ ...config, label: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date d'expiration (optionnel)</Label>
                <Input type="date" value={config.expires_at ? config.expires_at.slice(0, 10) : ""} onChange={(e) => setConfig({ ...config, expires_at: e.target.value })} />
                <p className="text-xs text-muted-foreground">Si vide, offre sans date limite.</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea maxLength={200} value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} />
                <p className="text-xs text-muted-foreground text-right">{config.description.length}/200</p>
              </div>
            </div>

            <Button onClick={handleSaveConfig} disabled={saving} className="bg-success hover:bg-success/90 text-success-foreground">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer la configuration
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 2 — Compteur temps réel */}
        <Card>
          <CardHeader>
            <CardTitle>Compteur en temps réel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Places prises</p>
                <p className={`text-3xl font-bold mt-2 ${fillColor}`}>{config.slots_taken}</p>
                <p className="text-xs text-muted-foreground mt-1">sur {config.total_slots} places</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Places restantes</p>
                <p className={`text-3xl font-bold mt-2 ${slotsRemaining < 10 ? "text-destructive" : "text-foreground"}`}>{slotsRemaining}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Taux de remplissage</p>
                <p className={`text-3xl font-bold mt-2 ${fillColor}`}>{fillPct}%</p>
                <Progress value={fillPct} className="h-2 mt-3" />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <Label>Ajuster le compteur manuellement</Label>
              <div className="flex gap-2 items-center">
                <Input type="number" value={counterAdjust} onChange={(e) => setCounterAdjust(Number(e.target.value))} className="max-w-[180px]" />
                <Button variant="outline" onClick={handleAdjustCounter}>Mettre à jour</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisez ceci pour corriger le compteur si des inscriptions ont eu lieu hors plateforme.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3 — Liste */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Early adopters inscrits ({adopters.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" /> Exporter CSV
              </Button>
            </div>
            <div className="relative mt-3 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher par email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Mois</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun early adopter</TableCell></TableRow>
                )}
                {pageRows.map((a) => {
                  const initials = a.email.slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                          <span className="text-sm">{a.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(a.joined_at), "d MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell>-{a.discount_percent}%</TableCell>
                      <TableCell>{a.free_months}</TableCell>
                      <TableCell>
                        <Badge variant={a.is_active ? "default" : "destructive"} className={a.is_active ? "bg-success text-success-foreground" : ""}>
                          {a.is_active ? "Actif" : "Révoqué"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {a.is_active ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">Révoquer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Révoquer la réduction ?</AlertDialogTitle>
                                <AlertDialogDescription>{a.email} ne bénéficiera plus de la réduction early adopter.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRevoke(a.id, false)}>Révoquer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(a.id, true)}>Restaurer</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">Page {page} / {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédent</Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4 — Ajout manuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Ajouter manuellement un early adopter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Email</Label>
                <Input type="email" placeholder="user@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Réduction (%)</Label>
                <Input type="number" value={addDiscount} onChange={(e) => setAddDiscount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Mois offerts</Label>
                <Input type="number" value={addMonths} onChange={(e) => setAddMonths(Number(e.target.value))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Note (optionnel)</Label>
                <Input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleManualAdd} className="bg-success hover:bg-success/90 text-success-foreground">Ajouter</Button>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
