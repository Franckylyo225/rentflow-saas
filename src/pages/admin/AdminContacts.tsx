import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Upload, Search, Users, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Contact {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  score: number;
  subscribed: boolean;
  organization_id: string | null;
  last_activity_at: string | null;
  created_at: string;
  deliverability?: string | null;
  bounce_count?: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-info/10 text-info border-info/20" },
  contacted: { label: "Contacté", className: "bg-warning/10 text-warning border-warning/20" },
  interested: { label: "Intéressé", className: "bg-primary/10 text-primary border-primary/20" },
  converted: { label: "Converti", className: "bg-success/10 text-success border-success/20" },
  unsubscribed: { label: "Désabonné", className: "bg-muted text-muted-foreground border-border" },
};

const DELIVERABILITY_CONFIG: Record<string, { label: string; className: string }> = {
  good: { label: "Bon", className: "bg-success/10 text-success border-success/20" },
  risky: { label: "À risque", className: "bg-warning/10 text-warning border-warning/20" },
  bad: { label: "Mauvais", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const emptyForm = {
  email: "", full_name: "", phone: "", company: "",
  source: "manual", status: "new", subscribed: true,
};

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    setContacts((data || []) as Contact[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (c.email?.toLowerCase().includes(s)
          || c.full_name?.toLowerCase().includes(s)
          || c.company?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [contacts, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => ({
    total: contacts.length,
    new: contacts.filter(c => c.status === "new").length,
    interested: contacts.filter(c => c.status === "interested").length,
    converted: contacts.filter(c => c.status === "converted").length,
  }), [contacts]);

  const sources = useMemo(() => Array.from(new Set(contacts.map(c => c.source))), [contacts]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      email: c.email,
      full_name: c.full_name ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      source: c.source,
      status: c.status,
      subscribed: c.subscribed,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim()) {
      toast.error("Email requis");
      return;
    }
    setSaving(true);
    const payload = {
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      source: form.source,
      status: form.status,
      subscribed: form.subscribed,
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from("marketing_contacts").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("marketing_contacts").insert(payload));
    }
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    toast.success(editing ? "Contact modifié" : "Contact ajouté");
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contact ?")) return;
    const { error } = await supabase.from("marketing_contacts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact supprimé");
    fetchData();
  };

  const normalizeRows = (rawRows: Record<string, any>[]): { email: string; full_name: string | null; phone: string | null; company: string | null; source: string; status: string }[] => {
    const norm = (k: string) => k.toString().trim().toLowerCase().replace(/\s+/g, "_");
    const aliases: Record<string, string> = {
      email: "email", "e-mail": "email", mail: "email", courriel: "email",
      full_name: "full_name", name: "full_name", nom: "full_name", "nom_complet": "full_name", fullname: "full_name",
      phone: "phone", telephone: "phone", "téléphone": "phone", tel: "phone", mobile: "phone",
      company: "company", societe: "company", "société": "company", entreprise: "company", organisation: "company",
    };
    return rawRows.map(r => {
      const obj: Record<string, any> = {};
      for (const k of Object.keys(r)) {
        const key = aliases[norm(k)] ?? norm(k);
        obj[key] = r[k];
      }
      const email = (obj.email ?? "").toString().trim().toLowerCase();
      return {
        email,
        full_name: obj.full_name ? String(obj.full_name).trim() || null : null,
        phone: obj.phone ? String(obj.phone).trim() || null : null,
        company: obj.company ? String(obj.company).trim() || null : null,
        source: "import",
        status: "new",
      };
    }).filter(r => r.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email));
  };

  const importRows = async (rows: ReturnType<typeof normalizeRows>) => {
    if (!rows.length) { toast.error("Aucun email valide trouvé"); return; }
    // Dedupe by email (keep last)
    const map = new Map(rows.map(r => [r.email, r]));
    const unique = Array.from(map.values());
    setSaving(true);
    const { error } = await supabase.from("marketing_contacts").upsert(unique, { onConflict: "email" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${unique.length} contact(s) importé(s)`);
    setImportOpen(false);
    setCsvText("");
    fetchData();
  };

  const handleImport = async () => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      toast.error("CSV vide ou invalide");
      return;
    }
    const header = lines[0].split(",").map(h => h.trim());
    const rawRows = lines.slice(1).map(l => {
      const cols = l.split(",").map(c => c.trim());
      const r: Record<string, any> = {};
      header.forEach((h, i) => { r[h] = cols[i] ?? ""; });
      return r;
    });
    const rows = normalizeRows(rawRows);
    if (!rows.length) {
      toast.error("Aucun email valide. Vérifiez la colonne 'email'.");
      return;
    }
    await importRows(rows);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setSaving(true);
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { toast.error("Fichier vide"); setSaving(false); return; }
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows = normalizeRows(rawRows);
      setSaving(false);
      if (!rows.length) {
        toast.error("Aucun email valide. Vérifiez la colonne 'email'.");
        return;
      }
      await importRows(rows);
    } catch (e: any) {
      setSaving(false);
      toast.error(`Lecture du fichier impossible: ${e.message ?? e}`);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Contacts CRM
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gestion des leads et prospects</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importer CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau contact
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Nouveaux</p><p className="text-2xl font-bold text-info">{stats.new}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Intéressés</p><p className="text-2xl font-bold text-primary">{stats.interested}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Convertis</p><p className="text-2xl font-bold text-success">{stats.converted}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Recherche email, nom, société…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sources</SelectItem>
                  {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">Aucun contact</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Société</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Délivrabilité</TableHead>
                    <TableHead>Créé</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const deliv = DELIVERABILITY_CONFIG[c.deliverability ?? "good"] ?? DELIVERABILITY_CONFIG.good;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.email}</TableCell>
                        <TableCell>{c.full_name || "—"}</TableCell>
                        <TableCell>{c.company || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.source}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CONFIG[c.status]?.className}>
                            {STATUS_CONFIG[c.status]?.label || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={deliv.className}>
                            {deliv.label}
                            {(c.bounce_count ?? 0) > 0 ? ` · ${c.bounce_count}` : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Société</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importer des contacts (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Format attendu (1ère ligne = en-têtes) : <code className="text-xs bg-muted px-1.5 py-0.5 rounded">email,full_name,phone,company</code>
            </p>
            <Textarea
              rows={10}
              placeholder="email,full_name,phone,company&#10;jean@example.com,Jean Dupont,+225...,Agence X"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
