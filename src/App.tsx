import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import AdminLogin from "./pages/admin/AdminLogin";
import { SuperAdminRoute } from "./components/admin/SuperAdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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

              {/* SaaS user routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
              <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
              <Route path="/patrimoine" element={<ProtectedRoute><Patrimoine /></ProtectedRoute>} />
              <Route path="/patrimoine/:id" element={<ProtectedRoute><PatrimoineDetail /></ProtectedRoute>} />
              <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
              <Route path="/tenants/:id" element={<ProtectedRoute><TenantDetail /></ProtectedRoute>} />
              <Route path="/rents" element={<ProtectedRoute><Rents /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
              <Route path="/financial-reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
