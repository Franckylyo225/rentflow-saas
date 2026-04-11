import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Send } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  subject: z.string().trim().min(1, "Le sujet est requis").max(200),
  message: z.string().trim().min(1, "Le message est requis").max(5000),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [isSending, setIsSending] = useState(false);
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-contact-email", {
        body: data,
      });

      if (error) throw error;
      if (result && !result.success) throw new Error(result.error);

      toast.success("Message envoyé avec succès !", {
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      form.reset();
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error("Erreur lors de l'envoi", {
        description: "Veuillez réessayer ou nous contacter directement par email.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <img src="/logo-horizontal.png" alt="RentFlow" className="h-7" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Contactez-nous
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une question, une demande de démonstration ou un besoin spécifique ? Notre équipe est à votre écoute.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Infos */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <a href="mailto:contact@rent-flow.net" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      contact@rent-flow.net
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Adresse</p>
                    <p className="text-sm text-muted-foreground">
                      New Wave Conception<br />Abidjan, Côte d'Ivoire
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Envoyez-nous un message</CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl><Input placeholder="Votre nom" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="vous@exemple.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet</FormLabel>
                        <FormControl><Input placeholder="L'objet de votre message" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Décrivez votre demande..." rows={6} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSending} className="w-full sm:w-auto">
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? "Envoi en cours..." : "Envoyer le message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
