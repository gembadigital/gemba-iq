import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import App from "./App";
import { useAuth } from "./lib/AuthContext";
import AuthLoadingScreen from "./components/auth/AuthLoadingScreen";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = AUTH_PATHS.includes(location.pathname);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user && !isAuthRoute) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && isAuthRoute) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/*" element={user ? <App /> : null} />
    </Routes>
  );
}

export default function RootApp() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
