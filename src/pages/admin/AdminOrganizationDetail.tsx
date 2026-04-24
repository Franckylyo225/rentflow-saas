import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Users, Home, DoorOpen, UserCheck,
  Loader2, Power, PowerOff, Send, Calendar, Mail, Phone,
  MessageSquare, AlertCircle, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface PlanOption {
  slug: string;
  name: string;
  price_monthly: number;
}

const STATUS_OPTIONS = [
  { value: "trial", label: "Essai" },
  { value: "active", label: "Actif" },
  { value: "past_due", label: "Impayé" },
  { value: "cancelled", label: "Annulé" },
];

interface OrgDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  currency: string;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

interface AdminNote {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
}

interface UsageStats {
  properties: number;
  units: number;
  tenants: number;
  users: number;
}

interface ReminderStats {
  smsTotal: number;
  smsSent: number;
  smsFailed: number;
  smsLast30: number;
  emailTotal: number;
  emailSent: number;
  emailFailed: number;
  emailLast30: number;
}

const AdminOrganizationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ properties: 0, units: 0, tenants: 0, users: 0 });
  const [reminders, setReminders] = useState<ReminderStats>({
    smsTotal: 0, smsSent: 0, smsFailed: 0, smsLast30: 0,
    emailTotal: 0, emailSent: 0, emailFailed: 0, emailLast30: 0,
  });
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!id) return;

    const [orgRes, subRes, notesRes, profilesRes, propsRes, plansRes] = await Promise.all([
      supabase.from("organizations").select("id, name, email, phone, address, is_active, created_at, currency").eq("id", id).single(),
      supabase.from("subscriptions").select("*").eq("organization_id", id).maybeSingle(),
      supabase.from("admin_notes").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id").eq("organization_id", id),
      supabase.from("properties").select("id").eq("organization_id", id),
      supabase.from("plans").select("slug, name, price_monthly").order("sort_order"),
    ]);

    setPlans((plansRes.data || []) as PlanOption[]);

    if (orgRes.data) setOrg(orgRes.data);
    if (subRes.data) setSubscription(subRes.data);
    setNotes(notesRes.data || []);

    const propIds = (propsRes.data || []).map((p: any) => p.id);
    let unitCount = 0;
    let tenantCount = 0;

    if (propIds.length > 0) {
      const unitsRes = await supabase.from("units").select("id").in("property_id", propIds);
      const unitIds = (unitsRes.data || []).map((u: any) => u.id);
      unitCount = unitIds.length;
      if (unitIds.length > 0) {
        const tenantsRes = await supabase.from("tenants").select("id").in("unit_id", unitIds);
        tenantCount = tenantsRes.data?.length || 0;
      }
    }

    setUsage({
      properties: propsRes.data?.length || 0,
      units: unitCount,
      tenants: tenantCount,
      users: profilesRes.data?.length || 0,
    });

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const toggleActive = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ is_active: !org.is_active }).eq("id", org.id);
    if (error) toast.error("Erreur"); else {
      toast.success(org.is_active ? "Organisation désactivée" : "Organisation activée");
      setOrg({ ...org, is_active: !org.is_active });
    }
    setSaving(false);
  };

  const updateSubscription = async (field: string, value: string) => {
    if (!subscription) return;
    setSaving(true);
    const { error } = await supabase.from("subscriptions").update({ [field]: value }).eq("id", subscription.id);
    if (error) toast.error("Erreur"); else {
      toast.success("Abonnement mis à jour");
      setSubscription({ ...subscription, [field]: value });
    }
    setSaving(false);
  };

  const extendPeriod = async (months: number) => {
    if (!subscription) return;
    setSaving(true);
    const base = subscription.current_period_end ? new Date(subscription.current_period_end) : new Date();
    base.setMonth(base.getMonth() + months);
    const { error } = await supabase.from("subscriptions").update({
      current_period_end: base.toISOString(),
      status: "active",
    }).eq("id", subscription.id);
    if (error) toast.error("Erreur"); else {
      toast.success(`Prolongé de ${months} mois`);
      setSubscription({ ...subscription, current_period_end: base.toISOString(), status: "active" });
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || !id || !user) return;
    setSaving(true);
    const { data, error } = await supabase.from("admin_notes").insert({
      organization_id: id,
      author_id: user.id,
      content: newNote.trim(),
    }).select().single();
    if (error) toast.error("Erreur"); else {
      setNotes([data, ...notes]);
      setNewNote("");
      toast.success("Note ajoutée");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!org) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-20 text-muted-foreground">Organisation introuvable</div>
      </SuperAdminLayout>
    );
  }

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", trial: "secondary", past_due: "destructive", cancelled: "outline",
    };
    return map[s] || "outline";
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/organizations")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
              <Badge variant={org.is_active ? "default" : "destructive"}>
                {org.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Inscrit le {format(new Date(org.created_at), "dd MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <Button
            variant={org.is_active ? "destructive" : "default"}
            onClick={toggleActive}
            disabled={saving}
            className="gap-2"
          >
            {org.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {org.is_active ? "Désactiver" : "Activer"}
          </Button>
        </div>

        {/* Info + Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {org.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {org.email}
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {org.phone}
                </div>
              )}
              {org.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {org.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> Devise : {org.currency}
              </div>
            </CardContent>
          </Card>

          {/* Usage stats */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Biens", value: usage.properties, icon: Home },
                  { label: "Unités", value: usage.units, icon: DoorOpen },
                  { label: "Locataires", value: usage.tenants, icon: UserCheck },
                  { label: "Utilisateurs", value: usage.users, icon: Users },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-4 text-center">
                    <s.icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Plan</label>
                    <Select value={subscription.plan} onValueChange={(v) => updateSubscription("plan", v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Statut</label>
                    <Select value={subscription.status} onValueChange={(v) => updateSubscription("status", v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fin de période</label>
                    <p className="text-sm font-medium text-foreground h-9 flex items-center">
                      {subscription.current_period_end
                        ? format(new Date(subscription.current_period_end), "dd MMM yyyy", { locale: fr })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => extendPeriod(1)} disabled={saving}>
                    +1 mois
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => extendPeriod(3)} disabled={saving}>
                    +3 mois
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => extendPeriod(12)} disabled={saving}>
                    +12 mois
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun abonnement associé</p>
            )}
          </CardContent>
        </Card>

        {/* Admin notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes internes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ajouter une note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px]"
              />
              <Button onClick={addNote} disabled={saving || !newNote.trim()} size="icon" className="shrink-0 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune note</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(n.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminOrganizationDetail;
