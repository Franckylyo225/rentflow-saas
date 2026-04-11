import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, Loader2, Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractWizard } from "@/components/contracts/ContractWizard";
import { ContractViewDialog } from "@/components/contracts/ContractViewDialog";

interface LeaseDocumentsSectionProps {
  tenant: any;
  organizationSettings: any;
  onRefresh: () => void;
}

export function LeaseDocumentsSection({ tenant, organizationSettings, onRefresh }: LeaseDocumentsSectionProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [viewContract, setViewContract] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, [tenant.id]);

  async function fetchAll() {
    setLoading(true);
    const [docsRes, contractsRes] = await Promise.all([
      supabase
        .from("lease_documents")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("*, contract_templates(name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
    ]);
    setDocuments(docsRes.data || []);
    setContracts(contractsRes.data || []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${tenant.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("lease-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erreur upload : " + uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("lease_documents").insert({
      tenant_id: tenant.id,
      document_type: "uploaded",
      file_url: filePath,
      file_name: file.name,
      file_size: file.size,
    });

    if (insertError) toast.error("Erreur enregistrement : " + insertError.message);
    else { toast.success("Document uploadé"); fetchAll(); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownloadDoc(doc: any) {
    const { data, error } = await supabase.storage.from("lease-documents").download(doc.file_url);
    if (error) { toast.error("Erreur téléchargement"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePreviewDoc(doc: any) {
    const { data, error } = await supabase.storage.from("lease-documents").download(doc.file_url);
    if (error) { toast.error("Erreur"); return; }
    window.open(URL.createObjectURL(data), "_blank");
  }

  async function handleDeleteDoc(doc: any) {
    if (!confirm("Supprimer ce document ?")) return;
    await supabase.storage.from("lease-documents").remove([doc.file_url]);
    const { error } = await supabase.from("lease_documents").delete().eq("id", doc.id);
    if (error) toast.error("Erreur suppression");
    else { toast.success("Document supprimé"); fetchAll(); }
  }

  async function handleDeleteContract(contract: any) {
    if (!confirm("Supprimer ce contrat ?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", contract.id);
    if (error) toast.error("Erreur suppression");
    else { toast.success("Contrat supprimé"); fetchAll(); }
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / 1048576).toFixed(1) + " Mo";
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    signed: "Signé",
    archived: "Archivé",
  };
  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    signed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <>
      {/* Contracts section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Contrats de bail
            </CardTitle>
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Créer un contrat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun contrat. Cliquez sur "Créer un contrat" pour générer un contrat à partir d'un modèle.
            </p>
          ) : (
            <div className="space-y-2">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-card-foreground">
                        {contract.contract_templates?.name || "Contrat personnalisé"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ${statusColors[contract.status] || ""}`}>
                          {statusLabels[contract.status] || contract.status}
                        </span>
                        <span>{new Date(contract.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewContract(contract)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteContract(contract)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded documents section */}
      {documents.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Documents uploadés
              </CardTitle>
              <div>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Uploader
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-card-foreground">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(doc.file_size)}</span>
                        <span>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreviewDoc(doc)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadDoc(doc)}><Download className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDoc(doc)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload button when no docs yet */}
      {documents.length === 0 && (
        <div className="flex justify-center">
          <input ref={documents.length === 0 ? fileInputRef : undefined} type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Uploader un document
          </Button>
        </div>
      )}

      <ContractWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        tenant={tenant}
        organizationSettings={organizationSettings}
        onComplete={fetchAll}
      />

      {viewContract && (
        <ContractViewDialog
          contract={viewContract}
          open={!!viewContract}
          onOpenChange={() => setViewContract(null)}
          onRefresh={fetchAll}
        />
      )}
    </>
  );
}
