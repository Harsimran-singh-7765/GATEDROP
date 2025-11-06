import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Jobs from "./pages/Jobs";
import CurrentJobs from "./pages/CurrentJobs";
import MyRunnerJobs from "./pages/MyRunnerJobs";
import PostJob from "./pages/PostJob";
import History from "./pages/History";
import Profile from "./pages/Profile";
import OrderDetailsRequester from "./pages/OrderDetailsRequester";
import OrderDetailsRunner from "./pages/OrderDetailsRunner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="jobs" element={<Jobs />} />
              <Route path="current-jobs" element={<CurrentJobs />} />
              <Route path="my-runner-jobs" element={<MyRunnerJobs />} />
              <Route path="post-job" element={<PostJob />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            <Route
              path="/order/:id/requester"
              element={
                <ProtectedRoute>
                  <OrderDetailsRequester />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:id/runner"
              element={
                <ProtectedRoute>
                  <OrderDetailsRunner />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
