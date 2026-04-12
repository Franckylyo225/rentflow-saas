import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { SmsSettingsTab } from "@/components/settings/SmsSettingsTab";

const AdminSms = () => {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion SMS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paramètres SMS, tests d'envoi et suivi des crédits
          </p>
        </div>
        <SmsSettingsTab />
      </div>
    </SuperAdminLayout>
  );
};

export default AdminSms;
