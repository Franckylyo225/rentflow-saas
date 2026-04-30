import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LifeBuoy, Plus, Loader2, Paperclip, Send, ArrowLeft, X, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORIES: Record<string, string> = {
  bug: "Bug",
  question: "Question",
  billing: "Facturation",
  feature: "Suggestion",
  other: "Autre",
};

const PRIORITIES: Record<string, { label: string; className: string }> = {
  low: { label: "Faible", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normale", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  high: { label: "Élevée", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  urgent: { label: "Urgente", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const STATUSES: Record<string, { label: string; className: string }> = {
  open: { label: "Ouvert", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "En cours", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  waiting_user: { label: "En attente de vous", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  resolved: { label: "Résolu", className: "bg-success/10 text-success border-success/20" },
  closed: { label: "Fermé", className: "bg-muted text-muted-foreground border-border" },
};

interface Ticket {
  id: string;
  organization_id?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  last_message_at: string;
  created_by: string;
  assigned_to?: string | null;
  sla_due_at?: string | null;
  first_response_at?: string | null;
  linked_rent_payment_id?: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface Attachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export default function Support() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowNew(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [form, setForm] = useState({
    subject: "",
    category: "question",
    priority: "normal",
    description: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTickets = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [profile?.organization_id]);

  const filtered = tickets.filter(t => statusFilter === "all" || t.status === statusFilter);

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.description.trim() || !user || !profile?.organization_id) return;
    setSaving(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          organization_id: profile.organization_id,
          created_by: user.id,
          subject: form.subject.trim().slice(0, 200),
          description: form.description.trim().slice(0, 5000),
          category: form.category,
          priority: form.priority,
          status: "open",
        })
        .select("*")
        .single();
      if (error || !ticket) throw error;

      // Upload attachments
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.warning(`${file.name} ignoré (>10MB)`);
          continue;
        }
        const path = `${profile.organization_id}/${ticket.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, file);
        if (upErr) {
          console.error(upErr);
          continue;
        }
        await supabase.from("support_ticket_attachments").insert({
          ticket_id: ticket.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null,
        });
      }

      toast.success("Ticket créé");
      setShowNew(false);
      setForm({ subject: "", category: "question", priority: "normal", description: "" });
      setFiles([]);
      fetchTickets();
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "création impossible"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" /> Support
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Contactez l'équipe pour signaler un problème ou poser une question.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUSES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gap-2" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Nouveau ticket
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Aucun ticket pour le moment.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4" /> Créer mon premier ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(t => (
              <Card key={t.id} className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setOpenTicket(t)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{CATEGORIES[t.category]}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITIES[t.priority]?.className}`}>{PRIORITIES[t.priority]?.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Maj. {format(new Date(t.last_message_at), "dd MMM HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${STATUSES[t.status]?.className}`}>
                      {STATUSES[t.status]?.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New ticket dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau ticket de support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sujet *</Label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                maxLength={200}
                placeholder="Résumé court du problème"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                rows={5}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                maxLength={5000}
                placeholder="Décrivez le problème, étapes pour le reproduire, capture d'écran si possible…"
              />
            </div>
            <div className="space-y-2">
              <Label>Pièces jointes (max 10MB / fichier)</Label>
              <Input
                type="file"
                multiple
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Paperclip className="h-3 w-3" /> {f.name}
                      <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !form.subject.trim() || !form.description.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketDetailSheet
        ticket={openTicket}
        onClose={() => { setOpenTicket(null); fetchTickets(); }}
        viewerRole="agency"
      />
    </AppLayout>
  );
}

// Shared detail panel
export function TicketDetailSheet({
  ticket,
  onClose,
  viewerRole,
}: {
  ticket: Ticket | null;
  onClose: () => void;
  viewerRole: "agency" | "admin";
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [unpaidPayments, setUnpaidPayments] = useState<{ id: string; label: string }[]>([]);
  const [localTicket, setLocalTicket] = useState<Ticket | null>(null);

  useEffect(() => { setLocalTicket(ticket); }, [ticket?.id]);

  useEffect(() => {
    if (!ticket) return;
    const load = async () => {
      setLoading(true);
      const [mRes, aRes] = await Promise.all([
        supabase.from("support_ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at"),
        supabase.from("support_ticket_attachments").select("*").eq("ticket_id", ticket.id).order("created_at"),
      ]);
      setMessages((mRes.data as TicketMessage[]) || []);
      setAttachments((aRes.data as Attachment[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as TicketMessage]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticket?.id]);

  if (!ticket) return null;

  const handleSend = async () => {
    if (!reply.trim() || !user) return;
    setSending(true);
    try {
      const { data: msg, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticket.id,
          author_id: user.id,
          author_role: viewerRole,
          content: reply.trim().slice(0, 5000),
          is_internal: viewerRole === "admin" ? isInternal : false,
        })
        .select("*")
        .single();
      if (error || !msg) throw error;

      // Upload attachments — bucket path needs orgId/ticketId/...
      // For admin uploads, use ticket's org via select
      let orgFolder: string | null = null;
      if (viewerRole === "agency") {
        const { data: t } = await supabase.from("support_tickets").select("organization_id").eq("id", ticket.id).single();
        orgFolder = (t as any)?.organization_id;
      } else {
        const { data: t } = await supabase.from("support_tickets").select("organization_id").eq("id", ticket.id).single();
        orgFolder = (t as any)?.organization_id;
      }

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.warning(`${file.name} ignoré (>10MB)`); continue; }
        const path = `${orgFolder}/${ticket.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, file);
        if (upErr) { console.error(upErr); continue; }
        await supabase.from("support_ticket_attachments").insert({
          ticket_id: ticket.id,
          message_id: msg.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null,
        });
      }

      setReply("");
      setFiles([]);
      setIsInternal(false);
      // refetch attachments
      const { data: aRes } = await supabase.from("support_ticket_attachments").select("*").eq("ticket_id", ticket.id).order("created_at");
      setAttachments((aRes as Attachment[]) || []);
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "envoi impossible"));
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: string) => {
    const updates: any = { status };
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    if (status === "closed") updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from("support_tickets").update(updates).eq("id", ticket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    onClose();
  };

  const downloadAttachment = async (att: Attachment) => {
    const { data, error } = await supabase.storage.from("support-attachments").createSignedUrl(att.file_path, 60);
    if (error || !data) { toast.error("Téléchargement impossible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const initialAttachments = attachments.filter(a => !a.message_id);

  return (
    <Sheet open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base truncate">{ticket.subject}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={`text-[10px] ${STATUSES[ticket.status]?.className}`}>{STATUSES[ticket.status]?.label}</Badge>
                <Badge variant="outline" className="text-[10px]">{CATEGORIES[ticket.category]}</Badge>
                <Badge variant="outline" className={`text-[10px] ${PRIORITIES[ticket.priority]?.className}`}>{PRIORITIES[ticket.priority]?.label}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Initial description */}
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Ouvert le {format(new Date(ticket.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
            </p>
            <p className="text-sm whitespace-pre-wrap text-card-foreground">{ticket.description}</p>
            {initialAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {initialAttachments.map(a => (
                  <Button key={a.id} variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => downloadAttachment(a)}>
                    <Paperclip className="h-3 w-3" /> {a.file_name}
                    <Download className="h-3 w-3 ml-1" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.map(m => {
            const isMine = m.author_id === user?.id;
            const msgAttachments = attachments.filter(a => a.message_id === m.id);
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  m.is_internal ? "bg-amber-500/10 border border-amber-500/30" :
                  isMine ? "bg-primary text-primary-foreground" :
                  m.author_role === "admin" ? "bg-blue-500/10 border border-blue-500/20" :
                  "bg-muted"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium opacity-80">
                      {m.author_role === "admin" ? "Support" : "Agence"}
                    </span>
                    {m.is_internal && <Badge variant="outline" className="text-[9px] h-4">Note interne</Badge>}
                    <span className="text-[10px] opacity-60">
                      {format(new Date(m.created_at), "dd MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {msgAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msgAttachments.map(a => (
                        <Button key={a.id} variant="outline" size="sm" className="gap-1 h-6 text-[10px] bg-background" onClick={() => downloadAttachment(a)}>
                          <Paperclip className="h-3 w-3" /> {a.file_name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {ticket.status !== "closed" && (
          <div className="border-t border-border p-4 space-y-3 bg-card">
            <Textarea
              rows={3}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Votre réponse…"
              maxLength={5000}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-muted">
                  <Paperclip className="h-3 w-3" /> Joindre
                </span>
              </label>
              {files.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-[10px]">
                  {f.name}
                  <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              {viewerRole === "admin" && (
                <label className="flex items-center gap-1 text-xs cursor-pointer ml-auto">
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                  Note interne
                </label>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 flex-wrap">
                {viewerRole === "admin" && (
                  <Select value={ticket.status} onValueChange={updateStatus}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {viewerRole === "agency" && ticket.status !== "closed" && ticket.created_by === user?.id && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus("closed")}>
                    Fermer le ticket
                  </Button>
                )}
              </div>
              <Button onClick={handleSend} disabled={sending || !reply.trim()} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
