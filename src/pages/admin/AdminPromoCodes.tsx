import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Tag, BarChart3, Copy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

interface PromoUsage {
  id: string;
  promo_code_id: string;
  organization_id: string;
  plan_slug: string;
  discount_applied: number;
  created_at: string;
}

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  expires_at: "",
  max_uses: "",
  is_active: true,
};

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [usages, setUsages] = useState<PromoUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [codesRes, usagesRes] = await Promise.all([
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("promo_code_usages").select("*").order("created_at", { ascending: false }),
    ]);
    setCodes((codesRes.data || []) as unknown as PromoCode[]);
    setUsages((usagesRes.data || []) as unknown as PromoUsage[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setSelectedCode(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (code: PromoCode) => {
    setSelectedCode(code);
    setForm({
      code: code.code,
      description: code.description || "",
      discount_type: code.discount_type,
      discount_value: String(code.discount_value),
      expires_at: code.expires_at ? code.expires_at.slice(0, 10) : "",
      max_uses: code.max_uses !== null ? String(code.max_uses) : "",
      is_active: code.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Le code est requis"); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast.error("La valeur de réduction est requise"); return; }
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) { toast.error("Le pourcentage ne peut pas dépasser 100%"); return; }

    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59").toISOString() : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      is_active: form.is_active,
    };

    let error;
    if (selectedCode) {
      ({ error } = await supabase.from("promo_codes").update(payload).eq("id", selectedCode.id));
    } else {
      ({ error } = await supabase.from("promo_codes").insert(payload));
    }

    if (error) {
      toast.error(error.message.includes("unique") ? "Ce code existe déjà" : "Erreur: " + error.message);
    } else {
      toast.success(selectedCode ? "Code modifié" : "Code créé");
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error("Erreur: " + error.message);
    else { toast.success("Code supprimé"); fetchData(); }
  };

  const handleToggle = async (code: PromoCode) => {
    await supabase.from("promo_codes").update({ is_active: !code.is_active }).eq("id", code.id);
    fetchData();
  };

  const showUsages = (code: PromoCode) => {
    setSelectedCode(code);
    setUsageDialogOpen(true);
  };

  const codeUsages = selectedCode ? usages.filter(u => u.promo_code_id === selectedCode.id) : [];
  const totalDiscount = usages.reduce((s, u) => s + Number(u.discount_applied), 0);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Codes Promo</h1>
            <p className="text-sm text-muted-foreground">Gérez les codes promotionnels pour les abonnements</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau code
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{codes.length}</p>
                  <p className="text-xs text-muted-foreground">Codes créés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{usages.length}</p>
                  <p className="text-xs text-muted-foreground">Utilisations totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalDiscount.toLocaleString("fr-FR")} FCFA</p>
                  <p className="text-xs text-muted-foreground">Réductions accordées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun code promo créé
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => {
                    const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                    const isMaxed = code.max_uses !== null && code.current_uses >= code.max_uses;
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-semibold">
                              {code.code}
                            </code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(code.code); toast.success("Copié !"); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {code.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{code.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {code.discount_type === "percentage"
                              ? `${code.discount_value}%`
                              : `${Number(code.discount_value).toLocaleString("fr-FR")} FCFA`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {code.expires_at
                            ? format(new Date(code.expires_at), "d MMM yyyy", { locale: fr })
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => showUsages(code)} className="hover:underline text-primary">
                            {code.current_uses}{code.max_uses !== null ? ` / ${code.max_uses}` : ""}
                          </button>
                        </TableCell>
                        <TableCell>
                          {!code.is_active ? (
                            <Badge variant="outline">Inactif</Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive">Expiré</Badge>
                          ) : isMaxed ? (
                            <Badge variant="secondary">Épuisé</Badge>
                          ) : (
                            <Badge variant="default">Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Switch checked={code.is_active} onCheckedChange={() => handleToggle(code)} />
                            <Button variant="ghost" size="icon" onClick={() => openEdit(code)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(code.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCode ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: BIENVENUE20"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Offre de lancement..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de réduction</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur *</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percentage" ? "20" : "5000"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date d'expiration</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite d'utilisations</Label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Illimité"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedCode ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage detail dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Utilisations — {selectedCode?.code}</DialogTitle>
          </DialogHeader>
          {codeUsages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune utilisation</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Réduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codeUsages.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">
                      {format(new Date(u.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm">{u.plan_slug}</TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {Number(u.discount_applied).toLocaleString("fr-FR")} FCFA
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
