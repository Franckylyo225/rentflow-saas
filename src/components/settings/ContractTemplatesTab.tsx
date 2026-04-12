import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractEditorFullscreen } from "@/components/contracts/ContractEditorFullscreen";

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  template_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function ContractTemplatesTab() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erreur chargement des modèles");
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }

  function openCreate() {
    setIsCreating(true);
    setEditingTemplate(null);
    setIsEditorOpen(true);
  }

  function openEdit(template: ContractTemplate) {
    setIsCreating(false);
    setEditingTemplate(template);
    setIsEditorOpen(true);
  }

  async function handleSave(name: string, type: string, content: string) {
    if (!name.trim()) {
      toast.error("Le nom du modèle est requis");
      return;
    }
    setSaving(true);

    if (isCreating) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile) {
        toast.error("Organisation non trouvée");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("contract_templates").insert({
        organization_id: profile.organization_id,
        name,
        template_type: type,
        content,
        is_default: false,
      });

      if (error) {
        toast.error("Erreur : " + error.message);
      } else {
        toast.success("Modèle créé");
        fetchTemplates();
        setIsEditorOpen(false);
      }
    } else if (editingTemplate) {
      const { error } = await supabase
        .from("contract_templates")
        .update({ name, template_type: type, content })
        .eq("id", editingTemplate.id);

      if (error) {
        toast.error("Erreur : " + error.message);
      } else {
        toast.success("Modèle mis à jour");
        fetchTemplates();
        setIsEditorOpen(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(template: ContractTemplate) {
    if (template.is_default) {
      toast.error("Impossible de supprimer un modèle par défaut");
      return;
    }
    if (!confirm("Supprimer ce modèle de contrat ?")) return;

    const { error } = await supabase
      .from("contract_templates")
      .delete()
      .eq("id", template.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Modèle supprimé");
      fetchTemplates();
    }
  }

  // Show fullscreen editor
  if (isEditorOpen) {
    return (
      <ContractEditorFullscreen
        initialName={editingTemplate?.name || ""}
        initialType={editingTemplate?.template_type || "individual"}
        initialContent={editingTemplate?.content || ""}
        isCreating={isCreating}
        saving={saving}
        onSave={handleSave}
        onBack={() => setIsEditorOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Modèles de contrats
            </CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nouveau modèle
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez vos modèles de contrats de bail. Utilisez des variables dynamiques pour pré-remplir automatiquement les informations.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucun modèle de contrat. Créez votre premier modèle.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-card-foreground">
                        {template.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {template.template_type === "individual" ? "Personne physique" : "Entreprise"}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Par défaut
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Modifié le {new Date(template.updated_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!template.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variables reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Variables dynamiques disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: "{{tenant_name}}", label: "Nom du locataire" },
              { key: "{{tenant_phone}}", label: "Téléphone" },
              { key: "{{property_name}}", label: "Nom du bien" },
              { key: "{{unit_name}}", label: "Unité" },
              { key: "{{rent_amount}}", label: "Loyer" },
              { key: "{{start_date}}", label: "Date début" },
              { key: "{{end_date}}", label: "Date fin" },
              { key: "{{agency_name}}", label: "Agence" },
            ].map((v) => (
              <div key={v.key} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20">
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 shrink-0">
                  {v.key}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">{v.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu : {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 border border-border rounded-lg bg-card">
              <div dangerouslySetInnerHTML={{ __html: previewTemplate.content }} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
