import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { PlanLimitBanner } from "./PlanLimitBanner";
import { useProfile } from "@/hooks/useProfile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { ReadOnlyContext } from "@/hooks/useReadOnly";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { toast } from "@/hooks/use-toast";

const READ_ONLY_MESSAGE =
  "Abonnement expiré : votre espace est en lecture seule. Renouvelez votre abonnement pour reprendre la saisie.";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, organization } = useProfile();
  const { expired } = usePlanLimits();
  const location = useLocation();

  // Routes / contexts where actions must remain usable (so users can still pay)
  const isOnSubscriptionArea =
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/support") ||
    location.pathname.startsWith("/help");

  useEffect(() => {
    if (!expired) return;

    const isAllowedTarget = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      // Anything explicitly opted-in
      if (el.closest("[data-allow-readonly]")) return true;
      // Navigation links / sidebar / tabs / menus / dialog close / popovers
      if (
        el.closest(
          'a, [data-sidebar], [role="tab"], [role="menuitem"], [role="menu"], [data-radix-collection-item], [aria-haspopup], [data-dismiss], [data-state="open"]'
        )
      )
        return true;
      // Allow toggling sidebar / dropdowns / dialog chrome (icon-only buttons w/o type=submit)
      const btn = el.closest("button") as HTMLButtonElement | null;
      if (btn && (btn.getAttribute("aria-label")?.toLowerCase().includes("fermer") || btn.dataset.state)) return true;
      return false;
    };

    const blockClick = (e: MouseEvent) => {
      if (isOnSubscriptionArea) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (isAllowedTarget(target)) return;
      const interactive = target.closest(
        'button, [type="submit"], [type="button"], input[type="submit"], input[type="reset"]'
      );
      if (interactive) {
        e.preventDefault();
        e.stopPropagation();
        toast({ title: "Action bloquée", description: READ_ONLY_MESSAGE, variant: "destructive" });
      }
    };

    const blockSubmit = (e: SubmitEvent) => {
      if (isOnSubscriptionArea) return;
      const form = e.target as HTMLElement | null;
      if (form?.closest("[data-allow-readonly]")) return;
      e.preventDefault();
      e.stopPropagation();
      toast({ title: "Action bloquée", description: READ_ONLY_MESSAGE, variant: "destructive" });
    };

    const blockKey = (e: KeyboardEvent) => {
      if (isOnSubscriptionArea) return;
      // Block Enter inside inputs that would submit forms
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-allow-readonly]")) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Only block if inside a form
        if (target.closest("form")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("click", blockClick, true);
    document.addEventListener("submit", blockSubmit, true);
    document.addEventListener("keydown", blockKey, true);
    return () => {
      document.removeEventListener("click", blockClick, true);
      document.removeEventListener("submit", blockSubmit, true);
      document.removeEventListener("keydown", blockKey, true);
    };
  }, [expired, isOnSubscriptionArea]);

  return (
    <ReadOnlyContext.Provider value={expired}>
      <div
        className="min-h-screen bg-background"
        data-readonly-mode={expired ? "true" : "false"}
      >
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-60 min-h-screen flex flex-col">
          <AppHeader
            onMenuClick={() => setSidebarOpen(true)}
            orgName={organization?.name}
            userName={profile?.full_name}
          />
          <PlanLimitBanner />
          <main className="flex-1" data-main-content="">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
        <GuidedTour />
      </div>
    </ReadOnlyContext.Provider>
  );
}
