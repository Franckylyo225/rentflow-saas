import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { ContractEditor } from "./ContractEditor";

interface ContractEditorFullscreenProps {
  initialName: string;
  initialType: string;
  initialContent: string;
  isCreating: boolean;
  saving: boolean;
  onSave: (name: string, type: string, content: string) => void;
  onBack: () => void;
}

export function ContractEditorFullscreen({
  initialName,
  initialType,
  initialContent,
  isCreating,
  saving,
  onSave,
  onBack,
}: ContractEditorFullscreenProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [content, setContent] = useState(initialContent);
  const [zoom, setZoom] = useState(100);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, type, content);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="h-5 w-px bg-border" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du modèle"
            className="h-9 max-w-xs font-medium"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Personne physique</SelectItem>
              <SelectItem value="company">Entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-muted rounded-lg px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium w-10 text-center text-muted-foreground">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isCreating ? "Créer" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Editor area with A4 page look */}
      <div className="flex-1 overflow-auto bg-muted/50">
        <div className="flex justify-center py-8 px-4">
          <div
            className="bg-background shadow-xl rounded-sm border border-border"
            style={{
              width: `${21 * (zoom / 100)}cm`,
              minHeight: `${29.7 * (zoom / 100)}cm`,
              padding: `${2 * (zoom / 100)}cm`,
              transform: `scale(1)`,
              transformOrigin: "top center",
            }}
          >
            <ContractEditor content={content} onChange={setContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
