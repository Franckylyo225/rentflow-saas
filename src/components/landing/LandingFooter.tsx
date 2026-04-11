import { Link } from "react-router-dom";

const FOOTER_LINKS = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "#pricing" },
    { label: "Témoignages", href: "#testimonials" },
  ],
  Entreprise: [
    { label: "À propos", href: "#" },
    { label: "Contact", href: "/contact", isRoute: true },
  ],
  Légal: [
    { label: "Conditions d'utilisation", href: "/terms", isRoute: true },
    { label: "Politique de confidentialité", href: "/privacy", isRoute: true },
    { label: "Mentions légales", href: "/legal", isRoute: true },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logo-horizontal.png" alt="RentFlow" className="h-8 mb-5" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              La plateforme de gestion locative conçue pour l'Afrique.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {category}
              </p>
              <ul className="space-y-3">
                {links.map((link: any) => (
                  <li key={link.label}>
                    {link.isRoute ? (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RentFlow. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
