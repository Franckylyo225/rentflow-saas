import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { OrgSettingsProvider } from "@/contexts/OrgSettingsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FeatureGate } from "@/components/auth/FeatureGate";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import Rents from "./pages/Rents";
import Expenses from "./pages/Expenses";
import Employees from "./pages/Employees";
import FinancialReports from "./pages/FinancialReports";
import SettingsPage from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Patrimoine from "./pages/Patrimoine";
import PatrimoineDetail from "./pages/PatrimoineDetail";
import MfaVerify from "./pages/MfaVerify";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminOrganizationDetail from "./pages/admin/AdminOrganizationDetail";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminLogin from "./pages/admin/AdminLogin";
import { SuperAdminRoute } from "./components/admin/SuperAdminRoute";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import LegalNotice from "./pages/legal/LegalNotice";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
        <OrgSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/mfa-verify" element={<MfaVerify />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/legal" element={<LegalNotice />} />
              <Route path="/contact" element={<Contact />} />

              {/* SaaS user routes */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
              <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
              <Route path="/tenants" element={<ProtectedRoute><FeatureGate featureKey="tenants"><Tenants /></FeatureGate></ProtectedRoute>} />
              <Route path="/tenants/:id" element={<ProtectedRoute><FeatureGate featureKey="tenants"><TenantDetail /></FeatureGate></ProtectedRoute>} />
              <Route path="/rents" element={<ProtectedRoute><FeatureGate featureKey="rents"><Rents /></FeatureGate></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><FeatureGate featureKey="expenses"><Expenses /></FeatureGate></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute><FeatureGate featureKey="employees"><Employees /></FeatureGate></ProtectedRoute>} />
              <Route path="/financial-reports" element={<ProtectedRoute><FeatureGate featureKey="reports"><FinancialReports /></FeatureGate></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Super Admin routes — separate auth */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/organizations" element={<SuperAdminRoute><AdminOrganizations /></SuperAdminRoute>} />
              <Route path="/admin/organizations/:id" element={<SuperAdminRoute><AdminOrganizationDetail /></SuperAdminRoute>} />
              <Route path="/admin/plans" element={<SuperAdminRoute><AdminPlans /></SuperAdminRoute>} />
              <Route path="/admin/subscriptions" element={<SuperAdminRoute><AdminSubscriptions /></SuperAdminRoute>} />
              <Route path="/admin/admins" element={<SuperAdminRoute><AdminAdmins /></SuperAdminRoute>} />
              <Route path="/admin/promo-codes" element={<SuperAdminRoute><AdminPromoCodes /></SuperAdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </OrgSettingsProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
