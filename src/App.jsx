import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./lib/AuthContext";
import { ThemeProvider } from "./components/theme/theme-provider";
import { LoginPage } from "./components/auth/LoginPage";
import { SignUpPage } from "./components/auth/SignUpPage";
import { Dashboard } from "./components/Dashboard";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SuppliesStock } from "./components/pages/SuppliesStock";
import { ReleaseSupply } from "./components/pages/ReleaseSupply";
import { GenerateExport } from "./components/pages/GenerateExport";
import { DeliveryPage } from "./components/pages/DeliveryPage";
import { Reports } from "./components/pages/Reports";
import { Account } from "./components/pages/Account";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pgo-theme">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DeliveryPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supplies"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SuppliesStock />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/release-supply"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ReleaseSupply />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/generate-export"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <GenerateExport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Account />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
