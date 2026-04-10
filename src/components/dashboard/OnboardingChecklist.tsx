import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Users, FileText, LayoutDashboard, Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProperties, useTenants } from "@/hooks/useData";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  route: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();

  const items = useMemo<ChecklistItem[]>(() => [
    {
      id: "property",
      title: "Ajouter un bien",
      description: "Créez votre premier bien immobilier (immeuble, villa…)",
      icon: Building2,
      route: "/properties",
      completed: properties.length > 0,
    },
    {
      id: "tenant",
      title: "Ajouter un locataire",
      description: "Enregistrez votre premier locataire avec son bail",
      icon: Users,
      route: "/tenants",
      completed: tenants.length > 0,
    },
    {
      id: "contract",
      title: "Créer un contrat",
      description: "Générez ou uploadez un contrat de bail",
      icon: FileText,
      route: tenants.length > 0 ? `/tenants/${tenants[0]?.id}` : "/tenants",
      completed: false, // Would need lease_documents check, simplified for now
    },
    {
      id: "dashboard",
      title: "Consulter le tableau de bord",
      description: "Découvrez vos indicateurs clés",
      icon: LayoutDashboard,
      route: "/dashboard",
      completed: properties.length > 0 && tenants.length > 0,
    },
  ], [properties, tenants]);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  // Hide if all done
  if (completedCount === items.length) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Premiers pas</CardTitle>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{items.length} terminé
          </span>
        </div>
        <Progress value={progressPct} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !item.completed && navigate(item.route)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      item.completed
                        ? "bg-primary/5 cursor-default"
                        : "hover:bg-muted/80 cursor-pointer group"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-colors ${
                        item.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      {item.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    {!item.completed && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.completed ? "Terminé ✓" : item.description}
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
