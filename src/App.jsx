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

// Placeholder components for other routes
const Reports = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Reports</h1>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Analytics & Reports</h2>
      {/* Add your reports content here */}
    </div>
  </div>
);

const Account = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Account Settings</h1>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Profile Information</h2>
      {/* Add your account settings content here */}
    </div>
  </div>
);

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
