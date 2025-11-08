import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { Loader2 } from "lucide-react"; // Loading spinner

interface ProtectedRouteProps {
  children?: React.ReactNode; // Make children optional if using <Outlet />
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token, isLoading } = useAuth(); // <-- 1. Get the new isLoading state

  // 2. Jab tak app storage se check kar raha hai, loading dikhao
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // 3. Loading poora hone ke baad, check karo ki token hai ya nahi
  if (!token) {
    return <Navigate to="/landing" replace />; // /login ki jagah /landing par bhejo
  }

  // 4. Agar token hai, toh children (DashboardLayout) ko render karo
  //    Aapne App.tsx mein <Outlet /> use kiya hai, isliye hum 'children' ya 'Outlet' render kar sakte hain.
  //    Aapke App.tsx ke setup ke hisaab se, 'children' hi sahi hai.
  return <>{children}</>;
};

export default ProtectedRoute;