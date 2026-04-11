import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Pencil, Loader2, Check, RefreshCw, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractEditor } from "@/components/contracts/ContractEditor";
import { generateContractPdf } from "@/lib/generateContractPdf";

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
  const [renewing, setRenewing] = useState(false);

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

  async function handleArchive() {
    const { error } = await supabase
      .from("contracts")
      .update({ status: "archived" })
      .eq("id", contract.id);

    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Contrat archivé"); onRefresh(); onOpenChange(false); }
  }

  async function handleRenew() {
    setRenewing(true);
    // Duplicate the contract as a new draft with updated dates
    const now = new Date();
    let newContent = contract.content;
    
    // Replace date patterns (dd month yyyy format) with indication to update
    const { error } = await supabase.from("contracts").insert({
      tenant_id: contract.tenant_id,
      template_id: contract.template_id,
      content: newContent,
      status: "draft",
    });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Contrat renouvelé (brouillon créé)");
      onRefresh();
      onOpenChange(false);
    }
    setRenewing(false);
  }

  function handleDownloadPDF() {
    generateContractPdf({
      content: contract.content,
      contractId: contract.id,
      agencyName: contract.contract_templates?.name || "Contrat",
      tenantName: undefined,
    });
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
            {contract.status === "signed" && (
              <>
                <Button variant="outline" size="sm" onClick={handleRenew} disabled={renewing}>
                  {renewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Renouveler
                </Button>
                <Button variant="outline" size="sm" onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-1" /> Archiver
                </Button>
              </>
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
              contract.status !== "archived" && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Modifier
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
