import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, TrendingUp, Wallet, Plus, Pencil, Trash2, CheckCircle2, ArrowUpRight, ArrowDownRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureLockedCard } from "@/components/auth/FeatureLockedCard";
import { usePropertySales, SALES_COMMISSION_RATE, type SaleListing } from "@/hooks/usePropertySales";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("fr-FR");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Ventes() {
  const { hasFeature, loading } = useFeatureAccess();
  const allowed = loading || hasFeature("property_sales");

  const { listings, sales, addListing, updateListing, removeListing, recordSale } = usePropertySales();

  const [addOpen, setAddOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);
  const [editing, setEditing] = useState<SaleListing | null>(null);
  const [deleting, setDeleting] = useState<SaleListing | null>(null);

  // KPI
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const monthSales = useMemo(() => sales.filter(s => s.saleDate.slice(0, 7) === currentMonth).reduce((acc, s) => acc + s.salePrice, 0), [sales, currentMonth]);
  const prevMonthSales = useMemo(() => sales.filter(s => s.saleDate.slice(0, 7) === prevMonth).reduce((acc, s) => acc + s.salePrice, 0), [sales, prevMonth]);
  const totalSales = useMemo(() => sales.reduce((acc, s) => acc + s.salePrice, 0), [sales]);

  const variation = useMemo(() => {
    if (prevMonthSales === 0 && monthSales === 0) return { pct: 0, dir: "flat" as const };
    if (prevMonthSales === 0) return { pct: 100, dir: "up" as const };
    const v = Math.round(((monthSales - prevMonthSales) / prevMonthSales) * 100);
    return { pct: Math.abs(v), dir: v > 0 ? "up" as const : v < 0 ? "down" as const : "flat" as const };
  }, [monthSales, prevMonthSales]);

  if (!allowed) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ventes</h1>
            <p className="text-muted-foreground text-sm mt-1">Actifs en vente et historique des transactions</p>
          </div>
          <FeatureLockedCard
            title="Module Ventes Immobilières"
            description="Cette fonctionnalité est disponible à partir du plan Pro."
            requiredPlan="Pro"
          />
        </div>
      </AppLayout>
    );
  }

  function openSellFromListing(l: SaleListing) {
    setSelectedListingId(l.id);
    setPrefilledPrice(l.askingPrice);
    setSellOpen(true);
  }

  function openSellFromTopbar() {
    setSelectedListingId("");
    setPrefilledPrice(null);
    setSellOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ventes</h1>
            <p className="text-muted-foreground text-sm mt-1">Actifs en vente et historique des transactions</p>
          </div>
          <Button onClick={openSellFromTopbar} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
            <Plus className="h-4 w-4" /> Enregistrer une vente
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                  <Home className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actifs en vente</p>
                  <p className="text-2xl font-bold text-card-foreground">{listings.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{listings.length} bien{listings.length > 1 ? "s" : ""} actif{listings.length > 1 ? "s" : ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-success/15 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventes ce mois</p>
                  <p className="text-2xl font-bold text-card-foreground">{fmt(monthSales)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold mt-0.5",
                    variation.dir === "up" ? "text-success" : variation.dir === "down" ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {variation.dir === "up" ? <ArrowUpRight className="h-3 w-3" /> : variation.dir === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {variation.pct}% vs mois précédent
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-warning/15 text-warning">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CA total des ventes</p>
                  <p className="text-2xl font-bold text-card-foreground">{fmt(totalSales)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Depuis le début</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 1 — Actifs à vendre */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-card-foreground">Biens à vendre ({listings.length})</h2>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Ajouter un bien
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="text-right">Prix de vente</TableHead>
                    <TableHead>Ajouté le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun bien à vendre actuellement.</TableCell>
                    </TableRow>
                  ) : listings.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">{l.location}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(l.askingPrice)} FCFA</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(l.listedAt)}</TableCell>
                      <TableCell>
                        <Badge className="bg-success/15 text-success hover:bg-success/20 border-success/30">En vente</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-success" onClick={() => openSellFromListing(l)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marquer vendu
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleting(l)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — Historique des ventes */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-card-foreground">Historique des ventes ({sales.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="text-right">Prix de vente</TableHead>
                    <TableHead>Date de vente</TableHead>
                    <TableHead>Acheteur</TableHead>
                    <TableHead className="text-right">Commission agence</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucune vente enregistrée.</TableCell>
                    </TableRow>
                  ) : sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.location}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.salePrice)} FCFA</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(s.saleDate)}</TableCell>
                      <TableCell>{s.buyerName}</TableCell>
                      <TableCell className="text-right text-success font-semibold">{fmt(s.commission)} FCFA</TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground hover:bg-success/90">Finalisé</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddListingDialog open={addOpen} onOpenChange={setAddOpen} onAdd={(d) => { addListing(d); toast.success("Bien ajouté à la liste"); }} />
      <RecordSaleDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        listings={listings}
        defaultListingId={selectedListingId}
        defaultPrice={prefilledPrice}
        onConfirm={(listingId, data) => {
          recordSale(listingId, data);
          toast.success(`Vente enregistrée — +${fmt(data.salePrice)} FCFA ajouté au CA ✅`);
        }}
      />

      <EditListingDialog
        listing={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSave={(id, data) => {
          updateListing(id, data);
          toast.success("Bien mis à jour");
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de retirer&nbsp;
              <span className="font-semibold text-foreground">{deleting?.name}</span>&nbsp;
              de la liste des biens à vendre. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  removeListing(deleting.id);
                  toast.success("Bien retiré de la liste");
                }
                setDeleting(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function AddListingDialog({
  open, onOpenChange, onAdd,
}: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (d: { name: string; location: string; askingPrice: number; listedAt: string; }) => void; }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());

  function reset() {
    setName(""); setLocation(""); setPrice(""); setDate(todayISO());
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Ajouter un bien à vendre</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sname">Nom du bien</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Villa F4 Cocody" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sloc">Localisation / Quartier</Label>
            <Input id="sloc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Cocody Angré" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sprice">Prix de vente demandé (FCFA)</Label>
            <Input id="sprice" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 50000000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sdate">Date de mise en vente</Label>
            <Input id="sdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!name || !location || !price || !date}
            onClick={() => {
              onAdd({ name, location, askingPrice: Number(price) || 0, listedAt: date });
              onOpenChange(false);
              reset();
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordSaleDialog({
  open, onOpenChange, listings, defaultListingId, defaultPrice, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listings: SaleListing[];
  defaultListingId: string;
  defaultPrice: number | null;
  onConfirm: (listingId: string, data: { salePrice: number; saleDate: string; buyerName: string; commission: number; }) => void;
}) {
  const [listingId, setListingId] = useState(defaultListingId);
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "");
  const [date, setDate] = useState(todayISO());
  const [buyer, setBuyer] = useState("");
  const [commission, setCommission] = useState(defaultPrice ? Math.round(defaultPrice * SALES_COMMISSION_RATE).toString() : "");
  const [commissionEdited, setCommissionEdited] = useState(false);

  // Sync defaults when dialog opens with a listing
  useState(() => {
    setListingId(defaultListingId);
  });

  // When dialog re-opens with new defaults
  if (open && defaultListingId !== listingId && defaultListingId) {
    setListingId(defaultListingId);
    if (defaultPrice != null) {
      setPrice(defaultPrice.toString());
      setCommission(Math.round(defaultPrice * SALES_COMMISSION_RATE).toString());
      setCommissionEdited(false);
    }
  }

  function handlePriceChange(v: string) {
    setPrice(v);
    if (!commissionEdited) {
      const n = Number(v) || 0;
      setCommission(Math.round(n * SALES_COMMISSION_RATE).toString());
    }
  }

  function reset() {
    setListingId(""); setPrice(""); setDate(todayISO()); setBuyer(""); setCommission(""); setCommissionEdited(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Enregistrer une vente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bien vendu</Label>
            <Select value={listingId} onValueChange={(v) => {
              setListingId(v);
              const l = listings.find(x => x.id === v);
              if (l && !commissionEdited) {
                setPrice(l.askingPrice.toString());
                setCommission(Math.round(l.askingPrice * SALES_COMMISSION_RATE).toString());
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un bien en vente" /></SelectTrigger>
              <SelectContent>
                {listings.length === 0 ? (
                  <SelectItem value="none" disabled>Aucun bien en vente</SelectItem>
                ) : listings.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — {fmt(l.askingPrice)} FCFA</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vprice">Prix de vente final (FCFA)</Label>
            <Input id="vprice" type="number" value={price} onChange={(e) => handlePriceChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vdate">Date de vente</Label>
            <Input id="vdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vbuyer">Nom de l'acheteur</Label>
            <Input id="vbuyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Ex: Kouassi Amani" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vcom">Commission agence (5% par défaut)</Label>
            <Input id="vcom" type="number" value={commission} onChange={(e) => { setCommission(e.target.value); setCommissionEdited(true); }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!listingId || !price || !date || !buyer}
            onClick={() => {
              onConfirm(listingId, {
                salePrice: Number(price) || 0,
                saleDate: date,
                buyerName: buyer,
                commission: Number(commission) || 0,
              });
              onOpenChange(false);
              reset();
            }}
          >
            Confirmer la vente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditListingDialog({
  listing, onOpenChange, onSave,
}: {
  listing: SaleListing | null;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, data: { name: string; location: string; askingPrice: number; listedAt: string; }) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());

  // Sync form when a new listing is opened for edition
  if (listing && listing.name !== name && listing.location !== location && price === "") {
    // initial sync only when fields are empty
  }

  // Effect-like sync
  useMemo(() => {
    if (listing) {
      setName(listing.name);
      setLocation(listing.location);
      setPrice(listing.askingPrice.toString());
      setDate(listing.listedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  return (
    <Dialog open={!!listing} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Modifier le bien</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ename">Nom du bien</Label>
            <Input id="ename" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eloc">Localisation / Quartier</Label>
            <Input id="eloc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eprice">Prix de vente demandé (FCFA)</Label>
            <Input id="eprice" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edate">Date de mise en vente</Label>
            <Input id="edate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            disabled={!listing || !name || !location || !price || !date}
            onClick={() => {
              if (!listing) return;
              onSave(listing.id, { name, location, askingPrice: Number(price) || 0, listedAt: date });
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
