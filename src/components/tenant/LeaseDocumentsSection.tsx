import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, Loader2, Plus, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadContratBail, getContratBailBlob } from "@/lib/generateContratBail";
import type { ContratBailData } from "@/lib/generateContratBail";

interface LeaseDocumentsSectionProps {
  tenant: any;
  organizationSettings: any;
  onRefresh: () => void;
}

export function LeaseDocumentsSection({ tenant, organizationSettings, onRefresh }: LeaseDocumentsSectionProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents on mount
  useState(() => {
    fetchDocuments();
  });

  async function fetchDocuments() {
    setLoading(true);
    const { data } = await supabase
      .from("lease_documents")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
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

    const { data: urlData } = supabase.storage
      .from("lease-documents")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("lease_documents").insert({
      tenant_id: tenant.id,
      document_type: "uploaded",
      file_url: filePath,
      file_name: file.name,
      file_size: file.size,
    });

    if (insertError) {
      toast.error("Erreur enregistrement : " + insertError.message);
    } else {
      toast.success("Contrat uploadé");
      fetchDocuments();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    setGenerating(true);

    const org = organizationSettings;
    const contractData: ContratBailData = {
      organizationName: org?.name || "Mon entreprise",
      organizationAddress: org?.address || "",
      organizationPhone: org?.phone || "",
      organizationEmail: org?.email || "",
      legalName: org?.legal_name || "",
      legalId: org?.legal_id || "",
      legalAddress: org?.legal_address || "",
      tenantName: tenant.full_name,
      tenantPhone: tenant.phone,
      tenantEmail: tenant.email || "",
      tenantIdNumber: tenant.id_number || "",
      tenantType: tenant.tenant_type,
      companyName: tenant.company_name || "",
      contactPerson: tenant.contact_person || "",
      rccm: tenant.rccm || "",
      propertyName: tenant.units?.properties?.name || "",
      propertyAddress: tenant.units?.properties?.address || "",
      cityName: tenant.units?.properties?.cities?.name || "",
      unitName: tenant.units?.name || "",
      leaseStart: tenant.lease_start,
      leaseDuration: tenant.lease_duration,
      rent: tenant.rent,
      deposit: tenant.deposit,
      rentDueDay: org?.rent_due_day || 5,
      lateFeeEnabled: org?.late_fee_enabled || false,
      lateFeeType: org?.late_fee_type || "fixed",
      lateFeeValue: org?.late_fee_value || 0,
      lateFeeGraceDays: org?.late_fee_grace_days || 0,
    };

    try {
      // Generate PDF blob and upload
      const blob = getContratBailBlob(contractData);
      const fileName = `contrat-bail-${tenant.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      const filePath = `${tenant.id}/${Date.now()}-generated.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("lease-documents")
        .upload(filePath, blob, { contentType: "application/pdf" });

      if (uploadError) {
        // Fallback: just download locally
        downloadContratBail(contractData);
        toast.success("Contrat téléchargé (sauvegarde locale)");
        setGenerating(false);
        return;
      }

      const { error: insertError } = await supabase.from("lease_documents").insert({
        tenant_id: tenant.id,
        document_type: "generated",
        file_url: filePath,
        file_name: fileName,
        file_size: blob.size,
      });

      if (insertError) {
        toast.error("Erreur enregistrement : " + insertError.message);
      } else {
        toast.success("Contrat de bail généré et sauvegardé");
        fetchDocuments();
      }
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    }
    setGenerating(false);
  }

  async function handleDownload(doc: any) {
    const { data, error } = await supabase.storage
      .from("lease-documents")
      .download(doc.file_url);

    if (error) {
      toast.error("Erreur téléchargement : " + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePreview(doc: any) {
    const { data, error } = await supabase.storage
      .from("lease-documents")
      .download(doc.file_url);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    window.open(url, "_blank");
  }

  async function handleDelete(doc: any) {
    if (!confirm("Supprimer ce document ?")) return;

    await supabase.storage.from("lease-documents").remove([doc.file_url]);
    const { error } = await supabase.from("lease_documents").delete().eq("id", doc.id);

    if (error) {
      toast.error("Erreur suppression : " + error.message);
    } else {
      toast.success("Document supprimé");
      fetchDocuments();
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / 1048576).toFixed(1) + " Mo";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Contrats de bail
          </CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.png"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Uploader
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Générer contrat
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun contrat de bail. Uploadez ou générez un contrat.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-card-foreground">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {doc.document_type === "generated" ? "Généré" : "Uploadé"}
                      </Badge>
                      <span>{formatSize(doc.file_size)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
