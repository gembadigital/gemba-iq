import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { getPendingInvitationToken } from "./lib/invitationConstants";
import { OrganizationProvider, useOrganization } from "./lib/OrganizationContext";
import { CrmProvider } from "./lib/CrmContext";
import AuthLoadingScreen from "./components/auth/AuthLoadingScreen";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import JoinPage from "./components/auth/JoinPage";
import WelcomeWizard from "./components/onboarding/WelcomeWizard";
import AdministrationPage from "./components/auth/AdministrationPage";

const App = lazy(() => import("./App"));

function getUserInvitationToken(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  const token = user?.user_metadata?.invitation_token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

function getRouteInvitationToken(search: string, user: { user_metadata?: Record<string, unknown> } | null): string | null {
  const routeToken = new URLSearchParams(search).get("token");
  return routeToken || getPendingInvitationToken() || getUserInvitationToken(user);
}

function AdministrationRoute() {
  const { user } = useAuth();
  const { needsOnboarding, loading: orgLoading, isAdmin } = useOrganization();
  const location = useLocation();
  const pendingInvitationToken = getRouteInvitationToken(location.search, user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (orgLoading) {
    return <AuthLoadingScreen />;
  }

  if (needsOnboarding) {
    if (pendingInvitationToken) {
      return <Navigate to={`/join?token=${encodeURIComponent(pendingInvitationToken)}`} replace />;
    }
    return <WelcomeWizard />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <CrmProvider>
      <Suspense fallback={<AuthLoadingScreen />}>
        <AdministrationPage />
      </Suspense>
    </CrmProvider>
  );
}

function ProtectedApp() {
  const { user } = useAuth();
  const { needsOnboarding, loading: orgLoading } = useOrganization();
  const location = useLocation();
  const pendingInvitationToken = getRouteInvitationToken(location.search, user);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (orgLoading) {
    return <AuthLoadingScreen />;
  }

  if (needsOnboarding) {
    if (pendingInvitationToken) {
      return <Navigate to={`/join?token=${encodeURIComponent(pendingInvitationToken)}`} replace />;
    }
    return <WelcomeWizard />;
  }

  return (
    <CrmProvider>
      <Suspense fallback={<AuthLoadingScreen />}>
        <App />
      </Suspense>
    </CrmProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const pendingInvitationToken = getRouteInvitationToken(location.search, user);
  const authenticatedRedirect = pendingInvitationToken ? `/join?token=${encodeURIComponent(pendingInvitationToken)}` : "/";

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <OrganizationProvider>
      <Routes>
        <Route path="/join" element={<JoinPage />} />
        <Route path="/login" element={user ? <Navigate to={authenticatedRedirect} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={authenticatedRedirect} replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
        <Route path="/administration/*" element={<AdministrationRoute />} />
        <Route path="/admin/*" element={<AdministrationRoute />} />
        <Route path="/settings/*" element={<AdministrationRoute />} />
        <Route path="/licenses/*" element={<AdministrationRoute />} />
        <Route path="/license/*" element={<AdministrationRoute />} />
        <Route path="/system/*" element={<AdministrationRoute />} />
        <Route path="/security/*" element={<AdministrationRoute />} />
        <Route path="/connections/*" element={<AdministrationRoute />} />
        <Route path="/connection/*" element={<AdministrationRoute />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </OrganizationProvider>
  );
}

export default function RootApp() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
