import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Mail } from "lucide-react";
import { FaGoogle, FaApple } from "react-icons/fa";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TermsConditions } from "@/components/terms-conditions";

export default function UnifiedAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("login");
  const [showTerms, setShowTerms] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<typeof registerData | null>(null);

  // Fetch available OAuth providers
  const { data: providersData } = useQuery({
    queryKey: ['/api/auth/providers'],
    queryFn: async () => {
      const response = await fetch('/api/auth/providers');
      return response.json();
    },
  });

  const providers = providersData?.providers || ['email'];
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "customer",
    businessName: "",
    businessType: "",
    location: "",
    experience: "",
  });

  // Check for OAuth callback tokens
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userStr = urlParams.get('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast({
          title: "Login Successful",
          description: "Welcome to PhoneHub!",
        });
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, "/");
        setLocation("/");
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        toast({
          title: "Authentication Error",
          description: "There was an issue with the authentication process.",
          variant: "destructive",
        });
      }
    }
  }, [toast, setLocation]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleOAuthLogin = (provider: string) => {
    // Check if OAuth provider is actually configured
    if (!providers.includes(provider)) {
      toast({
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth Not Configured`,
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication requires API credentials to be configured in environment variables.`,
        variant: "destructive",
      });
      return;
    }
    window.location.href = `/api/auth/${provider}`;
  };

  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return await response.json();
    },
    onSuccess: (result) => {
      // Store the JWT token
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
      
      // Invalidate auth query to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login successful",
        description: "Welcome back to PhoneHub!",
      });
      setTimeout(() => setLocation("/"), 100);
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof registerData) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: registerData.role === "seller" 
          ? "Your seller account is pending approval." 
          : "Welcome to PhoneHub!",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store the registration data and show terms
    setPendingRegistrationData(registerData);
    setShowTerms(true);
  };

  const handleTermsAccept = () => {
    if (pendingRegistrationData) {
      registerMutation.mutate({
        ...pendingRegistrationData,
        termsAccepted: true,
        privacyAccepted: true,
      });
      setPendingRegistrationData(null);
      setShowTerms(false);
    }
  };

  const handleTermsDecline = () => {
    setPendingRegistrationData(null);
    setShowTerms(false);
    toast({
      title: "Registration Cancelled",
      description: "You must accept the terms and conditions to create an account.",
      variant: "destructive",
    });
  };

  const handleAdminLogin = () => {
    setLoginData({ email: "testadmin", password: "admin123" });
    loginMutation.mutate({ email: "testadmin", password: "admin123" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-primary to-primary-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PhoneHub</h1>
          <p className="text-primary-foreground/80">Access your account to continue</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-xl">
              {activeTab === "login" ? "Welcome Back" : "Create Your Account"}
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              {activeTab === "login" 
                ? "Sign in to access your account" 
                : "Join PhoneHub to start buying or selling phones"
              }
            </p>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" className="text-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-sm">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                {/* OAuth Buttons - Show them for demo even without credentials */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleOAuthLogin('google')}
                    variant="outline"
                    className="w-full"
                  >
                    <FaGoogle className="w-4 h-4 mr-2 text-red-500" />
                    Continue with Google
                  </Button>
                  <Button
                    onClick={() => handleOAuthLogin('apple')}
                    variant="outline"
                    className="w-full"
                  >
                    <FaApple className="w-4 h-4 mr-2 text-gray-800" />
                    Continue with Apple
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {loginMutation.isPending ? "Signing In..." : "Sign In with Email"}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-slate-100 rounded-lg text-center">
                  <p className="text-sm text-slate-600 mb-2">Admin Access</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAdminLogin}
                    disabled={loginMutation.isPending}
                  >
                    Login as Admin (testadmin / admin123)
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                {/* OAuth Buttons for Registration */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleOAuthLogin('google')}
                    variant="outline"
                    className="w-full"
                  >
                    <FaGoogle className="w-4 h-4 mr-2 text-red-500" />
                    Sign up with Google
                  </Button>
                  <Button
                    onClick={() => handleOAuthLogin('apple')}
                    variant="outline"
                    className="w-full"
                  >
                    <FaApple className="w-4 h-4 mr-2 text-gray-800" />
                    Sign up with Apple
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or create account with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-role">Account Type</Label>
                    <Select 
                      value={registerData.role} 
                      onValueChange={(value) => setRegisterData({ ...registerData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        value={registerData.lastName}
                        onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Enter your password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>

                  {registerData.role === "seller" && (
                    <>
                      <div>
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          placeholder="Your business name"
                          value={registerData.businessName}
                          onChange={(e) => setRegisterData({ ...registerData, businessName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessType">Business Type</Label>
                        <Input
                          id="businessType"
                          placeholder="e.g., Electronics Retailer"
                          value={registerData.businessType}
                          onChange={(e) => setRegisterData({ ...registerData, businessType: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="City, State"
                          value={registerData.location}
                          onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="experience">Experience</Label>
                        <Textarea
                          id="experience"
                          placeholder="Tell us about your business experience..."
                          value={registerData.experience}
                          onChange={(e) => setRegisterData({ ...registerData, experience: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {registerMutation.isPending ? "Creating Account..." : "Create Account with Email"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Terms and Conditions Dialog */}
      <TermsConditions
        open={showTerms}
        onOpenChange={setShowTerms}
        userType={pendingRegistrationData?.role || "customer"}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    </div>
  );
}
