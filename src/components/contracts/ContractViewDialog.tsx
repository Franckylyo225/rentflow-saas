import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Pencil, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractEditor } from "@/components/contracts/ContractEditor";
import jsPDF from "jspdf";

interface ContractViewDialogProps {
  contract: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function ContractViewDialog({ contract, open, onOpenChange, onRefresh }: ContractViewDialogProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(contract.content);
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    signed: "Signé",
    archived: "Archivé",
  };

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("contracts")
      .update({ content: editContent })
      .eq("id", contract.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Contrat mis à jour");
      setEditing(false);
      onRefresh();
    }
    setSaving(false);
  }

  async function handleMarkSigned() {
    const { error } = await supabase
      .from("contracts")
      .update({ status: "signed" })
      .eq("id", contract.id);

    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Contrat marqué comme signé"); onRefresh(); onOpenChange(false); }
  }

  function handleDownloadPDF() {
    const doc = new jsPDF();
    const marginLeft = 20;
    const contentWidth = 170;
    let y = 20;

    // Strip HTML and convert to plain text sections
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contract.content;

    const elements = tempDiv.querySelectorAll("h1, h2, h3, p, li, hr");
    elements.forEach((el) => {
      if (y > 270) { doc.addPage(); y = 20; }

      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || "";

      if (tag === "hr") {
        doc.setDrawColor(200);
        doc.line(marginLeft, y, marginLeft + contentWidth, y);
        y += 6;
      } else if (tag === "h1") {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, marginLeft, y);
        y += lines.length * 7 + 4;
      } else if (tag === "h2") {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, marginLeft, y);
        y += lines.length * 6 + 3;
      } else if (tag === "h3") {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, marginLeft, y);
        y += lines.length * 5.5 + 2;
      } else if (text) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, marginLeft, y);
        y += lines.length * 5 + 2;
      }
    });

    doc.save(`contrat-${contract.id.slice(0, 8)}.pdf`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contract.contract_templates?.name || "Contrat"}
            <Badge variant="outline" className="text-xs">
              {statusLabels[contract.status] || contract.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <ContractEditor content={editContent} onChange={setEditContent} />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none p-6 border border-border rounded-lg bg-card max-h-[55vh] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: contract.content }} />
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex gap-2">
            {contract.status === "draft" && !editing && (
              <Button variant="outline" size="sm" onClick={handleMarkSigned}>
                <Check className="h-4 w-4 mr-1" /> Marquer signé
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditContent(contract.content); }}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Enregistrer
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Modifier
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
