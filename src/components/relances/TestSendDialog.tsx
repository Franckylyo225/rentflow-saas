import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, Smartphone, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface TestSendDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSubject?: string;
  defaultBody?: string;
}

const sampleVars: Record<string, string> = {
  "[Prénom]": "Awa",
  "[Montant]": "250 000 FCFA",
  "[Date échéance]": "30/04/2025",
  "[Bien]": "Appartement Cocody",
  "[Lien paiement]": "https://example.com/pay/123",
  "{{tenant_name}}": "Awa Koné",
  "{{rent_amount}}": "250 000",
  "{{due_date}}": "30/04/2025",
  "{{agency_name}}": "Mon Agence",
};

function renderPreview(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(sampleVars)) {
    out = out.split(k).join(v);
  }
  return out;
}

export function TestSendDialog({
  open, onOpenChange, defaultSubject, defaultBody,
}: TestSendDialogProps) {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const [tab, setTab] = useState<"email" | "sms">("email");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [subject, setSubject] = useState(defaultSubject || "Test relance — RentFlow");
  const [body, setBody] = useState(
    defaultBody ||
      "Bonjour [Prénom], ceci est un message de test de votre système de relances. Loyer : [Montant] pour [Bien].",
  );
  const [sending, setSending] = useState(false);

  const previewSubject = renderPreview(subject);
  const previewBody = renderPreview(body);

  const handleSendEmail = async () => {
    if (!email || !subject || !body) {
      toast.error("Email, objet et message requis");
      return;
    }
    setSending(true);
    try {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:hsl(160,84%,39%);padding:20px;text-align:center;color:#fff">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:999px;font-size:11px;margin-bottom:8px">TEST</div>
            <h1 style="color:#fff;margin:0;font-size:20px">${previewSubject}</h1>
          </div>
          <div style="padding:24px;color:#1a1a2e;font-size:14px;line-height:1.6;white-space:pre-wrap">${previewBody}</div>
          <div style="padding:12px 24px;background:#f9fafb;color:#888;font-size:11px;text-align:center">
            Email de test envoyé depuis la page Relances
          </div>
        </div>`;
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          templateName: "__inline__",
          recipientEmail: email,
          inlineSubject: `[TEST] ${previewSubject}`,
          inlineHtml: html,
          templateData: {},
          organizationId: orgId,
        },
      });
      if (error) throw error;
      if (data?.skipped) {
        toast.warning("Envoi ignoré", { description: data?.reason });
      } else {
        toast.success(`Email de test envoyé à ${email} ✓`);
      }
    } catch (e: any) {
      toast.error("Erreur d'envoi", { description: e?.message ?? String(e) });
    } finally {
      setSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!orgId || !phone || !body) {
      toast.error("Numéro et message requis");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: {
          organization_id: orgId,
          to: phone,
          message: `[TEST] ${previewBody}`,
          trigger_type: "test",
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`SMS de test envoyé à ${phone} ✓`);
      } else {
        toast.error("Échec d'envoi SMS", {
          description: typeof data?.error === "string" ? data.error : JSON.stringify(data?.error),
        });
      }
    } catch (e: any) {
      toast.error("Erreur d'envoi", { description: e?.message ?? String(e) });
    } finally {
      setSending(false);
    }
  };

  const charCount = previewBody.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Tester l'envoi des relances
          </DialogTitle>
          <DialogDescription>
            Envoyez un email ou SMS de test pour vérifier votre configuration. Les variables
            (ex. <code className="text-xs">[Prénom]</code>) sont remplacées par des valeurs d'exemple.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "sms")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-3.5 w-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <Smartphone className="h-3.5 w-3.5" /> SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Adresse email destinataire</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Saisissez votre message…"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Prévisualisation</Badge>
                <span className="text-xs text-muted-foreground">avec variables remplacées</span>
              </div>
              <div className="text-sm font-medium text-foreground">{previewSubject}</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{previewBody}</div>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Numéro de téléphone destinataire</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Saisissez votre message…"
              />
              <p className="text-xs text-muted-foreground">
                {charCount} caractères • {smsCount} SMS
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Prévisualisation</Badge>
                <span className="text-xs text-muted-foreground">avec variables remplacées</span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{previewBody}</div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Fermer
          </Button>
          <Button
            onClick={tab === "email" ? handleSendEmail : handleSendSms}
            disabled={sending}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Envoyer le test {tab === "email" ? "email" : "SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
