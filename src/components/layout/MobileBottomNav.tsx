import { NavLink } from "react-router-dom";
import { Home, List, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper function active link ko style karne ke liye
const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex flex-col items-center justify-center gap-1 p-2 rounded-md text-muted-foreground transition-colors",
    isActive && "text-primary bg-primary/10"
  );

export const MobileBottomNav = () => {
  return (
    // Yeh nav bar 'md' breakpoint se neeche hi dikhega
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50">
      <div className="container mx-auto h-full grid grid-cols-4 items-center px-4">
        {/* Tab 1: Jobs */}
        <NavLink to="/jobs" className={getNavLinkClass}>
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">Jobs</span>
        </NavLink>

        {/* Tab 2: Current */}
        <NavLink to="/current-jobs" className={getNavLinkClass}>
          <List className="h-5 w-5" />
          <span className="text-xs font-medium">Current</span>
        </NavLink>

        {/* Tab 3: History */}
        <NavLink to="/history" className={getNavLinkClass}>
          <History className="h-5 w-5" />
          <span className="text-xs font-medium">History</span>
        </NavLink>

        {/* Tab 4: Profile */}
        <NavLink to="/profile" className={getNavLinkClass}>
          <User className="h-5 w-5" />
          <span className="text-xs font-medium">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};