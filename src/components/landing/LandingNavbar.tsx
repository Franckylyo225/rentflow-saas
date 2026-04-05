import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "/pricing" },
  { label: "Témoignages", href: "#testimonials" },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className="max-w-5xl mx-auto bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl shadow-sm">
        <div className="px-5 sm:px-6">
          <div className="flex items-center justify-between h-[60px]">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-horizontal.png" alt="RentFlow" className="h-7" />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2.5">
              <Button variant="ghost" size="sm" className="text-sm font-medium rounded-xl" asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-xl px-5 text-sm font-semibold gap-2"
                asChild
              >
                <Link to="/auth">
                  Essai gratuit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/60 px-5 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild className="w-full rounded-xl">
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button size="sm" asChild className="w-full rounded-xl gap-2">
                <Link to="/auth">
                  Essai gratuit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
