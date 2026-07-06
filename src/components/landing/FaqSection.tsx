import { Shield, Users, MessageSquare, HelpCircle } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    icon: Users,
    question: "Est-ce que plusieurs agences ou collaborateurs peuvent utiliser Rentflow ?",
    answer:
      "Oui. Rentflow est conçu multi-tenant dès le départ : chaque agence dispose de son propre espace isolé, avec ses biens, ses locataires et ses utilisateurs. Au sein d'une agence, vous invitez admin, gestionnaires, comptables ou propriétaires et leur attribuez des rôles précis. Chacun ne voit que les données autorisées.",
  },
  {
    icon: MessageSquare,
    question: "Comment fonctionnent les relances automatiques par SMS et e-mail ?",
    answer:
      "Vous configurez une fois les règles de relance (ex. : J-5 avant l'échéance, J+3 après). Rentflow génère automatiquement les messages personnalisés et les envoie par e-mail ou via MonSMS Pro — notre routeur SMS local. Les locataires reçoivent un rappel clair avec le montant et la date d'échéance, et vous suivez les accusés de réception en temps réel.",
  },
  {
    icon: Shield,
    question: "Où sont stockées mes données et comment sont-elles protégées ?",
    answer:
      "Vos données sont hébergées dans une infrastructure cloud sécurisée avec chiffrement en transit (TLS) et au repos. L'accès est contrôlé par authentification sécurisée et des règles de sécurité au niveau des lignes (RLS) : chaque utilisateur ne peut lire ou modifier que ses propres données. Les sauvegardes sont automatiques et les mises à jour de sécurité appliquées en continu.",
  },
  {
    icon: HelpCircle,
    question: "Puis-je migrer mes données depuis Excel ou un autre logiciel ?",
    answer:
      "Oui. Un import par fichier Excel est disponible pour importer vos biens, locataires et baux existants. Notre équipe peut aussi vous accompagner pour une migration complète depuis votre outil actuel.",
  },
  {
    icon: MessageSquare,
    question: "Les SMS sont-ils facturés en plus de l'abonnement ?",
    answer:
      "Les forfaits Rentflow incluent un volume de crédits SMS. Au-delà, vous recharger simplement vos crédits MonSMS Pro selon vos besoins, sans engagement. Les e-mails et notifications dans l'application restent illimités.",
  },
  {
    icon: Shield,
    question: "Rentflow est-il conforme à la législation locale ?",
    answer:
      "Oui. Les modèles de baux, quittances et états des lieux sont alignés sur les textes en vigueur en Afrique de l'Ouest, notamment le cadre OHADA. Les documents sont générés automatiquement avec les mentions obligatoires et restent modifiables par votre équipe.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-secondary/40 border-y border-border/50">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Questions fréquentes
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Vos questions, nos réponses
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Tout ce qu'il faut savoir avant de passer à Rentflow.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="bg-card border border-border/60 rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-foreground/5">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <AccordionTrigger className="py-5 text-left hover:no-underline group">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                        <faq.icon className="h-4 w-4" />
                      </div>
                      <span className="font-display text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pl-[3.25rem]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
