import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, Calendar, History, Sparkles } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { SmsHistoryTable } from "./SmsHistoryTable";
import { SmsTemplatesEditor } from "./sms/SmsTemplatesEditor";
import { SmsSchedulesEditor } from "./sms/SmsSchedulesEditor";
import { FeatureLockedCard } from "@/components/auth/FeatureLockedCard";

export function SmsSettingsTab() {
  const { hasFeature, planName, loading } = useFeatureAccess();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const canSeeSms = hasFeature("sms_reminders") || hasFeature("sms_auto_basic");
  const canEditTemplates = hasFeature("sms_templates_edit");
  const canEditAllSchedules = hasFeature("sms_auto_full") || hasFeature("sms_schedule");
  const canEditBasicSchedules = hasFeature("sms_auto_basic");

  if (!canSeeSms) {
    return (
      <FeatureLockedCard
        title="Notifications SMS"
        description="Activez les rappels SMS automatiques pour réduire les retards de paiement et améliorer votre relation locataire."
        requiredPlan="Pro"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Système SMS intelligent
                <Badge variant="outline" className="text-[10px] font-normal gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> {planName}
                </Badge>
              </CardTitle>
              <CardDescription>
                Rappels automatiques, modèles personnalisables et envois manuels.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-3.5 w-3.5" /> Programmation
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-3.5 w-3.5" /> Modèles
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-3.5 w-3.5" /> Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <SmsSchedulesEditor
            canEditAll={canEditAllSchedules}
            canEditBasic={canEditBasicSchedules}
            planName={planName}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {canEditTemplates ? (
            <SmsTemplatesEditor canEdit={true} />
          ) : (
            <>
              <SmsTemplatesEditor canEdit={false} />
              <FeatureLockedCard
                title="Édition des modèles"
                description="Personnalisez le contenu de vos SMS avec vos propres formulations en passant à l'offre Pro."
                requiredPlan="Pro"
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <SmsHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
