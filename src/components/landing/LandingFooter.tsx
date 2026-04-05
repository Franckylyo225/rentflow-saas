import { Link } from "react-router-dom";

const FOOTER_LINKS = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "#pricing" },
    { label: "Témoignages", href: "#testimonials" },
  ],
  Entreprise: [
    { label: "À propos", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Carrières", href: "#" },
  ],
  Légal: [
    { label: "Conditions d'utilisation", href: "#" },
    { label: "Politique de confidentialité", href: "#" },
    { label: "Mentions légales", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logo-horizontal.png" alt="RentFlow" className="h-8 mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plateforme de gestion locative conçue pour l'Afrique.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-sm font-semibold text-foreground mb-4">{category}</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SCI Binieba. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
