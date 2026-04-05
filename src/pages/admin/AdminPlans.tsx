import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALL_FEATURES = [
  { key: "properties", label: "Biens" },
  { key: "tenants", label: "Locataires" },
  { key: "rents", label: "Loyers" },
  { key: "expenses", label: "Dépenses" },
  { key: "reports", label: "Rapports" },
  { key: "patrimoine", label: "Patrimoine" },
  { key: "employees", label: "Employés" },
  { key: "api_access", label: "Accès API" },
  { key: "priority_support", label: "Support prioritaire" },
];

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  max_properties: number | null;
  max_users: number | null;
  feature_flags: string[];
  is_visible: boolean;
  sort_order: number;
}

const emptyPlan: Omit<Plan, "id"> = {
  slug: "",
  name: "",
  description: "",
  price_monthly: 0,
  max_properties: null,
  max_users: null,
  feature_flags: [],
  is_visible: true,
  sort_order: 0,
};

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Omit<Plan, "id">>(emptyPlan);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });
    setPlans((data as Plan[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...emptyPlan, sort_order: plans.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      max_properties: plan.max_properties,
      max_users: plan.max_users,
      feature_flags: plan.feature_flags,
      is_visible: plan.is_visible,
      sort_order: plan.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nom et slug requis");
      return;
    }
    setSaving(true);

    const payload = {
      slug: form.slug.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      name: form.name,
      description: form.description,
      price_monthly: form.price_monthly,
      max_properties: form.max_properties,
      max_users: form.max_users,
      feature_flags: form.feature_flags,
      is_visible: form.is_visible,
      sort_order: form.sort_order,
    };

    if (editingPlan) {
      const { error } = await supabase
        .from("plans")
        .update(payload)
        .eq("id", editingPlan.id);
      if (error) toast.error("Erreur : " + error.message);
      else toast.success("Plan mis à jour");
    } else {
      const { error } = await supabase.from("plans").insert(payload);
      if (error) toast.error("Erreur : " + error.message);
      else toast.success("Plan créé");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Plan supprimé");
      fetchPlans();
    }
    setDeleteConfirm(null);
  };

  const toggleVisibility = async (plan: Plan) => {
    const { error } = await supabase
      .from("plans")
      .update({ is_visible: !plan.is_visible })
      .eq("id", plan.id);
    if (error) toast.error("Erreur");
    else {
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_visible: !p.is_visible } : p))
      );
    }
  };

  const toggleFeature = (key: string) => {
    setForm((prev) => ({
      ...prev,
      feature_flags: prev.feature_flags.includes(key)
        ? prev.feature_flags.filter((f) => f !== key)
        : [...prev.feature_flags, key],
    }));
  };

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("fr-FR").format(v) + " FCFA";

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plans tarifaires</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {plans.length} plan{plans.length > 1 ? "s" : ""} configuré{plans.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau plan
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Prix / mois</TableHead>
                    <TableHead className="text-center">Max biens</TableHead>
                    <TableHead className="text-center">Max users</TableHead>
                    <TableHead>Fonctionnalités</TableHead>
                    <TableHead className="text-center">Visible</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Aucun plan configuré
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="text-muted-foreground">{plan.sort_order}</TableCell>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.slug}</code>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(plan.price_monthly)}
                        </TableCell>
                        <TableCell className="text-center">
                          {plan.max_properties ?? "∞"}
                        </TableCell>
                        <TableCell className="text-center">
                          {plan.max_users ?? "∞"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {plan.feature_flags.slice(0, 3).map((f) => (
                              <Badge key={f} variant="secondary" className="text-[10px]">
                                {ALL_FEATURES.find((af) => af.key === f)?.label || f}
                              </Badge>
                            ))}
                            {plan.feature_flags.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{plan.feature_flags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleVisibility(plan)}
                          >
                            {plan.is_visible ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(plan.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Modifier le plan" : "Nouveau plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="ex: starter"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Prix mensuel (FCFA)</Label>
                <Input
                  type="number"
                  value={form.price_monthly}
                  onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max biens</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={form.max_properties ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, max_properties: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max utilisateurs</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={form.max_users ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, max_users: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fonctionnalités (feature flags)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALL_FEATURES.map((feat) => (
                  <label
                    key={feat.key}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={form.feature_flags.includes(feat.key)}
                      onChange={() => toggleFeature(feat.key)}
                      className="rounded border-input"
                    />
                    {feat.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_visible}
                  onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
                />
                <Label>Visible publiquement</Label>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Label>Ordre</Label>
                <Input
                  type="number"
                  className="w-16"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPlan ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce plan ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Les abonnements existants ne seront pas affectés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminPlans;
