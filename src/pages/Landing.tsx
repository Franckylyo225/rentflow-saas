import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { RealEstateSalesSection } from "@/components/landing/RealEstateSalesSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { EarlyAdopterCTA } from "@/components/landing/EarlyAdopterCTA";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { Seo } from "@/components/seo/Seo";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="RentFlow — Logiciel de gestion locative en FCFA pour l'Afrique de l'Ouest"
        description="Loyers, quittances, relances SMS et comptabilité automatisés en FCFA. Le logiciel de gestion locative pensé pour les agences et propriétaires d'Afrique de l'Ouest. Essai gratuit 7 jours."
        path="/"
      />
      <AnnouncementBanner />
      <LandingNavbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ProblemSolutionSection />
      <RealEstateSalesSection />
      <PricingSection />
      <EarlyAdopterCTA />
      <TestimonialsSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;

