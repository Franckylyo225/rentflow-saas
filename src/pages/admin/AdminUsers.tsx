import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Users, Building2, Shield, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_approved: boolean;
  created_at: string;
  organization_id: string;
  orgName: string;
  role: string;
  isSuperAdmin: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  gestionnaire: "Gestionnaire",
  comptable: "Comptable",
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");

  useEffect(() => {
    async function fetchUsers() {
      const [profilesRes, rolesRes, orgsRes, superAdminsRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, phone, is_approved, created_at, organization_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("organizations").select("id, name"),
        supabase.from("super_admins").select("user_id"),
      ]);

      const profiles = (profilesRes.data || []) as any[];
      const roles = (rolesRes.data || []) as any[];
      const orgs = (orgsRes.data || []) as any[];
      const superAdmins = (superAdminsRes.data || []) as any[];

      const orgMap = new Map(orgs.map((o: any) => [o.id, o.name]));
      const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
      const superAdminSet = new Set(superAdmins.map((s: any) => s.user_id));

      const enriched: UserRow[] = profiles.map((p: any) => ({
        ...p,
        orgName: orgMap.get(p.organization_id) || "—",
        role: roleMap.get(p.user_id) || "—",
        isSuperAdmin: superAdminSet.has(p.user_id),
      }));

      // Sort: super admins first, then by creation date desc
      enriched.sort((a, b) => {
        if (a.isSuperAdmin !== b.isSuperAdmin) return a.isSuperAdmin ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUsers(enriched);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  // Count orgs per user (admin role = manages the org)
  const orgCountByUser = new Map<string, number>();
  for (const u of users) {
    if (u.role === "admin") {
      orgCountByUser.set(u.user_id, (orgCountByUser.get(u.user_id) || 0) + 1);
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (filterApproval === "approved" && !u.is_approved) return false;
    if (filterApproval === "pending" && u.is_approved) return false;
    return true;
  });

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comptes utilisateurs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {users.length} utilisateur{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                <SelectItem value="comptable">Comptable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterApproval} onValueChange={setFilterApproval}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{users.filter(u => u.role === "admin").length}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{new Set(users.map(u => u.organization_id)).size}</p>
                  <p className="text-xs text-muted-foreground">Organisations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Mail className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{users.filter(u => !u.is_approved).length}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-center">Orgs gérées</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {(user.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.full_name || "—"}
                              </p>
                              {user.isSuperAdmin && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-600">
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.phone || "—"}</TableCell>
                        <TableCell>
                          <span className="text-sm">{user.orgName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {user.role === "admin" ? (orgCountByUser.get(user.user_id) || 1) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_approved ? "default" : "outline"}>
                            {user.is_approved ? "Approuvé" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminUsers;
