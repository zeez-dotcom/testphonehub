import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Smartphone, Headphones, Battery, Shield, MapPin, Building2, Phone, Star, ShoppingCart, Heart, Calendar, Package, Shield as ShieldIcon } from "lucide-react";
import type { Product } from "@shared/schema";

const categories = [
  { name: "smartphones", icon: Smartphone, count: 450 },
  { name: "audio", icon: Headphones, count: 180 },
  { name: "accessories", icon: Battery, count: 320 },
  { name: "protection", icon: Shield, count: 200 },
];

const brands = ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi"];

export default function Marketplace() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, formatCurrency, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    search: "",
  });
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const stored = localStorage.getItem("wishlist");
    return stored ? JSON.parse(stored) : [];
  });

  const isWishlisted = selectedProduct ? wishlist.includes(selectedProduct.id) : false;

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      const response = await fetch(`/api/products?${params}`);
      return response.json();
    },
  });

  // Fetch detailed product with seller info
  const { data: productDetails } = useQuery({
    queryKey: ["/api/products", selectedProduct?.id, "details"],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const response = await fetch(`/api/products/${selectedProduct.id}/details`);
      return response.json();
    },
    enabled: !!selectedProduct?.id,
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest("POST", "/api/cart", {
        productId,
        quantity: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart/detailed"] });
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCategoryClick = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      brand: "",
      minPrice: "",
      maxPrice: "",
      condition: "all",
      search: "",
    });
  };

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const handleWishlistToggle = (productId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    setWishlist(prev => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem("wishlist", JSON.stringify(updated));
      return updated;
    });
  };

  const handleProductClick = (product: Product) => {
    setLocation(`/product/${product.id}`);
  };

  const handleAddToCart = (productId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }
    addToCartMutation.mutate(productId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-foreground text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              {t("your_complete_mobile_marketplace")}
            </h1>
            <p className="text-xl mb-8 text-primary-foreground/90">
              {t("discover_latest_phones")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
{t("browse_catalog")}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
                onClick={() => setLocation('/auth')}
              >
{t("become_a_seller")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("shop_by_category")}</h2>
            <p className="text-lg text-slate-600">{t("find_exactly_what_looking_for")}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group cursor-pointer"
                onClick={() => handleCategoryClick(category.name.toLowerCase())}
              >
                <div className="bg-slate-50 rounded-xl p-8 text-center group-hover:bg-primary/5 transition-colors">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <category.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{category.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{category.count}+ products</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar Filters */}
            <div className="lg:w-1/4">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{t("filters")}</h3>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
{t("clear_filters")}
                    </Button>
                  </div>
                  
                  {/* Price Range */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
{t("price_range")}
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
placeholder={t("min_price")}
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                      />
                      <span className="text-slate-500">-</span>
                      <Input
                        type="number"
placeholder={t("max_price")}
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Brand Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
{t("brand")}
                    </label>
                    <div className="space-y-2">
                      {brands.map((brand) => (
                        <div key={brand} className="flex items-center space-x-2">
                          <Checkbox
                            id={brand}
                            checked={filters.brand === brand}
                            onCheckedChange={(checked) => 
                              handleFilterChange("brand", checked ? brand : "")
                            }
                          />
                          <label htmlFor={brand} className="text-sm text-slate-700">
                            {brand}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Condition Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
{t("condition")}
                    </label>
                    <Select value={filters.condition} onValueChange={(value) => handleFilterChange("condition", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleApplyFilters}>
                    {t("apply_filters")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Products Grid */}
            <div className="lg:w-3/4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
{filters.category ? `${filters.category} Products` : t("all_products")}
                  {products.length > 0 && (
                    <span className="text-lg font-normal text-slate-600 ml-2">
                      ({products.length})
                    </span>
                  )}
                </h2>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">{t("sort_by_featured")}</SelectItem>
                    <SelectItem value="price_asc">{t("price_low_to_high")}</SelectItem>
                    <SelectItem value="price_desc">{t("price_high_to_low")}</SelectItem>
                    <SelectItem value="newest">{t("newest_first")}</SelectItem>
                    <SelectItem value="rating">{t("best_rated")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {Object.entries(filters).some(([, value]) => value) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleFilterChange(key, "")}
                      >
                        {key}: {value} ×
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Products Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                      <div className="aspect-square bg-slate-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded mb-4"></div>
                      <div className="h-8 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => handleProductClick(product)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <Smartphone className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {t("no_products_found")}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {t("try_adjusting_filters")}
                  </p>
                  <Button onClick={clearFilters}>{t("clear_filters")}</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product Detail Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold">
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[80vh]">
            <div className="p-6 pt-4">
              {selectedProduct && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Product Image */}
                  <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    {selectedProduct.imageUrl ? (
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-24 w-24 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="space-y-6">
                    {/* Price and Basic Info */}
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-3xl font-bold text-slate-900">
                          {formatCurrency(selectedProduct.price)}
                        </span>
                        {selectedProduct.originalPrice && (
                          <span className="text-xl text-slate-500 line-through">
                            {formatCurrency(selectedProduct.originalPrice)}
                          </span>
                        )}
                        <Badge 
                          variant={selectedProduct.condition === "new" ? "default" : "secondary"}
                        >
                          {selectedProduct.condition}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.floor(parseFloat(selectedProduct.rating || "0"))
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                        <span className="text-slate-600 ml-2">
                          {selectedProduct.rating || "0"} ({selectedProduct.reviewCount || 0} reviews)
                        </span>
                      </div>
                    </div>

                    {/* Seller Information */}
                    {productDetails?.seller && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {t("seller_information")}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {productDetails.seller.businessName || `${productDetails.seller.firstName} ${productDetails.seller.lastName}`}
                            </span>
                          </div>
                          {productDetails.seller.location && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{productDetails.seller.location}</span>
                            </div>
                          )}
                          {productDetails.seller.phoneNumber && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{productDetails.seller.phoneNumber}</span>
                            </div>
                          )}
                          {productDetails.seller.rating && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-slate-600">
                                {productDetails.seller.rating} seller rating
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Product Specifications */}
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">{t("specifications")}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">{t("brand")}</span>
                          <span className="font-medium">{selectedProduct.brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Category</span>
                          <span className="font-medium capitalize">{selectedProduct.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{t("condition")}</span>
                          <span className="font-medium capitalize">{selectedProduct.condition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{t("in_stock")}</span>
                          <span className="font-medium">{selectedProduct.stock} units</span>
                        </div>

                      </div>
                    </div>

                    {/* Description */}
                    {selectedProduct.description && (
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-3">{t("description")}</h3>
                        <p className="text-slate-600 leading-relaxed">
                          {selectedProduct.description}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        className="flex-1"
                        size="lg"
                        onClick={() => handleAddToCart(selectedProduct.id)}
                        disabled={addToCartMutation.isPending || selectedProduct.stock === 0}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {addToCartMutation.isPending 
                          ? t("adding") 
                          : selectedProduct.stock === 0 
                          ? t("out_of_stock") 
                          : t("add_to_cart")
                        }
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="px-6"
                        onClick={() => handleWishlistToggle(selectedProduct.id)}
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            isWishlisted ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                      </Button>
                    </div>

                    {/* Trust & Safety */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldIcon className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Trust & Safety</span>
                      </div>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Verified seller with valid business license</li>
                        <li>• Secure payment processing</li>
                        <li>• Return policy available</li>
                        <li>• Customer support included</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
