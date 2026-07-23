import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AdminLayout } from "./components/layout/AdminLayout";
import { SupportLayout } from "./components/layout/SupportLayout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTickets from "./pages/admin/Tickets";
import Agents from "./pages/admin/Agents";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Permissions from "./pages/admin/Permissions";
import MyTickets from "./pages/support/MyTickets";
import Chat from "./pages/support/Chat";
import SupportActivity from "./pages/support/Activity";
import ReportIncident from "./pages/support/ReportIncident";

function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "admin" | "support";
}) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== role && user?.role) {
    // Redirect to their correct dashboard
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/support/tickets" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="agents" element={<Agents />} />
        <Route path="activity" element={<ActivityLogs />} />
        <Route path="permissions" element={<Permissions />} />
      </Route>

      {/* Support routes */}
      <Route
        path="/support"
        element={
          <ProtectedRoute role="support">
            <SupportLayout />
          </ProtectedRoute>
        }
      >
        <Route path="tickets" element={<MyTickets />} />
        <Route path="tickets/:id" element={<Chat />} />
        <Route path="activity" element={<SupportActivity />} />
        <Route path="report" element={<ReportIncident />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
