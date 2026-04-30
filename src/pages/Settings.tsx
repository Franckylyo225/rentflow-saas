import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Banknote, Users, Shield, Loader2, CreditCard, FileText, History, Bell } from "lucide-react";
import { NotificationPreferencesTab } from "@/components/settings/NotificationPreferencesTab";
import { ReminderHistoryTable } from "@/components/settings/ReminderHistoryTable";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { FinanceTab } from "@/components/settings/FinanceTab";
import { UsersRolesTab } from "@/components/settings/UsersRolesTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { SubscriptionTab } from "@/components/settings/SubscriptionTab";
import { ContractTemplatesTab } from "@/components/settings/ContractTemplatesTab";

export default function SettingsPage() {
  const { settings, loading, updateSettings, uploadLogo } = useOrganizationSettings();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration de votre espace RentFlow</p>
        </div>

        {loading || !settings ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Général</TabsTrigger>
              <TabsTrigger value="finance" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Finance</TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> Historique relances</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Utilisateurs & Rôles</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Sécurité</TabsTrigger>
              <TabsTrigger value="subscription" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Abonnement</TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Modèles de contrats</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab settings={settings} onSave={updateSettings} onUploadLogo={uploadLogo} />
            </TabsContent>

            <TabsContent value="finance">
              <FinanceTab settings={settings} onSave={updateSettings} />
            </TabsContent>

            <TabsContent value="history">
              <ReminderHistoryTable />
            </TabsContent>

            <TabsContent value="users">
              <UsersRolesTab />
            </TabsContent>

            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="subscription">
              <SubscriptionTab />
            </TabsContent>

            <TabsContent value="contracts">
              <ContractTemplatesTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
