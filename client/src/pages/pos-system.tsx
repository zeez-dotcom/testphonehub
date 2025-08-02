import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReceiptModal } from "@/components/receipt-modal";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Minus, Trash2, CreditCard, DollarSign, Package, Receipt as ReceiptIcon } from "lucide-react";
import type { Product, Order } from "@shared/schema";

interface POSCartItem {
  product: Product;
  quantity: number;
}

export default function POSSystem() {
  const { user } = useAuth();
  const { t, formatCurrency, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [posCart, setPOSCart] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentReceiptData, setCurrentReceiptData] = useState<any>(null);

  // Fetch seller's products for POS
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", { seller: true }],
    queryFn: async () => {
      const allProducts = await fetch("/api/products").then(r => r.json());
      // In a real app, we'd filter by seller ID from the authenticated user
      return allProducts.filter((p: Product) => p.isActive);
    },
  });

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // POS order mutation
  const createPOSOrderMutation = useMutation({
    mutationFn: async ({ 
      items, 
      total, 
      paymentMethod, 
      amountReceived,
    }: {
      items: POSCartItem[];
      total: number;
      paymentMethod: string;
      amountReceived?: number;
    }) => {
      const orderItems = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: parseFloat(item.product.price),
        total: item.quantity * parseFloat(item.product.price),
      }));

      // Create order
        const orderRes = await apiRequest("POST", "/api/orders", {
          total: total.toString(),
          isPosOrder: true,
          items: orderItems,
        });
        const order = await orderRes.json();

        // Process payment with metadata
        const changeAmount = amountReceived ? amountReceived - total : 0;
        await apiRequest("POST", "/api/payments", {
          orderId: order.id,
          amount: total.toString(),
          method: paymentMethod,
          metadata: {
            amountReceived,
            changeAmount: changeAmount > 0 ? changeAmount : 0,
            customerName,
            customerPhone,
          },
        });

        return order;
    },
    onSuccess: async (order) => {
      // Fetch receipt data
      const receiptData = await fetch(`/api/orders/${order.id}/receipt`).then(r => r.json());
      
      setCurrentOrder(order);
      setCurrentReceiptData(receiptData);
      setReceiptModalOpen(true);
      
      // Reset form
      setPOSCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived("");
      
      toast({ 
        title: t('operation_successful'),
        description: t('payment_processing_complete'),
      });
    },
    onError: (error) => {
      toast({ 
        title: t('operation_failed'), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Redirect if not seller or admin
  if (user?.role !== "seller" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t('access_denied')}
              </h2>
              <p className="text-slate-600">
                {t('seller_only_access')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const addToPOSCart = (product: Product) => {
    const existing = posCart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setPOSCart(cart =>
          cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        toast({
          title: t('insufficient_stock'),
          description: `${t('only')} ${product.stock} ${t('items_available')}`,
          variant: "destructive",
        });
      }
    } else {
      if (product.stock > 0) {
        setPOSCart(cart => [...cart, { product, quantity: 1 }]);
      } else {
        toast({
          title: t('out_of_stock'),
          description: t('item_unavailable'),
          variant: "destructive",
        });
      }
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setPOSCart(cart =>
      cart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity <= 0) {
            return null;
          }
          if (newQuantity > item.product.stock) {
            toast({
              title: t('insufficient_stock'),
              description: `${t('only')} ${item.product.stock} ${t('items_available')}`,
              variant: "destructive",
            });
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as POSCartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setPOSCart(cart => cart.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return posCart.reduce((sum, item) => 
      sum + (parseFloat(item.product.price) * item.quantity), 0
    );
  };

  const processPayment = (method: string) => {
    if (posCart.length === 0) {
      toast({
        title: t('empty_cart_action'),
        description: t('add_items_to_cart'),
        variant: "destructive",
      });
      return;
    }

    createPOSOrderMutation.mutate({
      items: posCart,
      total: calculateTotal(),
      paymentMethod: method,
    });
  };

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center mb-8 ${isRTL ? 'rtl' : 'ltr'}`}>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('pos_system')}</h1>
          <p className="text-lg text-slate-600">{t('process_instore_sales')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('select_products')}</CardTitle>
                  <div className="relative w-64">
                    <Input
                      placeholder={t('scan_or_search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => addToPOSCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square bg-slate-200 rounded-md mb-3 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-slate-600" />
                          )}
                        </div>
                        <h5 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                          {product.name}
                        </h5>
                        <p className="text-primary font-semibold">{formatCurrency(parseFloat(product.price))}</p>
                        <p className="text-xs text-slate-500">{t('stock')}: {product.stock}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">
                      {searchQuery ? t('no_products_found') : t('no_products_available')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart & Checkout */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{t('current_sale')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {posCart.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">{t('cart_empty')}</p>
                  ) : (
                    posCart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(parseFloat(item.product.price))} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span>{t('subtotal')}:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('tax')}:</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{t('total')}:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Customer Details (Optional) */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-sm font-medium">{t('customer_details')} ({t('optional')})</h4>
                  <Input
                    placeholder={t('customer_name')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    placeholder={t('customer_phone')}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-secondary hover:bg-secondary/90"
                    onClick={() => processPayment("cash")}
                    disabled={createPOSOrderMutation.isPending || posCart.length === 0}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t('cash_payment')}
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={() => processPayment("card")}
                    disabled={createPOSOrderMutation.isPending || posCart.length === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('card_payment')}
                  </Button>
                  {posCart.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setPOSCart([])}
                    >
                      {t('clear_cart')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Receipt Modal */}
        <ReceiptModal
          open={receiptModalOpen}
          onOpenChange={setReceiptModalOpen}
          order={currentOrder}
          receiptData={currentReceiptData}
        />
      </div>
    </div>
  );
}
