import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Clock, X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Feature {
  id: string;
  key: string;
  label: string;
  description: string;
  sort_order: number;
}

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  yearly_discount_percent: number;
  max_properties: number | null;
  max_users: number | null;
  feature_flags: string[];
  display_features: string[];
  is_visible: boolean;
  status: string;
  cta_label: string;
  trial_eligible: boolean;
  sort_order: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  plan_slug: string;
  created_at: string;
}

const emptyPlan: Omit<Plan, "id"> = {
  slug: "", name: "", description: "", price_monthly: 0, yearly_discount_percent: 0,
  max_properties: null, max_users: null, feature_flags: [], display_features: [],
  is_visible: true, status: "active", cta_label: "Commencer l'essai",
  trial_eligible: true, sort_order: 0,
};

const STATUS_OPTIONS = [
  { value: "active", label: "Actif", color: "bg-green-500" },
  { value: "coming_soon", label: "Bientôt disponible", color: "bg-amber-500" },
  { value: "hidden", label: "Masqué", color: "bg-muted" },
];

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Omit<Plan, "id">>(emptyPlan);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Feature management
  const [featureDialog, setFeatureDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureForm, setFeatureForm] = useState({ key: "", label: "", description: "", sort_order: 0 });
  const [newDisplayFeature, setNewDisplayFeature] = useState("");

  const fetchAll = async () => {
    const [plansRes, featRes, waitRes] = await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("features").select("*").order("sort_order"),
      supabase.from("waitlist").select("*").order("created_at", { ascending: false }),
    ]);
    setPlans((plansRes.data as Plan[]) || []);
    setFeatures((featRes.data as Feature[]) || []);
    setWaitlist((waitRes.data as WaitlistEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Plan CRUD
  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...emptyPlan, sort_order: plans.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      slug: plan.slug, name: plan.name, description: plan.description,
      price_monthly: plan.price_monthly, max_properties: plan.max_properties,
      max_users: plan.max_users, feature_flags: plan.feature_flags,
      display_features: plan.display_features || [],
      is_visible: plan.is_visible, status: plan.status || "active",
      cta_label: plan.cta_label || "Commencer l'essai",
      trial_eligible: plan.trial_eligible ?? true, sort_order: plan.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Nom et slug requis"); return; }
    setSaving(true);
    const payload = {
      slug: form.slug.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      name: form.name, description: form.description, price_monthly: form.price_monthly,
      max_properties: form.max_properties, max_users: form.max_users,
      feature_flags: form.feature_flags, display_features: form.display_features,
      is_visible: form.status !== "hidden", status: form.status,
      cta_label: form.cta_label, trial_eligible: form.trial_eligible,
      sort_order: form.sort_order,
    };
    if (editingPlan) {
      const { error } = await supabase.from("plans").update(payload).eq("id", editingPlan.id);
      if (error) toast.error("Erreur : " + error.message); else toast.success("Plan mis à jour");
    } else {
      const { error } = await supabase.from("plans").insert(payload);
      if (error) toast.error("Erreur : " + error.message); else toast.success("Plan créé");
    }
    setSaving(false); setDialogOpen(false); fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Plan supprimé"); fetchAll(); }
    setDeleteConfirm(null);
  };

  // Feature CRUD
  const openFeatureCreate = () => {
    setEditingFeature(null);
    setFeatureForm({ key: "", label: "", description: "", sort_order: features.length + 1 });
    setFeatureDialog(true);
  };

  const openFeatureEdit = (f: Feature) => {
    setEditingFeature(f);
    setFeatureForm({ key: f.key, label: f.label, description: f.description, sort_order: f.sort_order });
    setFeatureDialog(true);
  };

  const handleFeatureSave = async () => {
    if (!featureForm.key.trim() || !featureForm.label.trim()) { toast.error("Clé et label requis"); return; }
    setSaving(true);
    if (editingFeature) {
      const { error } = await supabase.from("features").update(featureForm).eq("id", editingFeature.id);
      if (error) toast.error("Erreur : " + error.message); else toast.success("Fonctionnalité mise à jour");
    } else {
      const { error } = await supabase.from("features").insert(featureForm);
      if (error) toast.error("Erreur : " + error.message); else toast.success("Fonctionnalité créée");
    }
    setSaving(false); setFeatureDialog(false); fetchAll();
  };

  const handleFeatureDelete = async (id: string) => {
    const { error } = await supabase.from("features").delete().eq("id", id);
    if (error) toast.error("Erreur"); else fetchAll();
  };

  const toggleFeatureFlag = (key: string) => {
    setForm(prev => ({
      ...prev,
      feature_flags: prev.feature_flags.includes(key)
        ? prev.feature_flags.filter(f => f !== key)
        : [...prev.feature_flags, key],
    }));
  };

  const addDisplayFeature = () => {
    if (!newDisplayFeature.trim()) return;
    setForm(prev => ({ ...prev, display_features: [...prev.display_features, newDisplayFeature.trim()] }));
    setNewDisplayFeature("");
  };

  const removeDisplayFeature = (idx: number) => {
    setForm(prev => ({ ...prev, display_features: prev.display_features.filter((_, i) => i !== idx) }));
  };

  const formatPrice = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA";
  const statusInfo = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[2];

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plans & Fonctionnalités</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les offres, fonctionnalités et liste d'attente</p>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
            <TabsTrigger value="features">Fonctionnalités ({features.length})</TabsTrigger>
            <TabsTrigger value="waitlist">Liste d'attente ({waitlist.length})</TabsTrigger>
          </TabsList>

          {/* ===== PLANS TAB ===== */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau plan</Button>
            </div>

            <Card className="border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Prix / mois</TableHead>
                        <TableHead className="text-center">Limites</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead className="text-center">Essai</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun plan</TableCell></TableRow>
                      ) : plans.map(plan => {
                        const si = statusInfo(plan.status);
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="text-muted-foreground">{plan.sort_order}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{plan.name}</span>
                                <p className="text-xs text-muted-foreground"><code>{plan.slug}</code></p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${si.color}`} />
                                {si.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatPrice(plan.price_monthly)}</TableCell>
                            <TableCell className="text-center text-sm">
                              {plan.max_properties ?? "∞"} biens / {plan.max_users ?? "∞"} users
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {plan.feature_flags.slice(0, 3).map(f => (
                                  <Badge key={f} variant="secondary" className="text-[10px]">
                                    {features.find(af => af.key === f)?.label || f}
                                  </Badge>
                                ))}
                                {plan.feature_flags.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">+{plan.feature_flags.length - 3}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {plan.trial_eligible ? <Badge variant="secondary" className="text-[10px]">Oui</Badge> : <span className="text-xs text-muted-foreground">Non</span>}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(plan.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== FEATURES TAB ===== */}
          <TabsContent value="features" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openFeatureCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle fonctionnalité</Button>
            </div>

            <Card className="border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Clé</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Plans assignés</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="text-muted-foreground">{f.sort_order}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code></TableCell>
                        <TableCell className="font-medium">{f.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{f.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {plans.filter(p => p.feature_flags.includes(f.key)).map(p => (
                              <Badge key={p.id} variant="outline" className="text-[10px]">{p.name}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFeatureEdit(f)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleFeatureDelete(f.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== WAITLIST TAB ===== */}
          <TabsContent value="waitlist" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Utilisateurs intéressés</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucune inscription</TableCell></TableRow>
                    ) : waitlist.map(w => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.email}</TableCell>
                        <TableCell><Badge variant="secondary">{w.plan_slug}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(w.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== PLAN DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="ex: starter" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[60px]" />
            </div>

            {/* Price, limits */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Prix mensuel (FCFA)</Label>
                <Input type="number" value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max biens</Label>
                <Input type="number" placeholder="∞" value={form.max_properties ?? ""} onChange={e => setForm({ ...form, max_properties: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max utilisateurs</Label>
                <Input type="number" placeholder="∞" value={form.max_users ?? ""} onChange={e => setForm({ ...form, max_users: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            {/* Status, CTA, trial */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${o.color}`} />
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Texte du CTA</Label>
                <Input value={form.cta_label} onChange={e => setForm({ ...form, cta_label: e.target.value })} />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <Switch checked={form.trial_eligible} onCheckedChange={v => setForm({ ...form, trial_eligible: v })} />
                  <Label>Essai gratuit</Label>
                </div>
              </div>
            </div>

            {/* Feature flags */}
            <div className="space-y-1.5">
              <Label>Fonctionnalités (feature flags)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {features.map(feat => (
                  <label key={feat.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                    <input type="checkbox" checked={form.feature_flags.includes(feat.key)} onChange={() => toggleFeatureFlag(feat.key)} className="rounded border-input" />
                    {feat.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Display features for pricing cards */}
            <div className="space-y-2">
              <Label>Bullet points affichés (pricing cards)</Label>
              <div className="space-y-1.5">
                {form.display_features.map((df, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={df} onChange={e => {
                      const updated = [...form.display_features];
                      updated[idx] = e.target.value;
                      setForm({ ...form, display_features: updated });
                    }} className="text-sm" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDisplayFeature(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={newDisplayFeature} onChange={e => setNewDisplayFeature(e.target.value)} placeholder="Ajouter une ligne…" className="text-sm" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDisplayFeature())} />
                  <Button variant="outline" size="sm" onClick={addDisplayFeature} disabled={!newDisplayFeature.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label>Ordre d'affichage</Label>
              <Input type="number" className="w-20" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPlan ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Dialog */}
      <Dialog open={featureDialog} onOpenChange={setFeatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Modifier la fonctionnalité" : "Nouvelle fonctionnalité"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Clé *</Label>
                <Input value={featureForm.key} onChange={e => setFeatureForm({ ...featureForm, key: e.target.value })} placeholder="ex: sms_reminders" disabled={!!editingFeature} />
              </div>
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input value={featureForm.label} onChange={e => setFeatureForm({ ...featureForm, label: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={featureForm.description} onChange={e => setFeatureForm({ ...featureForm, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ordre</Label>
              <Input type="number" className="w-20" value={featureForm.sort_order} onChange={e => setFeatureForm({ ...featureForm, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialog(false)}>Annuler</Button>
            <Button onClick={handleFeatureSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingFeature ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer ce plan ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminPlans;
