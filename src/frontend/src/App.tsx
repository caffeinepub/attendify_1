import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminPortal from "./pages/AdminPortal";
import EmployeePortal from "./pages/EmployeePortal";
import GatekeeperPortal from "./pages/GatekeeperPortal";
import LandingPage from "./pages/LandingPage";
import LoginModal from "./pages/LoginModal";

function AppRoutes() {
  const { auth } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (!auth) {
    return (
      <>
        <LandingPage onLogin={() => setShowLogin(true)} />
        <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      </>
    );
  }

  if (auth.role === "admin") return <AdminPortal />;
  if (auth.role === "gatekeeper") return <GatekeeperPortal />;
  return <EmployeePortal />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
