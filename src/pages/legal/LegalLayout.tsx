import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Seo } from "@/components/seo/Seo";
import { ReactNode } from "react";

export function LegalLayout({
  title,
  lastUpdated,
  children,
  path,
  seoDescription,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  path?: string;
  seoDescription?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {path && (
        <Seo
          title={`${title} — Loca.ci`}
          description={seoDescription ?? `${title} de Loca.ci, plateforme de gestion locative en Afrique.`}
          path={path}
        />
      )}
      <LandingNavbar />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-28 pb-20">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : {lastUpdated}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
