import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultPhone?: string;
  defaultName?: string;
  tenantId?: string;
  rentPaymentId?: string;
}

export function SendSmsDialog({
  open,
  onOpenChange,
  defaultPhone,
  defaultName,
  tenantId,
  rentPaymentId,
}: SendSmsDialogProps) {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const [phone, setPhone] = useState(defaultPhone || "");
  const [content, setContent] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [templates, setTemplates] = useState<{ id: string; label: string; content: string }[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhone(defaultPhone || "");
    setContent("");
    setTemplateId("none");
  }, [open, defaultPhone]);

  useEffect(() => {
    if (!orgId || !open) return;
    supabase
      .from("sms_templates")
      .select("id, label, content")
      .eq("organization_id", orgId)
      .then(({ data }) => setTemplates(data || []));
  }, [orgId, open]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "none") return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setContent(tpl.content);
  };

  const handleSend = async () => {
    if (!orgId || !phone || !content) return;
    setSending(true);

    // Insertion d'un message scheduled pour traitement immédiat par sms-process-queue
    const { data: msg, error: insertErr } = await supabase
      .from("sms_messages")
      .insert({
        organization_id: orgId,
        recipient_phone: phone,
        recipient_name: defaultName || null,
        content,
        tenant_id: tenantId || null,
        rent_payment_id: rentPaymentId || null,
        template_id: templateId === "none" ? null : templateId,
        trigger_type: "manual",
        status: "scheduled",
        scheduled_for: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !msg) {
      toast({ title: "Erreur", description: insertErr?.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // Déclencher l'envoi immédiat
    const { error: sendErr } = await supabase.functions.invoke("sms-send", {
      body: { sms_message_id: msg.id },
    });

    setSending(false);
    if (sendErr) {
      toast({
        title: "SMS programmé",
        description: "Il sera envoyé lors du prochain traitement automatique.",
      });
    } else {
      toast({ title: "SMS envoyé" });
    }
    onOpenChange(false);
  };

  const charCount = content.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Envoyer un SMS
          </DialogTitle>
          <DialogDescription>
            {defaultName ? `À ${defaultName}` : "Saisissez le numéro et le message."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Numéro de téléphone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 XX XX XX XX XX"
            />
          </div>

          {templates.length > 0 && (
            <div>
              <Label className="text-xs">Modèle (optionnel)</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Saisissez votre message…"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {charCount} caractères • {smsCount} SMS
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || !phone || !content} className="gap-2">
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
