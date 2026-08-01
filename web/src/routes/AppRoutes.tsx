import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { StoragePage } from "../pages/StoragePage.js";
import { SearchPage } from "../pages/SearchPage.js";
import { ProfilePage } from "../pages/ProfilePage.js";
import { UsersPage } from "../pages/UsersPage.js";
import { NotFoundPage } from "../pages/NotFoundPage.js";
import { ProtectedRoute } from "../components/auth/ProtectedRoute.js";
import { AdminRoute } from "../components/auth/AdminRoute.js";
import { AppShell } from "../components/layout/AppShell.js";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirect Root / to /dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected Routes (Admin and Viewer) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin Only Protected Routes */}
      <Route element={<AdminRoute />}>
        <Route element={<AppShell />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
