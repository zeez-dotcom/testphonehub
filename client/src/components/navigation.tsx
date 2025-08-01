import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Search, ShoppingCart, User, Menu, LogOut, Package, Plus, Minus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CartItem, Product } from "@shared/schema";

interface CartItemWithProduct extends CartItem {
  product: Product;
}

function CartItemComponent({ item }: { item: CartItemWithProduct }) {
  const { formatCurrency } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ quantity }: { quantity: number }) => {
      return await apiRequest("PUT", `/api/cart/${item.id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart/detailed"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cart item",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/cart/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart/detailed"] });
      toast({
        title: "Item removed",
        description: "Item removed from cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center space-x-3 py-3 border-b">
      <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
        {item.product?.imageUrl ? (
          <img 
            src={item.product.imageUrl} 
            alt={item.product.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Package className="h-6 w-6 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.product?.name || 'Product'}</p>
        <p className="text-xs text-slate-500">{formatCurrency(parseFloat(item.product?.price || "0"))}</p>
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => {
            if (item.quantity > 1) {
              updateQuantityMutation.mutate({ quantity: item.quantity - 1 });
            } else {
              removeItemMutation.mutate();
            }
          }}
        >
          {item.quantity > 1 ? <Minus className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
        </Button>
        <span className="w-6 text-center text-sm">{item.quantity}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => updateQuantityMutation.mutate({ quantity: item.quantity + 1 })}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const [location] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart/detailed"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      
      const cartResponse = await fetch("/api/cart", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      
      if (!cartResponse.ok) {
        if (cartResponse.status === 401) {
          console.log("Cart access unauthorized, user may need to re-login");
          return [];
        }
        throw new Error(`Cart fetch failed: ${cartResponse.status}`);
      }
      
      const cart: CartItem[] = await cartResponse.json();
      
      // Fetch product details for each cart item
      const cartWithProducts = await Promise.all(
        cart.map(async (item) => {
          try {
            const productResponse = await fetch(`/api/products/${item.productId}`);
            if (!productResponse.ok) {
              console.error(`Product ${item.productId} fetch failed: ${productResponse.status}`);
              return null;
            }
            const product: Product = await productResponse.json();
            return { ...item, product };
          } catch (error) {
            console.error(`Failed to fetch product ${item.productId}:`, error);
            return null;
          }
        })
      );
      
      return cartWithProducts.filter(item => item !== null) as CartItemWithProduct[];
    },
    enabled: isAuthenticated,
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    try {
      // Remove JWT token
      localStorage.removeItem('authToken');
      
      // Clear auth query cache
      const queryClient = (await import("@/lib/queryClient")).queryClient;
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Smartphone className="text-primary-foreground h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-primary">{t("phonehub")}</h1>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-10" : "pl-10"}
              />
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
            </div>
          </form>

          {/* Navigation Actions */}
          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
            {/* Language Toggle */}
            <LanguageToggle />
            {/* Cart */}
            {isAuthenticated && (
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 bg-accent text-accent-foreground min-w-[1.25rem] h-5 flex items-center justify-center text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4">{t("cart")}</h2>
                    {cartItems.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-muted-foreground">{t("cart_empty")}</p>
                        <Link href="/marketplace">
                          <Button variant="outline" className="mt-4" onClick={() => setIsCartOpen(false)}>
                            Continue Shopping
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <CartItemComponent key={item.id} item={item} />
                        ))}
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold">Total:</span>
                            <span className="font-bold text-lg">
                              {cartItems.reduce((total, item) => total + (item.quantity * parseFloat(item.product?.price || "0")), 0).toLocaleString('en-KW', { style: 'currency', currency: 'KWD' })}
                            </span>
                          </div>
                          <Link href="/checkout">
                            <Button className="w-full" onClick={() => setIsCartOpen(false)}>
                              Proceed to Checkout ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Auth/Profile */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                {user?.role === "seller" && (
                  <>
                    <Link href="/seller-dashboard">
                      <Button variant="outline" size="sm">
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/seller-documents">
                      <Button variant="outline" size="sm">
                        Documents
                      </Button>
                    </Link>
                    <Link href="/pos-system">
                      <Button variant="outline" size="sm">
                        POS System
                      </Button>
                    </Link>
                  </>
                )}
                
                {user?.role === "customer" && (
                  <Link href="/customer-dashboard">
                    <Button variant="outline" size="sm">
                      My Orders
                    </Button>
                  </Link>
                )}
                
                {user?.role === "admin" && (
                  <Link href="/admin-panel">
                    <Button variant="outline" className="flex items-center space-x-2">
                      <span className="hidden sm:inline">Admin Panel</span>
                    </Button>
                  </Link>
                )}
                
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {user?.firstName || user?.email}
                  </span>
                </Button>
                
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="mt-8 space-y-4">
                  <form onSubmit={handleSearch} className="w-full">
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                  <div className="space-y-2">
                    <Link href="/marketplace">
                      <Button variant="ghost" className="w-full justify-start">
                        Browse Products
                      </Button>
                    </Link>
                    {isAuthenticated && (
                      <Link href={`/${user?.role}-dashboard`}>
                        <Button variant="ghost" className="w-full justify-start">
                          Dashboard
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
