import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "Organisations", href: "/admin/organizations", icon: Building2 },
  { label: "Abonnements", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Super Admins", href: "/admin/admins", icon: Users },
];

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Super Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab navigation */}
        <nav className="flex items-center gap-1 mb-8 border-b border-border pb-px overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
