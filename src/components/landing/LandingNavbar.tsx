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
    <div className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 pt-12">
      <nav className="max-w-6xl mx-auto bg-card/70 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-lg shadow-black/5 ring-1 ring-white/10">
        <div className="px-6 sm:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/logo-horizontal.png" alt="RentFlow" className="h-9 transition-transform duration-200 group-hover:scale-105" />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" className="text-[15px] font-medium rounded-xl h-10 px-5" asChild>
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button
                className="rounded-xl h-10 px-6 text-[15px] font-semibold gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
                asChild
              >
                <Link to="/auth">
                  Essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent/50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/40 px-6 py-5 space-y-3">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block text-[15px] font-medium text-muted-foreground hover:text-foreground py-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-[15px] font-medium text-muted-foreground hover:text-foreground py-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}
            <div className="pt-4 border-t border-border/40 flex flex-col gap-2.5">
              <Button variant="outline" asChild className="w-full rounded-xl h-10">
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button asChild className="w-full rounded-xl h-10 gap-2 shadow-md shadow-primary/20">
                <Link to="/auth">
                  Essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
