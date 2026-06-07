import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Loader2, Shield, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SuperAdmin {
  id: string;
  user_id: string;
  created_at: string;
  email?: string;
}

export default function AdminAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    const { data } = await supabase.from("super_admins").select("*");
    if (data) {
      // Fetch emails for each admin
      const adminsWithEmail: SuperAdmin[] = [];
      for (const admin of data) {
        // We'll show user_id since we can't read auth.users
        adminsWithEmail.push({ ...admin, email: undefined });
      }
      setAdmins(adminsWithEmail);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("manage-super-admins", {
      body: { action: "add_admin", email, password },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erreur");
    } else {
      toast.success("Super administrateur ajouté");
      setEmail("");
      setPassword("");
      setDialogOpen(false);
      fetchAdmins();
    }
    setSubmitting(false);
  };

  const handleRemove = async (adminUserId: string) => {
    const { data, error } = await supabase.functions.invoke("manage-super-admins", {
      body: { action: "remove_admin", user_id: adminUserId },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erreur");
    } else {
      toast.success("Super administrateur retiré");
      fetchAdmins();
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Super Administrateurs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les comptes super administrateurs de la plateforme
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un super administrateur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@rentflow.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le compte"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comptes super admin ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun super administrateur</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {admin.user_id === user?.id ? "Vous" : "Super Admin"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ajouté le {new Date(admin.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    {admin.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(admin.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
