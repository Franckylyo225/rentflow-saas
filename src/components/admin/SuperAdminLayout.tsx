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
  UserCheck,
  ChevronLeft,
  Settings,
  Layers,
  Receipt,
  Mail,
  Contact as ContactIcon,
  BarChart3,
  Workflow,
  Rocket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "Organisations", href: "/admin/organizations", icon: Building2 },
  { label: "Plans tarifaires", href: "/admin/plans", icon: Layers },
  { label: "Abonnements", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Transactions", href: "/admin/transactions", icon: Receipt },
  { label: "Codes Promo", href: "/admin/promo-codes", icon: Settings },
  { label: "Super Admins", href: "/admin/admins", icon: Users },
  { label: "Utilisateurs", href: "/admin/users", icon: UserCheck },
  { label: "Pilote de croissance", href: "/admin/growth", icon: Rocket },
  { label: "Paramètres", href: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const isActive = (href: string) =>
    href === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="flex flex-col h-full">
        {/* Brand */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-foreground truncate">RentFlow</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Super Admin</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="mx-3 w-auto" />

        {/* Navigation */}
        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/admin"}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        activeClassName="bg-primary/10 text-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto px-3 pb-4 space-y-1">
          <Separator className="mb-3" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Déconnexion</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Déconnexion</TooltipContent>}
          </Tooltip>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-lg flex items-center px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <Separator orientation="vertical" className="h-5" />
            <p className="text-sm text-muted-foreground">Panneau d'administration</p>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
