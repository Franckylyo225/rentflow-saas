import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { RealEstateSalesSection } from "@/components/landing/RealEstateSalesSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { Seo } from "@/components/seo/Seo";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="RentFlow — Logiciel de gestion locative en Afrique"
        description="Gérez loyers, locataires, quittances et patrimoine immobilier depuis une seule plateforme pensée pour l'Afrique. Essai gratuit 7 jours."
        path="/"
      />
      <AnnouncementBanner />
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <RealEstateSalesSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
