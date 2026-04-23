import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ExternalLink, Mail } from "lucide-react";
import { downloadQuittance, getQuittanceBlob, type QuittanceData } from "@/lib/generateQuittance";
import { sendQuittanceEmail } from "@/lib/sendQuittanceEmail";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface QuittanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: QuittanceData | null;
}

function formatMonthLabel(m?: string) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) {
    return new Date(m + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  return m;
}

export function QuittanceDialog({ open, onOpenChange, data }: QuittanceDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    if (open && data) {
      setLoading(true);
      setPreviewUrl(null);
      getQuittanceBlob(data)
        .then((blob) => {
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setPreviewUrl(createdUrl);
        })
        .catch(() => { if (!cancelled) toast.error("Impossible de générer l'aperçu"); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, data]);

  if (!data) return null;

  const handleDownload = () => {
    downloadQuittance(data);
    toast.success("Quittance téléchargée");
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendEmail = async () => {
    if (!data) return;
    if (!data.tenantEmail) {
      toast.error("Le locataire n'a pas d'adresse email");
      return;
    }
    setSending(true);
    try {
      const blob = await getQuittanceBlob(data);
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const monthLabel = formatMonthLabel(data.month);
      const { error } = await supabase.functions.invoke("send-quittance-email", {
        body: {
          recipientEmail: data.tenantEmail,
          tenantName: data.tenantName,
          month: monthLabel,
          amount: data.paidAmount,
          organizationName: data.organizationName,
          pdfBase64,
          pdfFilename: `Quittance_${data.quittanceNumber ?? monthLabel}.pdf`,
          organizationId: data.organizationId,
          rentPaymentId: data.rentPaymentId,
        },
      });

      if (error) {
        console.error("Quittance email error:", error);
        toast.error("Échec de l'envoi de la quittance");
      } else {
        toast.success(`Quittance envoyée à ${data.tenantEmail}`);
      }
    } catch (err) {
      console.error("Failed to send quittance email:", err);
      toast.error("Échec de l'envoi de la quittance");
    } finally {
      setSending(false);
    }
  };

  const monthLabel = formatMonthLabel(data.month);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPreviewUrl(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">Quittance de loyer — {monthLabel}</DialogTitle>
          <DialogDescription>
            Aperçu PDF de la quittance. Téléchargez ou ouvrez dans un nouvel onglet.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-muted text-sm">
          <p className="font-medium text-card-foreground">{data.tenantName}</p>
          <p className="text-muted-foreground">{data.unitName} — {data.propertyName}</p>
          <p className="text-muted-foreground">Montant réglé : {data.paidAmount.toLocaleString()} FCFA</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Télécharger le PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSendEmail}
            disabled={sending || !data.tenantEmail}
            title={!data.tenantEmail ? "Locataire sans email" : "Envoyer la quittance par email"}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
            Envoyer par email
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenInNewTab} disabled={!previewUrl}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Ouvrir dans un onglet
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[500px] rounded-lg border border-border bg-muted/30 mt-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : previewUrl ? (
          <object
            key={previewUrl}
            data={`${previewUrl}#t=${Date.now()}`}
            type="application/pdf"
            className="w-full h-[500px] rounded-lg border border-border mt-2"
            aria-label="Aperçu de la quittance"
          >
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2 p-4 text-center">
              <p>L'aperçu PDF n'est pas pris en charge par votre navigateur.</p>
              <Button size="sm" variant="outline" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ouvrir dans un nouvel onglet
              </Button>
            </div>
          </object>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
