import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Lock, ArrowRight, Loader2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, loading: authLoading, signIn } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Check if any super admin exists
  useEffect(() => {
    supabase.functions
      .invoke("manage-super-admins", { body: { action: "check_any_exists" } })
      .then(({ data, error }) => {
        if (error) {
          setHasSuperAdmin(true); // Assume exists on error
        } else {
          setHasSuperAdmin(data?.exists ?? true);
          if (!data?.exists) setIsSignUp(true);
        }
      });
  }, []);

  if (authLoading || (user && adminLoading) || hasSuperAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (user && !adminLoading && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Accès refusé</h1>
          <p className="text-muted-foreground text-sm">
            Ce compte n'a pas les privilèges super administrateur.
          </p>
        </motion.div>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("manage-super-admins", {
      body: { action: "register_first", email, password },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erreur lors de l'inscription");
    } else {
      toast.success("Compte super administrateur créé ! Connectez-vous.");
      setIsSignUp(false);
      setHasSuperAdmin(true);
      setPassword("");
    }
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Identifiants invalides");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isSignUp ? "Créer le compte admin" : "Administration"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Aucun super administrateur n'existe encore. Créez le premier compte."
              : "Accès réservé aux super administrateurs RentFlow"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={isSignUp ? "signup" : "signin"}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rentflow.com"
                  className="pl-10 h-12 bg-muted/50 border-border/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-muted/50 border-border/60"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Créer le compte" : "Se connecter"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.form>
        </AnimatePresence>

        {/* Only show toggle if super admins already exist */}
        {hasSuperAdmin && (
          <p className="text-center text-xs text-muted-foreground">
            Seuls les comptes autorisés peuvent se connecter.
          </p>
        )}
      </motion.div>
    </div>
  );
}
