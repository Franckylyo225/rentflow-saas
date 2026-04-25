import { useEffect, useMemo, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Plus, Loader2, Workflow, Trash2, Pencil, Play, UserPlus, ArrowUp, ArrowDown,
  Mail, Clock, GitBranch,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  delay_days: number;
  subject: string;
  html_content: string;
  condition_type: "always" | "opened_previous" | "not_opened_previous";
  is_active: boolean;
}

const CONDITION_LABEL: Record<string, { label: string; color: string }> = {
  always: { label: "Toujours", color: "bg-muted text-muted-foreground border-border" },
  opened_previous: { label: "Si email précédent ouvert", color: "bg-success/10 text-success border-success/20" },
  not_opened_previous: { label: "Si non ouvert", color: "bg-warning/10 text-warning border-warning/20" },
};

const emptyStepForm = {
  delay_days: 0,
  subject: "",
  html_content: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a2e">
  <h1 style="font-size:22px;color:hsl(160,84%,39%)">Bonjour {{first_name}},</h1>
  <p>Votre message ici…</p>
  <p><a href="https://rent-flow.net" style="display:inline-block;background:hsl(160,84%,39%);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Découvrir RentFlow</a></p>
</div>`,
  condition_type: "always" as WorkflowStep["condition_type"],
  is_active: true,
};

export default function AdminWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Workflow create/edit dialog
  const [wfDialog, setWfDialog] = useState(false);
  const [wfEditing, setWfEditing] = useState<WorkflowRow | null>(null);
  const [wfForm, setWfForm] = useState({ name: "", description: "", trigger_type: "manual", is_active: true });

  // Step dialog
  const [stepDialog, setStepDialog] = useState(false);
  const [stepEditing, setStepEditing] = useState<WorkflowStep | null>(null);
  const [stepForm, setStepForm] = useState(emptyStepForm);

  // Enroll dialog
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [contacts, setContacts] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [enrollSelection, setEnrollSelection] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

  const [running, setRunning] = useState(false);

  const selected = useMemo(() => workflows.find(w => w.id === selectedId), [workflows, selectedId]);
  const selectedSteps = useMemo(
    () => steps.filter(s => s.workflow_id === selectedId).sort((a, b) => a.step_order - b.step_order),
    [steps, selectedId]
  );

  const fetchAll = async () => {
    setLoading(true);
    const [wf, st] = await Promise.all([
      supabase.from("marketing_workflows").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_workflow_steps").select("*").order("step_order", { ascending: true }),
    ]);
    if (wf.error) toast.error(wf.error.message);
    if (st.error) toast.error(st.error.message);
    setWorkflows((wf.data || []) as WorkflowRow[]);
    setSteps((st.data || []) as WorkflowStep[]);
    if (!selectedId && wf.data && wf.data.length > 0) setSelectedId(wf.data[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---------- Workflow CRUD ----------
  const openCreateWf = () => {
    setWfEditing(null);
    setWfForm({ name: "", description: "", trigger_type: "manual", is_active: true });
    setWfDialog(true);
  };
  const openEditWf = (w: WorkflowRow) => {
    setWfEditing(w);
    setWfForm({ name: w.name, description: w.description, trigger_type: w.trigger_type, is_active: w.is_active });
    setWfDialog(true);
  };
  const saveWorkflow = async () => {
    if (!wfForm.name.trim()) { toast.error("Le nom est requis"); return; }
    if (wfEditing) {
      const { error } = await supabase.from("marketing_workflows").update(wfForm).eq("id", wfEditing.id);
      if (error) return toast.error(error.message);
      toast.success("Workflow mis à jour");
    } else {
      const { data, error } = await supabase.from("marketing_workflows").insert(wfForm).select("id").single();
      if (error) return toast.error(error.message);
      setSelectedId(data.id);
      toast.success("Workflow créé");
    }
    setWfDialog(false);
    await fetchAll();
  };
  const deleteWorkflow = async (id: string) => {
    if (!confirm("Supprimer ce workflow et toutes ses inscriptions ?")) return;
    const { error } = await supabase.from("marketing_workflows").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (selectedId === id) setSelectedId(null);
    toast.success("Workflow supprimé");
    await fetchAll();
  };
  const toggleActive = async (w: WorkflowRow) => {
    const { error } = await supabase.from("marketing_workflows").update({ is_active: !w.is_active }).eq("id", w.id);
    if (error) return toast.error(error.message);
    await fetchAll();
  };

  // ---------- Step CRUD ----------
  const openCreateStep = () => {
    if (!selectedId) return;
    setStepEditing(null);
    setStepForm(emptyStepForm);
    setStepDialog(true);
  };
  const openEditStep = (s: WorkflowStep) => {
    setStepEditing(s);
    setStepForm({
      delay_days: s.delay_days,
      subject: s.subject,
      html_content: s.html_content,
      condition_type: s.condition_type,
      is_active: s.is_active,
    });
    setStepDialog(true);
  };
  const saveStep = async () => {
    if (!selectedId) return;
    if (!stepForm.subject.trim()) { toast.error("L'objet est requis"); return; }
    if (stepEditing) {
      const { error } = await supabase.from("marketing_workflow_steps").update(stepForm).eq("id", stepEditing.id);
      if (error) return toast.error(error.message);
      toast.success("Étape mise à jour");
    } else {
      const nextOrder = (selectedSteps[selectedSteps.length - 1]?.step_order ?? 0) + 1;
      const { error } = await supabase.from("marketing_workflow_steps").insert({
        ...stepForm, workflow_id: selectedId, step_order: nextOrder,
      });
      if (error) return toast.error(error.message);
      toast.success("Étape ajoutée");
    }
    setStepDialog(false);
    await fetchAll();
  };
  const deleteStep = async (id: string) => {
    if (!confirm("Supprimer cette étape ?")) return;
    const { error } = await supabase.from("marketing_workflow_steps").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Étape supprimée");
    await fetchAll();
  };
  const moveStep = async (s: WorkflowStep, direction: -1 | 1) => {
    const idx = selectedSteps.findIndex(x => x.id === s.id);
    const target = selectedSteps[idx + direction];
    if (!target) return;
    await Promise.all([
      supabase.from("marketing_workflow_steps").update({ step_order: target.step_order }).eq("id", s.id),
      supabase.from("marketing_workflow_steps").update({ step_order: s.step_order }).eq("id", target.id),
    ]);
    await fetchAll();
  };

  // ---------- Enroll ----------
  const openEnroll = async () => {
    if (!selectedId) return;
    const { data, error } = await supabase
      .from("marketing_contacts")
      .select("id,email,full_name")
      .eq("subscribed", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return toast.error(error.message);
    setContacts(data || []);
    setEnrollSelection(new Set());
    setEnrollDialog(true);
  };
  const enrollContacts = async () => {
    if (!selectedId || enrollSelection.size === 0) return;
    setEnrolling(true);
    const rows = Array.from(enrollSelection).map(contact_id => ({
      workflow_id: selectedId, contact_id, status: "active", current_step_order: 0,
    }));
    const { error } = await supabase.from("marketing_workflow_enrollments").upsert(rows, {
      onConflict: "workflow_id,contact_id", ignoreDuplicates: true,
    });
    setEnrolling(false);
    if (error) return toast.error(error.message);
    toast.success(`${enrollSelection.size} contact(s) inscrit(s)`);
    setEnrollDialog(false);
  };

  // ---------- Manual run ----------
  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("process-workflows", { body: {} });
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success(`Traité — envoyés: ${data?.sent ?? 0}, planifiés: ${data?.scheduled ?? 0}, ignorés: ${data?.skipped ?? 0}`);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Workflow className="h-6 w-6 text-primary" /> Workflows automatisés
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Séquences d'emails J0, J+2, J+4… avec conditions opened/not opened.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Exécuter maintenant
            </Button>
            <Button onClick={openCreateWf}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau workflow
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Workflows list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Mes workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto my-4 text-muted-foreground" />
              ) : workflows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun workflow.</p>
              ) : workflows.map(w => (
                <button
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === w.id ? "bg-primary/5 border-primary/30" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{w.name}</span>
                    <Badge variant="outline" className={w.is_active ? "bg-success/10 text-success border-success/20" : ""}>
                      {w.is_active ? "Actif" : "Pause"}
                    </Badge>
                  </div>
                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{w.description}</p>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Selected workflow detail */}
          {selected ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selected.name}
                      <Badge variant="outline" className={selected.is_active ? "bg-success/10 text-success border-success/20" : ""}>
                        {selected.is_active ? "Actif" : "En pause"}
                      </Badge>
                    </CardTitle>
                    {selected.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={openEnroll}>
                      <UserPlus className="h-4 w-4 mr-1.5" /> Inscrire des contacts
                    </Button>
                    <div className="flex items-center gap-2 px-2.5 border rounded-md">
                      <Switch checked={selected.is_active} onCheckedChange={() => toggleActive(selected)} />
                      <span className="text-xs">Actif</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEditWf(selected)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteWorkflow(selected.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Séquence ({selectedSteps.length} étape{selectedSteps.length > 1 ? "s" : ""})</h3>
                  <Button size="sm" onClick={openCreateStep}>
                    <Plus className="h-4 w-4 mr-1.5" /> Ajouter une étape
                  </Button>
                </div>

                {selectedSteps.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Aucune étape. Commencez par ajouter J0.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSteps.map((s, i) => {
                      const cond = CONDITION_LABEL[s.condition_type];
                      return (
                        <div key={s.id} className="flex items-stretch gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              J{s.delay_days >= 0 ? `+${s.delay_days}` : s.delay_days}
                            </div>
                            {i < selectedSteps.length - 1 && (
                              <div className="w-px flex-1 bg-border my-1" />
                            )}
                          </div>
                          <div className="flex-1 border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{s.subject || <span className="italic text-muted-foreground">(sans objet)</span>}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <Badge variant="outline" className={cond.color}>
                                    <GitBranch className="h-3 w-3 mr-1" />
                                    {cond.label}
                                  </Badge>
                                  <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {s.delay_days === 0 ? "Immédiat" : `${s.delay_days}j après inscription`}
                                  </Badge>
                                  {!s.is_active && <Badge variant="outline">Désactivée</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveStep(s, -1)}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === selectedSteps.length - 1} onClick={() => moveStep(s, 1)}>
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditStep(s)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteStep(s.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Workflow className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un workflow ou créez-en un.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Workflow dialog */}
      <Dialog open={wfDialog} onOpenChange={setWfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{wfEditing ? "Modifier le workflow" : "Nouveau workflow"}</DialogTitle>
            <DialogDescription>Définissez le nom et le déclencheur de la séquence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={wfForm.name} onChange={e => setWfForm({ ...wfForm, name: e.target.value })} placeholder="Onboarding nouveaux leads" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={wfForm.description} onChange={e => setWfForm({ ...wfForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Déclencheur</Label>
              <Select value={wfForm.trigger_type} onValueChange={v => setWfForm({ ...wfForm, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel (inscription manuelle)</SelectItem>
                  <SelectItem value="on_signup">À l'inscription d'un compte</SelectItem>
                  <SelectItem value="on_lead_capture">À la capture d'un lead</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Pour la v1, l'inscription des contacts se fait via le bouton "Inscrire des contacts".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={wfForm.is_active} onCheckedChange={v => setWfForm({ ...wfForm, is_active: v })} />
              <Label className="!m-0">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWfDialog(false)}>Annuler</Button>
            <Button onClick={saveWorkflow}>{wfEditing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step dialog */}
      <Dialog open={stepDialog} onOpenChange={setStepDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{stepEditing ? "Modifier l'étape" : "Nouvelle étape"}</DialogTitle>
            <DialogDescription>
              Variables: {`{{first_name}}, {{name}}, {{email}}, {{company}}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Délai (jours après inscription)</Label>
                <Input
                  type="number" min={0}
                  value={stepForm.delay_days}
                  onChange={e => setStepForm({ ...stepForm, delay_days: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">0 = immédiat (J0), 2 = J+2, etc.</p>
              </div>
              <div>
                <Label>Condition</Label>
                <Select
                  value={stepForm.condition_type}
                  onValueChange={(v: any) => setStepForm({ ...stepForm, condition_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Toujours envoyer</SelectItem>
                    <SelectItem value="opened_previous">Si email précédent ouvert</SelectItem>
                    <SelectItem value="not_opened_previous">Si email précédent NON ouvert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Objet *</Label>
              <Input value={stepForm.subject} onChange={e => setStepForm({ ...stepForm, subject: e.target.value })} placeholder="Bienvenue {{first_name}} !" />
            </div>
            <div>
              <Label>Contenu HTML</Label>
              <Textarea
                value={stepForm.html_content}
                onChange={e => setStepForm({ ...stepForm, html_content: e.target.value })}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={stepForm.is_active} onCheckedChange={v => setStepForm({ ...stepForm, is_active: v })} />
              <Label className="!m-0">Étape active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialog(false)}>Annuler</Button>
            <Button onClick={saveStep}>{stepEditing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll dialog */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inscrire des contacts</DialogTitle>
            <DialogDescription>
              {enrollSelection.size} sélectionné(s) · {contacts.length} contact(s) abonné(s)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(c => {
                  const checked = enrollSelection.has(c.id);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => {
                      const next = new Set(enrollSelection);
                      if (checked) next.delete(c.id); else next.add(c.id);
                      setEnrollSelection(next);
                    }}>
                      <TableCell>
                        <input type="checkbox" checked={checked} readOnly className="cursor-pointer" />
                      </TableCell>
                      <TableCell className="text-sm">{c.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.full_name || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollSelection(new Set(contacts.map(c => c.id)))}>
              Tout sélectionner
            </Button>
            <Button variant="outline" onClick={() => setEnrollDialog(false)}>Annuler</Button>
            <Button onClick={enrollContacts} disabled={enrolling || enrollSelection.size === 0}>
              {enrolling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Inscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
