import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Marketplace from "@/pages/marketplace";
import ProductDetails from "@/pages/product-details";
import UnifiedAuth from "@/pages/unified-auth";
import CustomerDashboard from "@/pages/customer-dashboard";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerDocuments from "@/pages/seller-documents";
import AdminPanel from "@/pages/admin-panel";
import POSSystem from "@/pages/pos-system";
import Checkout from "@/pages/checkout";

function Router() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Marketplace} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/product/:id" component={ProductDetails} />
      
      {/* Auth route */}
      <Route path="/auth" component={UnifiedAuth} />

      {/* Protected routes */}
      <ProtectedRoute path="/customer-dashboard" component={CustomerDashboard} roles={["customer", "admin"]} />
      <ProtectedRoute path="/seller-dashboard" component={SellerDashboard} roles={["seller", "admin"]} />
      <ProtectedRoute path="/seller-documents" component={SellerDocuments} roles={["seller"]} />
      <ProtectedRoute path="/admin-panel" component={AdminPanel} roles={["admin"]} />
      <ProtectedRoute path="/pos-system" component={POSSystem} roles={["seller", "admin"]} />
      <ProtectedRoute path="/checkout" component={Checkout} roles={["customer", "seller", "admin"]} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
