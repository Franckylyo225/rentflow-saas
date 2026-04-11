import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { navItems } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { X, Lock, CreditCard, ArrowUpRight } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { profile, role } = useProfile();
  const { settings } = useOrganizationSettings();
  const { hasFeature, loading: featuresLoading } = useFeatureAccess();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleLabel = role?.role === "admin" ? "Administrateur" : role?.role === "gestionnaire" ? "Gestionnaire" : role?.role === "comptable" ? "Comptable" : "";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-60 flex flex-col bg-card border-r border-border transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center px-3 h-14 border-b border-border">
          <img src="/logo-horizontal.png" alt="RentFlow" className="h-10 object-contain" />
          <button onClick={onClose} className="ml-auto lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter(item => item.path !== "/employees" || settings?.salaries_enabled === true)
            .map((item) => {
            const isActive = location.pathname === item.path;
            const isLocked = !featuresLoading && item.featureKey !== null && !hasFeature(item.featureKey);

            if (isLocked) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground/50 cursor-pointer transition-all duration-150"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">Non inclus dans votre offre</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "Utilisateur"}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
