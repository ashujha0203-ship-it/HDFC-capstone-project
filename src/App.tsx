import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import VerifyDocument from "./pages/VerifyDocument";
import KycInstructions from "./pages/KycInstructions";
import KycCapture from "./pages/KycCapture";
import KycPreview from "./pages/KycPreview";
import KycResult from "./pages/KycResult";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminKycDetail from "./pages/AdminKycDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          
          {/* Admin routes */}
          <Route path="/admin/auth" element={<AdminAuth />} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/admin/kyc/:id" element={<AdminProtectedRoute><AdminKycDetail /></AdminProtectedRoute>} />
          
          {/* User KYC routes */}
          <Route path="/verify" element={<ProtectedRoute><VerifyDocument /></ProtectedRoute>} />
          <Route path="/kyc/instructions" element={<ProtectedRoute><KycInstructions /></ProtectedRoute>} />
          <Route path="/kyc/capture" element={<ProtectedRoute><KycCapture /></ProtectedRoute>} />
          <Route path="/kyc/preview" element={<ProtectedRoute><KycPreview /></ProtectedRoute>} />
          <Route path="/kyc/result" element={<ProtectedRoute><KycResult /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
