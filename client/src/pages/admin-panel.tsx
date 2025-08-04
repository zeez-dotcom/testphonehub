import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Bell,
  CheckCircle,
  XCircle,
  Package,
  Users,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Eye,
  Settings,
  AlertCircle,
  Clock,
  Star,
  Mail,
  Store,
  Filter,
  Download,
  BarChart3,
  Edit,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User, Product } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  metadata?: any;
}

interface AdminSettings {
  notification_email: string;
}

interface SellerWithDocuments {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  phoneNumber: string;
  whatsappNumber: string;
  businessAddress: string;
  shopLicenseNumber: string;
  ownerCivilId: string;
  businessLogo: string;
  shopLicenseImage: string;
  ownerCivilIdImage: string;
  ownerPhoto: string;
  status: string;
  createdAt: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, t } = useLanguage();

  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSellerData, setEditingSellerData] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [settings, setSettings] = useState<AdminSettings>({
    notification_email: "",
  });
  const [reportFilters, setReportFilters] = useState({
    startDate: "",
    endDate: "",
    productId: "",
    category: "",
  });

  const handleReportFilterChange = (key: string, value: string) => {
    setReportFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Redirect if not admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-600">
              You don't have permission to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Data fetching
  const { data: analytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/platform"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery<Notification[]>({
      queryKey: ["/api/notifications"],
    });

  const { data: pendingProducts = [], isLoading: pendingProductsLoading } =
    useQuery({
      queryKey: ["/api/products/pending"],
    });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/admin/customers"],
  });

  const { data: pendingSellers = [], isLoading: pendingSellersLoading } =
    useQuery({
      queryKey: ["/api/sellers/pending"],
    });

  const { data: approvedSellers = [], isLoading: approvedSellersLoading } =
    useQuery({
      queryKey: ["/api/sellers/approved"],
    });

  const {
    data: sellersWithDocuments = [],
    isLoading: sellersDocumentsLoading,
  } = useQuery({
    queryKey: ["/api/admin/sellers/documents"],
  });

  const { data: adminSettings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (adminSettings) {
      setSettings(adminSettings as AdminSettings);
    }
  }, [adminSettings]);

  // Delivery and accounting data
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/admin/payments"],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: orderReports = [], isLoading: orderReportsLoading } = useQuery({
    queryKey: ["/api/analytics/orders", reportFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.startDate)
        params.set("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);
      if (reportFilters.productId)
        params.set("productId", reportFilters.productId);
      if (reportFilters.category)
        params.set("category", reportFilters.category);
      const res = await apiRequest(
        "GET",
        `/api/analytics/orders?${params.toString()}`,
      );
      return res.json();
    },
  });

  const { data: topProductsReport = [], isLoading: topProductsLoading } =
    useQuery({
      queryKey: ["/api/analytics/top-products", reportFilters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (reportFilters.startDate)
          params.set("startDate", reportFilters.startDate);
        if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);
        if (reportFilters.category)
          params.set("category", reportFilters.category);
        if (reportFilters.productId)
          params.set("productId", reportFilters.productId);
        const res = await apiRequest(
          "GET",
          `/api/analytics/top-products?${params.toString()}`,
        );
        return res.json();
      },
    });

  const categories = useMemo(
    () =>
      Array.from(
        new Set((allProducts as Product[]).map((p: Product) => p.category)),
      ),
    [allProducts],
  );

  const handleExportRevenue = async () => {
    const params = new URLSearchParams();
    if (reportFilters.startDate)
      params.set("startDate", reportFilters.startDate);
    if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);
    if (reportFilters.productId)
      params.set("productId", reportFilters.productId);
    if (reportFilters.category)
      params.set("category", reportFilters.category);
    const res = await apiRequest(
      "GET",
      `/api/analytics/orders/export?${params.toString()}`,
    );
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportProducts = async () => {
    const params = new URLSearchParams();
    if (reportFilters.startDate)
      params.set("startDate", reportFilters.startDate);
    if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);
    if (reportFilters.category)
      params.set("category", reportFilters.category);
    if (reportFilters.productId)
      params.set("productId", reportFilters.productId);
    const res = await apiRequest(
      "GET",
      `/api/analytics/top-products/export?${params.toString()}`,
    );
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "top-products-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Mutations
  const approveSellerMutation = useMutation({
    mutationFn: async (sellerId: string) => {
      return await apiRequest("POST", `/api/sellers/${sellerId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/approved"] });
      toast({ title: "Seller approved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve seller",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest(
        "POST",
        `/api/admin/products/${productId}/approve`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/pending"] });
      toast({ title: "Product approved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: async ({
      productId,
      reason,
    }: {
      productId: string;
      reason: string;
    }) => {
      return await apiRequest(
        "POST",
        `/api/admin/products/${productId}/reject`,
        { reason },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/pending"] });
      toast({ title: "Product rejected successfully" });
      setRejectDialogOpen(false);
      setSelectedProduct(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast({
        title: "Failed to reject product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveSellerDocumentsMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(
        "POST",
        `/api/admin/sellers/${userId}/approve-documents`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/sellers/documents"],
      });
      toast({ title: "Seller documents approved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve seller documents",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectSellerDocumentsMutation = useMutation({
    mutationFn: async ({
      sellerId,
      reason,
    }: {
      sellerId: string;
      reason: string;
    }) => {
      return await apiRequest(
        "POST",
        `/api/admin/sellers/${sellerId}/reject-documents`,
        { reason },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/sellers/documents"],
      });
      toast({ title: "Seller documents rejected successfully" });
      setRejectDialogOpen(false);
      setSelectedSeller(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast({
        title: "Failed to reject seller documents",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const adminUploadDocumentMutation = useMutation({
    mutationFn: async ({
      userId,
      field,
      fileUrl,
    }: {
      userId: string;
      field: string;
      fileUrl: string;
    }) => {
      return await apiRequest(
        "PUT",
        `/api/admin/sellers/${userId}/upload-document`,
        { field, fileUrl },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/sellers/documents"],
      });
      toast({ title: "Document uploaded successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editSellerDetailsMutation = useMutation({
    mutationFn: async (sellerData: any) => {
      return await apiRequest(
        "PUT",
        `/api/admin/sellers/${sellerData.userId}/edit-details`,
        sellerData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/sellers/documents"],
      });
      toast({ title: "Seller details updated successfully" });
      setEditModalOpen(false);
      setEditingSellerData(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update seller details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: AdminSettings) => {
      return await apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleAdminUpload = (
    userId: string,
    field: string,
    fileUrl: string,
  ) => {
    adminUploadDocumentMutation.mutate({ userId, field, fileUrl });
  };

  const handleEditSeller = (seller: SellerWithDocuments) => {
    setEditingSellerData({
      userId: seller.userId,
      businessName: seller.businessName || "",
      businessType: seller.businessType || "",
      phoneNumber: seller.phoneNumber || "",
      whatsappNumber: seller.whatsappNumber || "",
      businessAddress: seller.businessAddress || "",
      shopLicenseNumber: seller.shopLicenseNumber || "",
      ownerCivilId: seller.ownerCivilId || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEditedSeller = () => {
    if (editingSellerData) {
      editSellerDetailsMutation.mutate(editingSellerData);
    }
  };

  const filteredUsers =
    userRoleFilter === "all"
      ? users
      : (users as User[]).filter((u: User) => u.role === userRoleFilter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navigation />

      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Admin Panel
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your marketplace platform
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <div className="relative">
              <Bell className="h-6 w-6 text-slate-600" />
              {(notifications as Notification[]).filter(
                (n: Notification) => !n.isRead,
              ).length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {
                    (notifications as Notification[]).filter(
                      (n: Notification) => !n.isRead,
                    ).length
                  }
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="seller-documents">Documents</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {analyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(
                            parseFloat((analytics as any)?.totalRevenue || "0"),
                          )}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Active Sellers
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {(analytics as any)?.activeSellers || 0}
                        </p>
                      </div>
                      <Store className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Total Orders
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {(analytics as any)?.totalOrders || 0}
                        </p>
                      </div>
                      <ShoppingBag className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Total Users
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {(analytics as any)?.totalUsers || 0}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {notificationsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse p-3 border rounded"
                          >
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">
                        No notifications
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(notifications as Notification[])
                          .slice(0, 5)
                          .map((notification: Notification) => (
                            <div
                              key={notification.id}
                              className="p-3 border rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">
                                    {notification.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {new Date(
                                      notification.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Products</p>
                          <p className="text-sm text-slate-600">
                            {(pendingProducts as Product[]).length} pending
                            review
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {(pendingProducts as Product[]).length}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Store className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Sellers</p>
                          <p className="text-sm text-slate-600">
                            {(pendingSellers as User[]).length} pending approval
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {(pendingSellers as User[]).length}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Documents</p>
                          <p className="text-sm text-slate-600">
                            {
                              (
                                sellersWithDocuments as SellerWithDocuments[]
                              ).filter(
                                (s: SellerWithDocuments) =>
                                  s.status === "pending",
                              ).length
                            }{" "}
                            pending review
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {
                          (
                            sellersWithDocuments as SellerWithDocuments[]
                          ).filter(
                            (s: SellerWithDocuments) => s.status === "pending",
                          ).length
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Products</CardTitle>
                <CardDescription>
                  Review and approve products submitted by sellers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingProductsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded">
                        <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (pendingProducts as Product[]).length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No pending products</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingProducts as Product[]).map((product: Product) => {
                      const seller = (sellersWithDocuments as SellerWithDocuments[]).find(
                        (s) => s.id === product.sellerId
                      );
                      return (
                        <div
                          key={product.id}
                          className="p-4 border rounded-lg flex items-start gap-4"
                        >
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-24 h-24 object-cover rounded-md"
                            />
                          )}
                          <div className="flex-1 space-y-1">
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-sm text-slate-600">
                              {product.description}
                            </p>
                            <p className="text-sm font-medium">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Category: {product.category}
                            </p>
                            <p className="text-xs text-slate-500">
                              SKU: {product.sku || "N/A"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Stock: {product.stock}
                            </p>
                            {seller && (
                              <p className="text-xs text-slate-500">
                                Seller: {seller.businessName} ({seller.email})
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() =>
                                approveProductMutation.mutate(product.id)
                              }
                              disabled={approveProductMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product.id);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all platform users</CardDescription>
                  </div>
                  <Select
                    value={userRoleFilter}
                    onValueChange={setUserRoleFilter}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="seller">Sellers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded">
                        <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(filteredUsers as User[]).map((user: User) => (
                      <div key={user.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {user.firstName} {user.lastName}
                            </h4>
                            <p className="text-sm text-slate-600">
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge
                                variant="secondary"
                                className={
                                  user.role === "admin"
                                    ? "bg-red-100 text-red-800"
                                    : user.role === "seller"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {user.role}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                Joined:{" "}
                                {new Date(user.createdAt!).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Sellers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Pending Sellers</span>
                    <Badge variant="secondary">
                      {(pendingSellers as User[]).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {pendingSellersLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse p-3 border rounded"
                          >
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : (pendingSellers as User[]).length === 0 ? (
                      <p className="text-slate-500 text-center py-8">
                        No pending sellers
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(pendingSellers as User[]).map((seller: User) => (
                          <div
                            key={seller.id}
                            className="p-3 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                {seller.firstName} {seller.lastName}
                              </h4>
                              <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-800"
                              >
                                Pending
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              {seller.email}
                            </p>
                            <p className="text-xs text-slate-500">
                              Applied:{" "}
                              {new Date(seller.createdAt!).toLocaleDateString()}
                            </p>
                            <div className="flex space-x-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() =>
                                  approveSellerMutation.mutate(seller.id)
                                }
                                disabled={approveSellerMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Approved Sellers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Approved Sellers</span>
                    <Badge variant="secondary">
                      {(approvedSellers as User[]).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {approvedSellersLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse p-3 border rounded"
                          >
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : (approvedSellers as User[]).length === 0 ? (
                      <p className="text-slate-500 text-center py-8">
                        No approved sellers
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(approvedSellers as User[]).map((seller: User) => (
                          <div
                            key={seller.id}
                            className="p-3 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                {seller.firstName} {seller.lastName}
                              </h4>
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800"
                              >
                                Active
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {seller.email}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                <Star className="h-3 w-3" />
                                <span>4.5 rating</span>
                              </div>
                              <Button size="sm" variant="outline">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                View Stats
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Seller Documents Tab */}
          <TabsContent value="seller-documents" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Seller Document Verification
              </h3>
              <Badge variant="secondary">
                {
                  (sellersWithDocuments as SellerWithDocuments[]).filter(
                    (s: SellerWithDocuments) => s.status === "pending",
                  ).length
                }{" "}
                pending review
              </Badge>
            </div>

            {sellersDocumentsLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-slate-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (sellersWithDocuments as SellerWithDocuments[]).length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No seller documents to review</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(sellersWithDocuments as SellerWithDocuments[]).map(
                  (seller: SellerWithDocuments) => (
                    <Card key={seller.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {seller.firstName} {seller.lastName}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {seller.email}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {seller.businessName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Submitted:{" "}
                              {new Date(seller.createdAt).toLocaleDateString()}
                            </p>
                            {seller.status === "pending" && (
                              <Badge
                                variant="outline"
                                className="mt-1 bg-blue-50 text-blue-700"
                              >
                                Admin can upload missing documents
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(seller.status)}
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditSeller(seller)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Details
                              </Button>
                              {seller.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      approveSellerDocumentsMutation.mutate(
                                        seller.userId,
                                      )
                                    }
                                    disabled={
                                      approveSellerDocumentsMutation.isPending
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSeller(seller.userId);
                                      setRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Business Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              Business Details
                            </h5>
                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                              <p>
                                <strong>Type:</strong>{" "}
                                {seller.businessType || "Not provided"}
                              </p>
                              <p>
                                <strong>Phone:</strong>{" "}
                                {seller.phoneNumber || "Not provided"}
                              </p>
                              <p>
                                <strong>WhatsApp:</strong>{" "}
                                {seller.whatsappNumber || "Not provided"}
                              </p>
                              <p>
                                <strong>Address:</strong>{" "}
                                {seller.businessAddress || "Not provided"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              Compliance Details
                            </h5>
                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                              <p>
                                <strong>Shop License:</strong>{" "}
                                {seller.shopLicenseNumber || "Not provided"}
                              </p>
                              <p>
                                <strong>Owner Civil ID:</strong>{" "}
                                {seller.ownerCivilId || "Not provided"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Document Upload Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Business Logo */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Business Logo
                            </Label>
                            {seller.businessLogo ? (
                              <div className="p-2 border rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 dark:text-green-400">
                                    Uploaded
                                  </span>
                                </div>
                                <a
                                  href={seller.businessLogo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                                  Admin Upload
                                </p>
                                <FileUpload
                                  onFilesUploaded={(files) => {
                                    if (files.length > 0) {
                                      handleAdminUpload(
                                        seller.userId,
                                        "businessLogo",
                                        files[0],
                                      );
                                    }
                                  }}
                                  accept="*/*"
                                  maxFiles={1}
                                />
                              </div>
                            )}
                          </div>

                          {/* Shop License */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Shop License
                            </Label>
                            {seller.shopLicenseImage ? (
                              <div className="p-2 border rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 dark:text-green-400">
                                    Uploaded
                                  </span>
                                </div>
                                <a
                                  href={seller.shopLicenseImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                                  Admin Upload
                                </p>
                                <FileUpload
                                  onFilesUploaded={(files) => {
                                    if (files.length > 0) {
                                      handleAdminUpload(
                                        seller.userId,
                                        "shopLicenseImage",
                                        files[0],
                                      );
                                    }
                                  }}
                                  accept="*/*"
                                  maxFiles={1}
                                />
                              </div>
                            )}
                          </div>

                          {/* Owner Civil ID */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Owner Civil ID
                            </Label>
                            {seller.ownerCivilIdImage ? (
                              <div className="p-2 border rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 dark:text-green-400">
                                    Uploaded
                                  </span>
                                </div>
                                <a
                                  href={seller.ownerCivilIdImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                                  Admin Upload
                                </p>
                                <FileUpload
                                  onFilesUploaded={(files) => {
                                    if (files.length > 0) {
                                      handleAdminUpload(
                                        seller.userId,
                                        "ownerCivilIdImage",
                                        files[0],
                                      );
                                    }
                                  }}
                                  accept="*/*"
                                  maxFiles={1}
                                />
                              </div>
                            )}
                          </div>

                          {/* Owner Photo */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Owner Photo
                            </Label>
                            {seller.ownerPhoto ? (
                              <div className="p-2 border rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700 dark:text-green-400">
                                    Uploaded
                                  </span>
                                </div>
                                <a
                                  href={seller.ownerPhoto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                                  Admin Upload
                                </p>
                                <FileUpload
                                  onFilesUploaded={(files) => {
                                    if (files.length > 0) {
                                      handleAdminUpload(
                                        seller.userId,
                                        "ownerPhoto",
                                        files[0],
                                      );
                                    }
                                  }}
                                  accept="*/*"
                                  maxFiles={1}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Management</CardTitle>
                <CardDescription>
                  Track and update order deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <p>Loading orders...</p>
                ) : (orders as any[]).length === 0 ? (
                  <p>No orders found</p>
                ) : (
                  <div className="space-y-4">
                    {(orders as any[]).map((order: any) => (
                      <div
                        key={order.id}
                        className="p-4 border rounded-lg flex justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            Order #{order.id.slice(-6)}
                          </p>
                          <p className="text-sm text-slate-600">
                            Status: {order.status}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            apiRequest("PUT", `/api/orders/${order.id}`, {
                              status: "shipped",
                            })
                          }
                        >
                          Mark Shipped
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounting Tab */}
          <TabsContent value="accounting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accounting</CardTitle>
                <CardDescription>View recent payments</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <p>Loading payments...</p>
                ) : (payments as any[]).length === 0 ? (
                  <p>No payments found</p>
                ) : (
                  <div className="space-y-4">
                    {(payments as any[]).map((payment: any) => (
                      <div
                        key={payment.id}
                        className="p-4 border rounded-lg flex justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {payment.method} -{" "}
                            {formatCurrency(parseFloat(payment.amount))}
                          </p>
                          <p className="text-sm text-slate-600">
                            Order: {payment.orderId}
                          </p>
                        </div>
                        <Badge>{payment.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  Analytics over selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) =>
                        handleReportFilterChange("startDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) =>
                        handleReportFilterChange("endDate", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Product</Label>
                    <Select
                      value={reportFilters.productId}
                      onValueChange={(v) =>
                        handleReportFilterChange("productId", v)
                      }
                    >
                      <SelectTrigger className="w-[200px] mt-1">
                        <SelectValue placeholder="All Products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Products</SelectItem>
                        {(allProducts as Product[]).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={reportFilters.category}
                      onValueChange={(v) =>
                        handleReportFilterChange("category", v)
                      }
                    >
                      <SelectTrigger className="w-[200px] mt-1">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportRevenue}
                    className="mt-6"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Orders
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportProducts}
                    className="mt-6"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Products
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {orderReportsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      Loading...
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        revenue: {
                          label: "Revenue",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                    >
                      <LineChart data={orderReports}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--color-revenue)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProductsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      Loading...
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        revenue: {
                          label: "Revenue",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                    >
                      <BarChart data={topProductsReport}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="revenue"
                          fill="var(--color-revenue)"
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Manage platform configuration and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="notification-email">
                        Admin Notification Email
                      </Label>
                      <Input
                        id="notification-email"
                        type="email"
                        value={settings.notification_email}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notification_email: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => updateSettingsMutation.mutate(settings)}
                      disabled={updateSettingsMutation.isPending}
                    >
                      Save Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Seller Modal */}
      {editModalOpen && editingSellerData && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditModalOpen(false);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Edit Seller Details
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Update the seller's business information and compliance details.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="businessName"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      value={editingSellerData.businessName}
                      onChange={(e) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          businessName: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="businessType"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      Business Type
                    </Label>
                    <Select
                      value={editingSellerData.businessType}
                      onValueChange={(value) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          businessType: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="repair">Repair Shop</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="phoneNumber"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={editingSellerData.phoneNumber}
                      onChange={(e) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="whatsappNumber"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsappNumber"
                      value={editingSellerData.whatsappNumber}
                      onChange={(e) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          whatsappNumber: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="businessAddress"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    Business Address
                  </Label>
                  <Textarea
                    id="businessAddress"
                    value={editingSellerData.businessAddress}
                    onChange={(e) =>
                      setEditingSellerData({
                        ...editingSellerData,
                        businessAddress: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="shopLicenseNumber"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      Shop License Number
                    </Label>
                    <Input
                      id="shopLicenseNumber"
                      value={editingSellerData.shopLicenseNumber}
                      onChange={(e) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          shopLicenseNumber: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="ownerCivilId"
                      className="text-slate-700 dark:text-slate-300"
                    >
                      Owner Civil ID
                    </Label>
                    <Input
                      id="ownerCivilId"
                      value={editingSellerData.ownerCivilId}
                      onChange={(e) =>
                        setEditingSellerData({
                          ...editingSellerData,
                          ownerCivilId: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => setEditModalOpen(false)}
                    className="text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEditedSeller}
                    disabled={editSellerDetailsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editSellerDetailsMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Reject {selectedProduct ? "Product" : "Documents"}
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reject-reason">Reason for rejection</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedProduct) {
                      rejectProductMutation.mutate({
                        productId: selectedProduct,
                        reason:
                          rejectReason ||
                          "Product does not meet marketplace standards",
                      });
                    } else if (selectedSeller) {
                      rejectSellerDocumentsMutation.mutate({
                        sellerId: selectedSeller,
                        reason:
                          rejectReason ||
                          "Documents do not meet verification requirements",
                      });
                    }
                  }}
                  disabled={
                    rejectProductMutation.isPending ||
                    rejectSellerDocumentsMutation.isPending
                  }
                >
                  {selectedProduct ? "Reject Product" : "Reject Documents"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
