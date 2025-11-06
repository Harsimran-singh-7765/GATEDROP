import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home, List, User, History, LogOut, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "./MobileBottomNav"; // Import the bottom nav
import { useEffect } from "react";

// Desktop nav link ke liye helper
const getDesktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50",
    isActive && "text-primary bg-primary/10"
  );

export const DashboardLayout = () => {
  const { user, logout, socket, refreshUser } = useAuth();
  const navigate = useNavigate();

  // --- WALLET UPDATE LISTENER (Essential for live stats) ---
  useEffect(() => {
    if (!socket || !user) return;

    const handleBalanceUpdate = (data: { userId: string, newBalance: number }) => {
        // Only refresh if the update is for the current user
        if (data.userId === user._id) {
            console.log(`[Socket] Balance update detected. New: ${data.newBalance}`);
            refreshUser(); 
        }
    };

    socket.on('user_balance_updated', handleBalanceUpdate);

    return () => {
        socket.off('user_balance_updated', handleBalanceUpdate);
    };
  }, [socket, user?._id, refreshUser]);
  // --- END WALLET UPDATE LISTENER ---


  const handleLogout = () => {
    logout();
    navigate("/landing"); // Logout ke baad landing page par bhejein
  };
  
  const displayBalance = user?.walletBalance ? user.walletBalance.toFixed(2) : '0.00';

  return (
    <div className="min-h-screen w-full bg-background">
      {/* === 1. TOP HEADER === */}
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          
          {/* Logo */}
          <Link to="/jobs" className="flex items-center">
            <img src="/logo.png" alt="Gatedrop" className="h-16 w-auto" /> 
          </Link>

          {/* === 2. DESKTOP NAVIGATION === */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <NavLink to="/jobs" className={getDesktopNavLinkClass}>
              <Home className="h-4 w-4" /> Jobs
            </NavLink>
            <NavLink to="/current-jobs" className={getDesktopNavLinkClass}>
              <List className="h-4 w-4" /> Current Jobs
            </NavLink>
            <NavLink to="/history" className={getDesktopNavLinkClass}>
              <History className="h-4 w-4" /> History
            </NavLink>
            <NavLink to="/profile" className={getDesktopNavLinkClass}>
              <User className="h-4 w-4" /> Profile
            </NavLink>
          </nav>

          {/* --- Desktop Wallet & Logout --- */}
          <div className="flex items-center gap-4">
            {/* Desktop Wallet */}
            <div className="hidden md:flex items-center gap-2 text-primary font-semibold">
              <Wallet className="h-5 w-5" />
              <span>₹{displayBalance}</span>
            </div>
            {/* Mobile Wallet (Top-right) */}
             <div className="md:hidden flex items-center gap-1 text-primary font-semibold">
              <Wallet className="h-5 w-5" />
              <span className="text-sm">₹{displayBalance}</span>
            </div>

            <Button variant="ghost" size="sm" className="hidden md:flex" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
            
            {/* Mobile Logout Button (Visible only on mobile) */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* === 3. PAGE CONTENT === */}
      <main className="container mx-auto max-w-5xl p-4 md:p-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* === 4. MOBILE BOTTOM NAV === */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;