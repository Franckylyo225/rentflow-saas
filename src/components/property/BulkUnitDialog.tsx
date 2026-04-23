import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Copy, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BulkUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** Noms d'unités déjà existantes pour éviter les doublons */
  existingNames: string[];
  onCompleted: () => void;
}

interface CustomRow {
  name: string;
  rent: string;
  charges: string;
  rooms: string;
  floor: string;
}

function emptyRow(): CustomRow {
  return { name: "", rent: "", charges: "", rooms: "1", floor: "" };
}

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

export function BulkUnitDialog({ open, onOpenChange, propertyId, existingNames, onCompleted }: BulkUnitDialogProps) {
  const [mode, setMode] = useState<"single" | "identical" | "custom">("single");
  const [saving, setSaving] = useState(false);

  // Single
  const [single, setSingle] = useState<CustomRow>(emptyRow());

  // Identical (bulk same template)
  const [count, setCount] = useState<string>("5");
  const [prefix, setPrefix] = useState<string>("Apt ");
  const [startNumber, setStartNumber] = useState<string>("1");
  const [padding, setPadding] = useState<string>("0");
  const [tplRent, setTplRent] = useState<string>("");
  const [tplCharges, setTplCharges] = useState<string>("");
  const [tplRooms, setTplRooms] = useState<string>("1");
  const [tplFloor, setTplFloor] = useState<string>("");

  // Custom (list)
  const [rows, setRows] = useState<CustomRow[]>([emptyRow(), emptyRow()]);

  useEffect(() => {
    if (open) {
      setMode("single");
      setSingle(emptyRow());
      setCount("5");
      setPrefix("Apt ");
      setStartNumber("1");
      setPadding("0");
      setTplRent("");
      setTplCharges("");
      setTplRooms("1");
      setTplFloor("");
      setRows([emptyRow(), emptyRow()]);
    }
  }, [open]);

  const previewNames = useMemo(() => {
    const n = Math.max(0, Math.min(100, parseInt(count, 10) || 0));
    const start = parseInt(startNumber, 10) || 1;
    const p = Math.max(0, parseInt(padding, 10) || 0);
    return Array.from({ length: n }, (_, i) => `${prefix}${pad(start + i, p)}`);
  }, [count, prefix, startNumber, padding]);

  const buildPayload = (): { rows: any[]; errors: string[] } => {
    const errors: string[] = [];
    let payload: any[] = [];
    const seen = new Set(existingNames.map(n => n.trim().toLowerCase()));

    if (mode === "single") {
      if (!single.name.trim()) errors.push("Le numéro d'unité est requis.");
      if (!single.rent || parseInt(single.rent, 10) <= 0) errors.push("Le loyer est requis.");
      if (seen.has(single.name.trim().toLowerCase())) errors.push(`Le nom « ${single.name} » existe déjà.`);
      if (errors.length === 0) {
        payload = [{
          property_id: propertyId,
          name: single.name.trim(),
          rent: parseInt(single.rent, 10),
          charges: parseInt(single.charges, 10) || 0,
          rooms: parseInt(single.rooms, 10) || 1,
          floor: single.floor ? parseInt(single.floor, 10) : null,
          status: "vacant" as const,
        }];
      }
    } else if (mode === "identical") {
      const n = parseInt(count, 10) || 0;
      if (n < 1) errors.push("Indiquez au moins 1 unité à créer.");
      if (n > 100) errors.push("Maximum 100 unités par lot.");
      if (!tplRent || parseInt(tplRent, 10) <= 0) errors.push("Le loyer est requis.");
      const dup: string[] = [];
      previewNames.forEach(name => {
        const key = name.trim().toLowerCase();
        if (seen.has(key)) dup.push(name);
        else seen.add(key);
      });
      if (dup.length) errors.push(`Noms en doublon : ${dup.slice(0, 5).join(", ")}${dup.length > 5 ? "…" : ""}`);
      if (errors.length === 0) {
        payload = previewNames.map(name => ({
          property_id: propertyId,
          name,
          rent: parseInt(tplRent, 10),
          charges: parseInt(tplCharges, 10) || 0,
          rooms: parseInt(tplRooms, 10) || 1,
          floor: tplFloor ? parseInt(tplFloor, 10) : null,
          status: "vacant" as const,
        }));
      }
    } else if (mode === "custom") {
      const valid = rows.filter(r => r.name.trim() && r.rent);
      if (valid.length === 0) errors.push("Ajoutez au moins une unité avec un nom et un loyer.");
      const dup: string[] = [];
      valid.forEach(r => {
        const key = r.name.trim().toLowerCase();
        if (seen.has(key)) dup.push(r.name);
        else seen.add(key);
      });
      if (dup.length) errors.push(`Noms en doublon : ${dup.slice(0, 5).join(", ")}${dup.length > 5 ? "…" : ""}`);
      if (errors.length === 0) {
        payload = valid.map(r => ({
          property_id: propertyId,
          name: r.name.trim(),
          rent: parseInt(r.rent, 10),
          charges: parseInt(r.charges, 10) || 0,
          rooms: parseInt(r.rooms, 10) || 1,
          floor: r.floor ? parseInt(r.floor, 10) : null,
          status: "vacant" as const,
        }));
      }
    }
    return { rows: payload, errors };
  };

  const handleSave = async () => {
    const { rows: payload, errors } = buildPayload();
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("units").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(payload.length === 1 ? "Unité ajoutée" : `${payload.length} unités ajoutées`);
    onOpenChange(false);
    onCompleted();
  };

  const updateRow = (i: number, patch: Partial<CustomRow>) => {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows(rs => [...rs, emptyRow()]);
  const duplicateRow = (i: number) => setRows(rs => {
    const copy = [...rs];
    copy.splice(i + 1, 0, { ...rs[i], name: "" });
    return copy;
  });
  const removeRow = (i: number) => setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" />
            Ajouter des unités
          </DialogTitle>
          <DialogDescription>
            Créez une unité, plusieurs unités identiques avec numérotation automatique, ou une liste sur mesure.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">1 unité</TabsTrigger>
            <TabsTrigger value="identical">En lot (identiques)</TabsTrigger>
            <TabsTrigger value="custom">Liste sur mesure</TabsTrigger>
          </TabsList>

          {/* SINGLE */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Numéro unité</Label>
              <Input value={single.name} onChange={e => setSingle({ ...single, name: e.target.value })} placeholder="Ex: Apt 301" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pièces</Label>
                <Input type="number" min="1" value={single.rooms} onChange={e => setSingle({ ...single, rooms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Étage (optionnel)</Label>
                <Input type="number" min="0" value={single.floor} onChange={e => setSingle({ ...single, floor: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Loyer (FCFA)</Label>
                <Input type="number" value={single.rent} onChange={e => setSingle({ ...single, rent: e.target.value })} placeholder="Ex: 350000" />
              </div>
              <div className="space-y-2">
                <Label>Charges (FCFA)</Label>
                <Input type="number" value={single.charges} onChange={e => setSingle({ ...single, charges: e.target.value })} placeholder="Ex: 25000" />
              </div>
            </div>
          </TabsContent>

          {/* IDENTICAL */}
          <TabsContent value="identical" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Nombre d'unités</Label>
                <Input type="number" min="1" max="100" value={count} onChange={e => setCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Préfixe</Label>
                <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="Apt " />
              </div>
              <div className="space-y-2">
                <Label>N° de départ</Label>
                <Input type="number" min="0" value={startNumber} onChange={e => setStartNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Padding (zéros)</Label>
                <Input type="number" min="0" max="5" value={padding} onChange={e => setPadding(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pièces</Label>
                <Input type="number" min="1" value={tplRooms} onChange={e => setTplRooms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Étage (optionnel)</Label>
                <Input type="number" min="0" value={tplFloor} onChange={e => setTplFloor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Loyer (FCFA)</Label>
                <Input type="number" value={tplRent} onChange={e => setTplRent(e.target.value)} placeholder="Ex: 350000" />
              </div>
              <div className="space-y-2">
                <Label>Charges (FCFA)</Label>
                <Input type="number" value={tplCharges} onChange={e => setTplCharges(e.target.value)} placeholder="Ex: 25000" />
              </div>
            </div>

            {previewNames.length > 0 && (
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-xs font-medium text-foreground mb-1">Aperçu ({previewNames.length} unités)</p>
                <p className="text-xs text-muted-foreground">
                  {previewNames.slice(0, 8).join(", ")}{previewNames.length > 8 ? `, … ${previewNames[previewNames.length - 1]}` : ""}
                </p>
              </div>
            )}
          </TabsContent>

          {/* CUSTOM */}
          <TabsContent value="custom" className="space-y-3 mt-4">
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-md border border-border bg-card">
                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    {i === 0 && <Label className="text-xs">Nom</Label>}
                    <Input value={row.name} onChange={e => updateRow(i, { name: e.target.value })} placeholder="Ex: Apt 1A" className="h-9" />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Pièces</Label>}
                    <Input type="number" min="1" value={row.rooms} onChange={e => updateRow(i, { rooms: e.target.value })} className="h-9" />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Étage</Label>}
                    <Input type="number" min="0" value={row.floor} onChange={e => updateRow(i, { floor: e.target.value })} className="h-9" placeholder="—" />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Loyer</Label>}
                    <Input type="number" value={row.rent} onChange={e => updateRow(i, { rent: e.target.value })} className="h-9" placeholder="350000" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Charges</Label>}
                    <Input type="number" value={row.charges} onChange={e => updateRow(i, { charges: e.target.value })} className="h-9" placeholder="0" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex gap-1 justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => duplicateRow(i)} title="Dupliquer">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeRow(i)} disabled={rows.length === 1} title="Retirer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </Button>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground">Statut par défaut : Vacant</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
