import { Toaster } from "@/components/ui/toaster"; // Yeh default ShadCN toast ke liye hai
import { Toaster as Sonner } from "@/components/ui/sonner"; // Yeh Sonner toasts ke liye hai
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
// import MyRunnerJobs from "./pages/MyRunnerJobs"; // <-- YEH AB USE NAHI HOGA
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
        <Toaster /> {/* Default Toaster (agar use ho raha hai) */}
        
        {/* --- YEH HAI FIX --- */}
        {/* Sonner toasts ko bottom-right mein daal diya, close button ke saath */}
        <Sonner position="bottom-right" richColors closeButton />
        {/* --- END FIX --- */}
        
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<Landing />} />
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
              {/* Default route ko /jobs par redirect karein */}
              <Route index element={<Navigate to="/jobs" replace />} /> 
              
              <Route path="jobs" element={<Jobs />} />
              <Route path="current-jobs" element={<CurrentJobs />} />
              {/* <Route path="my-runner-jobs" element={<MyRunnerJobs />} /> <-- Yeh route ab CurrentJobs mein merge ho gaya hai */}
              <Route path="post-job" element={<PostJob />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
              
              {/* Order detail routes ko bhi layout ke andar daal sakte hain agar header/nav chahiye */}
              {/* Ya alag se rakhein agar full screen chahiye. Hum alag rakhte hain. */}
            </Route>
            
            {/* Detail pages (inhe bhi layout ke andar daal sakte hain) */}
            <Route
              path="/order/:id/requester"
              element={
                <ProtectedRoute>
                  <DashboardLayout /> {/* Header ke saath dikhane ke liye */}
                </ProtectedRoute>
              }
            >
              <Route index element={<OrderDetailsRequester />} />
            </Route>
            <Route
              path="/order/:id/runner"
              element={
                <ProtectedRoute>
                  <DashboardLayout /> {/* Header ke saath dikhane ke liye */}
                </ProtectedRoute>
              }
            >
              <Route index element={<OrderDetailsRunner />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;