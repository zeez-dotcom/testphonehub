import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { SellerOnboardingStatus } from "@/components/seller-onboarding-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Clock, Star, Plus, Edit, Trash2, BarChart3, Bell, CheckCircle, XCircle, AlertCircle, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileUpload } from "@/components/file-upload";
import type { Product, Order, Seller } from "@shared/schema";

export default function SellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState("products");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    brand: "",
    category: "",
    price: "",
    originalPrice: "",
    stock: "",
    condition: "new",
    imageUrl: "",
    sku: "",
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [imageIdMap, setImageIdMap] = useState<Record<string, string>>({});

  const [documents, setDocuments] = useState({
    businessLogo: [] as string[],
    shopLicenseImage: [] as string[],
    ownerCivilIdImage: [] as string[],
    ownerPhoto: [] as string[],
  });

  // For simplified implementation, the seller is the current user
  const seller = user;

  useEffect(() => {
    if (!seller?.id) return;
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/seller/documents");
        const data = await res.json();
        setDocuments({
          businessLogo: data.businessLogo ? [data.businessLogo] : [],
          shopLicenseImage: data.shopLicenseImage ? [data.shopLicenseImage] : [],
          ownerCivilIdImage: data.ownerCivilIdImage ? [data.ownerCivilIdImage] : [],
          ownerPhoto: data.ownerPhoto ? [data.ownerPhoto] : [],
        });
      } catch (err) {
        console.error("Failed to fetch seller documents:", err);
      }
    })();
  }, [seller?.id]);

  // Fetch seller stats
  const { data: stats } = useQuery({
    queryKey: ["/api/analytics/seller", seller?.id],
    enabled: !!seller?.id,
  });

  // Fetch seller products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/seller"],
    enabled: !!seller?.id,
  });

  // Fetch seller orders
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/seller"],
    enabled: !!seller?.id,
  });

  // Fetch seller notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/seller/notifications"],
    enabled: !!seller?.id,
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: async (product: Product) => {
      try {
        if (productImages.length > 0) {
          await apiRequest("POST", `/api/products/${product.id}/images`, {
            images: productImages,
          });
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsAddProductOpen(false);
        resetProductForm();
        toast({ title: "Product created successfully" });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof productForm }) => {
      return await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: async (product: Product) => {
      try {
        const newImages = productImages.filter((url) => !imageIdMap[url]);
        if (newImages.length > 0) {
          await apiRequest("POST", `/api/products/${product.id}/images`, {
            images: newImages,
          });
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setEditingProduct(null);
        resetProductForm();
        toast({ title: "Product updated successfully" });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      brand: "",
      category: "",
      price: "",
      originalPrice: "",
      stock: "",
      condition: "new",
      imageUrl: "",
      sku: "",
    });
    setProductImages([]);
    setImageIdMap({});
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
    } else {
      createProductMutation.mutate(productForm);
    }
  };

  const handleEditProduct = async (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      brand: product.brand || "",
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice || "",
      stock: product.stock.toString(),
      condition: product.condition,
      imageUrl: product.imageUrl || "",
      sku: product.sku || "",
    });
    try {
      const images: any[] = await apiRequest("GET", `/api/products/${product.id}/images`);
      setProductImages(images.map((img) => img.imageUrl));
      const map: Record<string, string> = {};
      images.forEach((img) => (map[img.imageUrl] = img.id));
      setImageIdMap(map);
    } catch (err) {
      console.error(err);
      setProductImages(product.imageUrl ? [product.imageUrl] : []);
    }
  };

  const toRequestBody = (docs: typeof documents) => ({
    businessLogo: docs.businessLogo[0] || "",
    shopLicenseImage: docs.shopLicenseImage[0] || "",
    ownerCivilIdImage: docs.ownerCivilIdImage[0] || "",
    ownerPhoto: docs.ownerPhoto[0] || "",
  });

  const handleDocumentUpload = async (
    field: keyof typeof documents,
    urls: string[],
  ) => {
    const updated = { ...documents, [field]: urls };
    setDocuments(updated);
    try {
      await apiRequest("PUT", "/api/seller/documents", toRequestBody(updated));
    } catch (error: any) {
      toast({
        title: "Failed to upload document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDocumentRemove = async (
    field: keyof typeof documents,
    url: string,
  ) => {
    const updated = {
      ...documents,
      [field]: documents[field].filter((u) => u !== url),
    };
    setDocuments(updated);
    try {
      await apiRequest("PUT", "/api/seller/documents", toRequestBody(updated));
    } catch (error: any) {
      toast({
        title: "Failed to remove document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getProductStatusBadge = (status: string) => {
    const configs = {
      pending: { variant: "secondary" as const, text: "Pending", className: "bg-orange-100 text-orange-700" },
      approved: { variant: "secondary" as const, text: "Live", className: "bg-green-100 text-green-700" },
      rejected: { variant: "destructive" as const, text: "Rejected", className: "bg-red-100 text-red-700" },
    };
    const config = configs[status as keyof typeof configs] || configs.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  // Filter products by status
  const filteredProducts = products.filter((product: Product) => {
    if (productStatusFilter === "all") return true;
    return product.status === productStatusFilter;
  });

  // Filter orders by status and category
  const filteredOrders = orders.filter((order: Order) => {
    let matchesStatus = true;
    let matchesCategory = true;

    if (orderStatusFilter !== "all") {
      matchesStatus = order.status === orderStatusFilter;
    }

    if (orderCategoryFilter !== "all") {
      // Check if any item in the order matches the category
      const items = Array.isArray(order.items) ? order.items : [];
      matchesCategory = items.some((item: any) => item.category === orderCategoryFilter);
    }

    return matchesStatus && matchesCategory;
  });

  // For simplified implementation, all sellers are considered approved

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Seller Dashboard</h1>
          <p className="text-lg text-slate-600">Manage your products and track performance</p>
        </div>

        {/* Seller Onboarding Status */}
        <div className="mb-8">
          <SellerOnboardingStatus sellerId={user?.id || ""} />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Sales</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(stats?.totalSales ?? 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <span className="text-secondary font-bold">KWD</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Products</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats?.activeProducts || products.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats?.pendingOrders || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Store Rating</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats?.rating || "0.0"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="products">Inventory</TabsTrigger>
                <TabsTrigger value="notifications" className="relative">
                  <Bell className="h-4 w-4 mr-1" />
                  Notifications
                  {notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 text-xs">
                      {notifications.filter((n: any) => !n.isRead).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="orders">Sales</TabsTrigger>
                <TabsTrigger value="analytics">Reports</TabsTrigger>
                <TabsTrigger value="pos">POS System</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-semibold text-slate-900">Product Management</h3>
                    <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={isAddProductOpen || !!editingProduct} onOpenChange={(open) => {
                    if (!open) {
                      setIsAddProductOpen(false);
                      setEditingProduct(null);
                      resetProductForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setIsAddProductOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingProduct ? "Edit Product" : "Add New Product"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleProductSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                              id="name"
                              value={productForm.name}
                              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                              id="brand"
                              value={productForm.brand}
                              onChange={(e) => setProductForm({...productForm, brand: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={productForm.description}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={productForm.category} 
                              onValueChange={(value) => setProductForm({...productForm, category: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="smartphones">Smartphones</SelectItem>
                                <SelectItem value="audio">Audio</SelectItem>
                                <SelectItem value="accessories">Accessories</SelectItem>
                                <SelectItem value="protection">Protection</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="condition">Condition</Label>
                            <Select 
                              value={productForm.condition} 
                              onValueChange={(value) => setProductForm({...productForm, condition: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="like_new">Like New</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="fair">Fair</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="price">{t('price')} (KWD)</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              value={productForm.price}
                              onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="originalPrice">{t('original_price')} (KWD)</Label>
                            <Input
                              id="originalPrice"
                              type="number"
                              step="0.01"
                              value={productForm.originalPrice}
                              onChange={(e) => setProductForm({...productForm, originalPrice: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stock">Stock</Label>
                            <Input
                              id="stock"
                              type="number"
                              value={productForm.stock}
                              onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="sku">SKU</Label>
                            <Input
                              id="sku"
                              value={productForm.sku}
                              onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                            />
                          </div>
                          <div className="col-span-2">
                            <FileUpload
                              label={t("upload_product_images")}
                              accept="image/*"
                              multiple={true}
                              maxFiles={5}
                              currentFiles={productImages}
                              onFilesUploaded={(urls) => {
                                const newImages = [...productImages, ...urls];
                                setProductImages(newImages);
                                // Set the first image as the main imageUrl for backward compatibility
                                if (newImages.length > 0 && !productForm.imageUrl) {
                                  setProductForm({...productForm, imageUrl: newImages[0]});
                                }
                              }}
                              onFileRemoved={async (url) => {
                                const updatedImages = productImages.filter(img => img !== url);
                                setProductImages(updatedImages);
                                // If removed image was the main image, set new main
                                if (productForm.imageUrl === url) {
                                  setProductForm({...productForm, imageUrl: updatedImages[0] || ""});
                                }
                                const imageId = imageIdMap[url];
                                if (imageId && editingProduct) {
                                  try {
                                    await apiRequest("DELETE", `/api/products/${editingProduct.id}/images/${imageId}`);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                  const newMap = { ...imageIdMap };
                                  delete newMap[url];
                                  setImageIdMap(newMap);
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsAddProductOpen(false);
                              setEditingProduct(null);
                              resetProductForm();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createProductMutation.isPending || updateProductMutation.isPending}
                          >
                            {editingProduct ? "Update Product" : "Create Product"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-900">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-900">Price</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-900">Stock</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b border-slate-100">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-slate-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{product.name}</p>
                                <p className="text-sm text-slate-500">SKU: {product.sku || "N/A"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900">{formatCurrency(product.price)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-900">{product.stock}</span>
                          </td>
                          <td className="py-3 px-4">
                            {getProductStatusBadge(product.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                disabled={deleteProductMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Notifications</h3>
                
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification: any) => (
                      <Card key={notification.id} className={!notification.isRead ? "border-blue-200 bg-blue-50" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {notification.type === "product_approved" && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {notification.type === "product_rejected" && <XCircle className="h-4 w-4 text-red-600" />}
                                {notification.type === "order_placed" && <ShoppingCart className="h-4 w-4 text-blue-600" />}
                                {notification.type === "product_pending" && <Clock className="h-4 w-4 text-orange-600" />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-900 mb-1">{notification.title}</h4>
                                <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                New
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-900">Order Management</h3>
                  <div className="flex gap-4">
                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="smartphones">Smartphones</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="protection">Protection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No orders match your filters</p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-medium text-slate-900 mb-1">
                                Order #{order.id.slice(-8)}
                              </h4>
                              <p className="text-sm text-slate-500">
                                {new Date(order.createdAt!).toLocaleDateString()} at {new Date(order.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={order.status === 'delivered' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'}
                                className={order.status === 'delivered' ? 'bg-green-100 text-green-700' : ''}
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-slate-600">Total Amount</p>
                              <p className="font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">Payment Method</p>
                              <div className="flex items-center gap-2">
                                {order.isPosOrder ? (
                                  <>
                                    <span className="text-green-600 font-bold">KWD</span>
                                    <span className="text-sm font-medium">Cash (POS)</span>
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium">Online Payment</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium text-slate-900 mb-2">Items Ordered:</p>
                            <div className="space-y-2">
                              {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {item.category || 'General'}
                                    </Badge>
                                    <span>{item.name}</span>
                                    <span className="text-slate-500">x{item.quantity}</span>
                                  </div>
                                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipping Address for Online Orders */}
                          {!order.isPosOrder && order.shippingAddress && (
                            <div className="border-t pt-4 mt-4">
                              <p className="text-sm font-medium text-slate-900 mb-1">Shipping Address:</p>
                              <p className="text-sm text-slate-600">
                                {typeof order.shippingAddress === 'object' 
                                  ? `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.country || ''}`
                                  : order.shippingAddress
                                }
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pos" className="mt-6">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">POS System</h3>
                  <p className="text-slate-600 mb-4">
                    Access the full POS interface for in-store sales
                  </p>
                  <Button onClick={() => window.location.href = '/pos-system'}>
                    Open POS System
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-6">
                  {/* Performance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Total Sales</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {stats ? formatCurrency(stats.totalSales) : formatCurrency(0)}
                            </p>
                          </div>
                          <span className="text-green-600 font-bold">KWD</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Active Products</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.activeProducts || 0}</p>
                          </div>
                          <Package className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Pending Orders</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.pendingOrders || 0}</p>
                          </div>
                          <Clock className="h-8 w-8 text-orange-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Average Rating</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.rating || '0.0'}</p>
                          </div>
                          <Star className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sales Performance Chart Placeholder */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">
                          Sales performance charts will display here based on your order history
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {orders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Order #{order.id.slice(-8)}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(order.createdAt!).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {orders.length === 0 && (
                          <div className="text-center py-4 text-slate-500">
                            No recent activity
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <div className="space-y-6">
                  {/* Business Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("business_information")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="businessName">{t("business_name")}</Label>
                          <Input id="businessName" placeholder="Enter business name" />
                        </div>
                        <div>
                          <Label htmlFor="businessType">{t("business_type")}</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="electronics">Electronics Store</SelectItem>
                              <SelectItem value="mobile">Mobile Shop</SelectItem>
                              <SelectItem value="accessories">Accessories Store</SelectItem>
                              <SelectItem value="repair">Repair Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="businessEmail">{t("business_email")}</Label>
                          <Input id="businessEmail" type="email" placeholder="business@example.com" />
                        </div>
                        <div>
                          <Label htmlFor="businessWebsite">{t("business_website")}</Label>
                          <Input id="businessWebsite" type="url" placeholder="https://your-website.com" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="businessAddress">{t("business_address")}</Label>
                        <Textarea id="businessAddress" placeholder="Enter full business address" rows={3} />
                      </div>

                      <div>
                        <FileUpload
                          label={t("upload_company_logo")}
                          accept="image/*"
                          multiple={false}
                          maxFiles={1}
                          currentFiles={documents.businessLogo}
                          onFilesUploaded={(urls) => handleDocumentUpload("businessLogo", urls)}
                          onFileRemoved={(url) => handleDocumentRemove("businessLogo", url)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("contact_information")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phoneNumber">{t("phone_number")}</Label>
                          <Input id="phoneNumber" placeholder="+965 XXXX XXXX" />
                        </div>
                        <div>
                          <Label htmlFor="whatsappNumber">{t("whatsapp_number")}</Label>
                          <Input id="whatsappNumber" placeholder="+965 XXXX XXXX" />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="location">{t("location")}</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kuwait-city">Kuwait City</SelectItem>
                            <SelectItem value="hawalli">Hawalli</SelectItem>
                            <SelectItem value="farwaniya">Farwaniya</SelectItem>
                            <SelectItem value="ahmadi">Ahmadi</SelectItem>
                            <SelectItem value="jahra">Jahra</SelectItem>
                            <SelectItem value="mubarak-al-kabeer">Mubarak Al-Kabeer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Legal Documents */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("legal_documents")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shopLicense">{t("shop_license_number")}</Label>
                          <Input id="shopLicense" placeholder="Enter license number" />
                        </div>
                        <div>
                          <Label htmlFor="civilId">{t("civil_id_number")}</Label>
                          <Input id="civilId" placeholder="Enter Civil ID number" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <FileUpload
                          label={t("business_license")}
                          accept="image/*,application/pdf"
                          multiple={false}
                          maxFiles={1}
                          currentFiles={documents.shopLicenseImage}
                          onFilesUploaded={(urls) => handleDocumentUpload("shopLicenseImage", urls)}
                          onFileRemoved={(url) => handleDocumentRemove("shopLicenseImage", url)}
                        />

                        <FileUpload
                          label={t("civil_id")}
                          accept="image/*,application/pdf"
                          multiple={false}
                          maxFiles={1}
                          currentFiles={documents.ownerCivilIdImage}
                          onFilesUploaded={(urls) => handleDocumentUpload("ownerCivilIdImage", urls)}
                          onFileRemoved={(url) => handleDocumentRemove("ownerCivilIdImage", url)}
                        />

                        <FileUpload
                          label={t("owner_photo")}
                          accept="image/*"
                          multiple={false}
                          maxFiles={1}
                          currentFiles={documents.ownerPhoto}
                          onFilesUploaded={(urls) => handleDocumentUpload("ownerPhoto", urls)}
                          onFileRemoved={(url) => handleDocumentRemove("ownerPhoto", url)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notification Preferences */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("notification_preferences")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>{t("email_notifications")}</Label>
                            <p className="text-sm text-muted-foreground">{t("receive_order_email_updates")}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            {t("enabled")}
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>{t("sms_notifications")}</Label>
                            <p className="text-sm text-muted-foreground">{t("receive_order_sms_updates")}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            {t("enabled")}
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>{t("low_stock_alerts")}</Label>
                            <p className="text-sm text-muted-foreground">{t("get_notified_low_stock")}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            {t("enabled")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("payment_settings")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="bankAccount">{t("bank_account_details")}</Label>
                        <Input id="bankAccount" placeholder="Enter bank account details" />
                      </div>
                      
                      <div>
                        <Label htmlFor="knetId">{t("knet_merchant_id")}</Label>
                        <Input id="knetId" placeholder="Enter K-Net merchant ID" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>{t("accept_cash_payments")}</Label>
                          <p className="text-sm text-muted-foreground">{t("allow_cash_on_delivery")}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          {t("enabled")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button size="lg">
                      {t("save_settings")}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
