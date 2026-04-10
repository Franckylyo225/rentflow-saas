import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Users, CreditCard, Star, BarChart3, Shield, Globe } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const FLOATING_CARDS = [
  { label: "Taux d'occupation", value: "97%", icon: BarChart3, position: "top-32 left-[8%]", rotation: "-6deg", delay: 0.3 },
  { label: "Multi-villes", value: "12", icon: Globe, position: "top-48 right-[6%]", rotation: "5deg", delay: 0.5 },
  { label: "Locataires actifs", value: "2 340", icon: Users, position: "bottom-52 left-[5%]", rotation: "4deg", delay: 0.7 },
  { label: "Sécurité", value: "A+", icon: Shield, position: "bottom-36 right-[8%]", rotation: "-4deg", delay: 0.9 },
];

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Hero background image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
      </div>
      {/* Soft gradient blobs */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] landing-blob rounded-full opacity-50" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] landing-blob rounded-full opacity-30" />
        <div className="absolute bottom-0 -left-40 w-[350px] h-[350px] landing-blob rounded-full opacity-25" />
      </div>

      {/* Floating cards — decorative, desktop only */}
      <div className="hidden lg:block">
        {FLOATING_CARDS.map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: card.rotation }}
            transition={{ duration: 0.8, delay: card.delay, ease: "easeOut" }}
            className={`absolute ${card.position} z-0`}
          >
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold text-foreground leading-none mt-0.5">{card.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection delay={0}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05]">
              Gérez vos biens{" "}
              <br className="hidden sm:block" />
              en toute{" "}
              <span className="gradient-text">simplicité</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.12}>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Centralisez la gestion de vos propriétés, locataires et loyers.
              Automatisez les relances et gardez le contrôle total.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.24}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="gap-2 text-base px-8 h-14 rounded-2xl font-semibold shadow-lg shadow-primary/20"
                asChild
              >
                <Link to="/auth">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-14 rounded-2xl font-medium bg-card border-border/60"
                asChild
              >
                <a href="#features">Voir les fonctionnalités</a>
              </Button>
            </div>
          </AnimatedSection>

          {/* Social proof */}
          <AnimatedSection delay={0.36}>
            <div className="mt-10 flex items-center justify-center gap-4">
              {/* Avatar stack */}
              <div className="flex -space-x-2.5">
                {["AD", "FN", "JM", "KT", "SA"].map((initials, i) => (
                  <div
                    key={initials}
                    className="h-9 w-9 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
                    style={{ zIndex: 5 - i }}
                  >
                    {initials}
                  </div>
                ))}
              </div>

              <div className="text-left">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">500+</span> propriétés gérées
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
