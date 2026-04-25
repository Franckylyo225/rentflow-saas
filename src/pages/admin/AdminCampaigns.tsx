import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Send, Loader2, Mail, Eye, MousePointerClick, BarChart3, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  status: string;
  segment_filter: any;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_failed: number;
  sent_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground border-border" },
  sending: { label: "Envoi…", className: "bg-warning/10 text-warning border-warning/20" },
  sent: { label: "Envoyée", className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Échec", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const STATUSES = ["new", "contacted", "interested", "converted"];

const emptyForm = {
  name: "",
  subject: "",
  html_content: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a2e">
  <h1 style="font-size:22px;color:hsl(160,84%,39%)">Bonjour {{first_name}},</h1>
  <p>Votre message ici…</p>
  <p><a href="https://rent-flow.net" style="display:inline-block;background:hsl(160,84%,39%);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Découvrir RentFlow</a></p>
  <p style="margin-top:32px;color:#888;font-size:12px">Cordialement,<br/>L'équipe RentFlow</p>
</div>`,
  segment_statuses: ["new", "interested"] as string[],
};

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Compute audience preview
  useEffect(() => {
    if (!dialogOpen) return;
    (async () => {
      let q = supabase.from("marketing_contacts").select("id", { count: "exact", head: true }).eq("subscribed", true);
      if (form.segment_statuses.length) q = q.in("status", form.segment_statuses);
      const { count } = await q;
      setAudienceCount(count ?? 0);
    })();
  }, [dialogOpen, form.segment_statuses]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      subject: c.subject,
      html_content: c.html_content,
      segment_statuses: (c.segment_filter?.statuses ?? []) as string[],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Nom et sujet requis");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      html_content: form.html_content,
      segment_filter: { statuses: form.segment_statuses },
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from("marketing_campaigns").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("marketing_campaigns").insert(payload));
    }
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    toast.success(editing ? "Campagne modifiée" : "Campagne créée");
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette campagne et tous ses envois associés ?")) return;
    const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Campagne supprimée");
    fetchData();
  };

  const handleSend = async (c: Campaign) => {
    if (!confirm(`Envoyer la campagne "${c.name}" à l'audience ciblée ?`)) return;
    setSendingId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaign_id: c.id },
      });
      if (error) throw error;
      toast.success(`Campagne envoyée — ${data.sent} envoyés / ${data.failed} échecs`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSendingId(null);
    }
  };

  const stats = useMemo(() => {
    const sentCampaigns = campaigns.filter(c => c.status === "sent");
    const totalSent = sentCampaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
    const totalOpened = sentCampaigns.reduce((s, c) => s + (c.total_opened || 0), 0);
    const totalClicked = sentCampaigns.reduce((s, c) => s + (c.total_clicked || 0), 0);
    return {
      total: campaigns.length,
      sent: sentCampaigns.length,
      openRate: totalSent ? Math.round((totalOpened / totalSent) * 100) : 0,
      clickRate: totalSent ? Math.round((totalClicked / totalSent) * 100) : 0,
    };
  }, [campaigns]);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Campagnes Email
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Créez et envoyez des campagnes ciblées</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle campagne
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Campagnes</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Envoyées</p><p className="text-2xl font-bold text-success">{stats.sent}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Taux d'ouverture</p><p className="text-2xl font-bold text-primary">{stats.openRate}%</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Taux de clic</p><p className="text-2xl font-bold text-info">{stats.clickRate}%</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Toutes les campagnes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Aucune campagne</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Destinataires</TableHead>
                    <TableHead className="text-right">Envoyés</TableHead>
                    <TableHead className="text-right">Ouverts</TableHead>
                    <TableHead className="text-right">Cliqués</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => {
                    const openRate = c.total_sent ? Math.round((c.total_opened / c.total_sent) * 100) : 0;
                    const clickRate = c.total_sent ? Math.round((c.total_clicked / c.total_sent) * 100) : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CONFIG[c.status]?.className}>
                            {STATUS_CONFIG[c.status]?.label || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.total_recipients}</TableCell>
                        <TableCell className="text-right">{c.total_sent}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{c.total_opened}</span>
                          {c.total_sent > 0 && <span className="text-xs text-muted-foreground ml-1">({openRate}%)</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{c.total_clicked}</span>
                          {c.total_sent > 0 && <span className="text-xs text-muted-foreground ml-1">({clickRate}%)</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.sent_at ? format(new Date(c.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })
                                     : format(new Date(c.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.status === "draft" && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                              <Button
                                size="icon" variant="ghost"
                                onClick={() => handleSend(c)}
                                disabled={sendingId === c.id}
                              >
                                {sendingId === c.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Send className="h-4 w-4 text-primary" />}
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
            <DialogDescription>
              Variables disponibles : <code className="text-xs">{`{{first_name}}, {{name}}, {{email}}, {{company}}`}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom interne *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Newsletter Octobre" />
            </div>
            <div>
              <Label>Sujet *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Bonjour {{first_name}}, ..." />
            </div>
            <div>
              <Label>Contenu HTML *</Label>
              <Textarea
                rows={12}
                className="font-mono text-xs"
                value={form.html_content}
                onChange={(e) => setForm({ ...form, html_content: e.target.value })}
              />
            </div>
            <div>
              <Label>Segment ciblé (statuts)</Label>
              <div className="flex flex-wrap gap-3 mt-2 p-3 border rounded-md">
                {STATUSES.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.segment_statuses.includes(s)}
                      onCheckedChange={(checked) => {
                        setForm({
                          ...form,
                          segment_statuses: checked
                            ? [...form.segment_statuses, s]
                            : form.segment_statuses.filter(x => x !== s),
                        });
                      }}
                    />
                    {s}
                  </label>
                ))}
              </div>
              {audienceCount !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Audience estimée : <strong>{audienceCount}</strong> contact(s) abonné(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer brouillon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
