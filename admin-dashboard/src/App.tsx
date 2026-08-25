import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import MerchantsPage from "./pages/Merchants";
import CampaignsPage from "./pages/Campaigns";
import UsersPage from "./pages/Users";
import SessionsPage from "./pages/Sessions";

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="merchants" element={<MerchantsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
