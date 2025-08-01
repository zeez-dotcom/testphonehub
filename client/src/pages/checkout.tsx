import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, CreditCard, Truck, Package, CheckCircle } from "lucide-react";
import type { CartItem, Product } from "@shared/schema";

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<"shipping" | "payment" | "confirmation">("shipping");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/auth");
    return null;
  }

  // Fetch cart items with product details
  const { data: cartItems = [], isLoading } = useQuery<(CartItem & { product: Product })[]>({
    queryKey: ["/api/cart/detailed"],
    queryFn: async () => {
      const cartResponse = await fetch("/api/cart");
      const cart: CartItem[] = await cartResponse.json();
      
      // Fetch product details for each cart item
      const cartWithProducts = await Promise.all(
        cart.map(async (item) => {
          const productResponse = await fetch(`/api/products/${item.productId}`);
          const product: Product = await productResponse.json();
          return { ...item, product };
        })
      );
      
      return cartWithProducts;
    },
  });

  // Order creation mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: parseFloat(item.product.price),
        sellerId: item.product.sellerId,
      }));

      const total = calculateTotal();

      // Create order
      const order = await apiRequest("POST", "/api/orders", {
        total: total.toString(),
        shippingAddress,
        items: orderItems,
      });

      // Process payment
      await apiRequest("POST", "/api/payments", {
        orderId: order.id,
        amount: total.toString(),
        method: paymentMethod,
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setStep("confirmation");
      toast({ 
        title: "Order placed successfully!",
        description: "You will receive a confirmation email shortly.",
      });
    },
    onError: (error) => {
      toast({ 
        title: "Order failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => 
      sum + (parseFloat(item.product.price) * item.quantity), 0
    );
  };

  const calculateShipping = () => {
    // Free shipping over KWD 15.000, otherwise KWD 2.000
    const subtotal = calculateSubtotal();
    return subtotal >= 15 ? 0 : 2.0;
  };

  const calculateTax = () => {
    // 8.5% tax rate
    return calculateSubtotal() * 0.085;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax();
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city) {
      toast({
        title: "Missing shipping information",
        description: "Please fill in all required shipping fields.",
        variant: "destructive",
      });
      return;
    }
    setStep("payment");
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "card" && (!paymentDetails.cardNumber || !paymentDetails.cvv)) {
      toast({
        title: "Missing payment information",
        description: "Please fill in all required payment fields.",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded mb-4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && step !== "confirmation") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
              <p className="text-slate-600 mb-4">Add some items to your cart before checkout.</p>
              <Button onClick={() => setLocation("/marketplace")}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Checkout</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className={`flex items-center space-x-2 ${step === "shipping" ? "text-primary" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "shipping" ? "bg-primary text-white" : "bg-slate-200"
              }`}>
                <Truck className="h-4 w-4" />
              </div>
              <span>Shipping</span>
            </div>
            
            <div className="w-8 h-px bg-slate-200"></div>
            
            <div className={`flex items-center space-x-2 ${step === "payment" ? "text-primary" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "payment" ? "bg-primary text-white" : "bg-slate-200"
              }`}>
                <CreditCard className="h-4 w-4" />
              </div>
              <span>Payment</span>
            </div>
            
            <div className="w-8 h-px bg-slate-200"></div>
            
            <div className={`flex items-center space-x-2 ${step === "confirmation" ? "text-primary" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "confirmation" ? "bg-primary text-white" : "bg-slate-200"
              }`}>
                <CheckCircle className="h-4 w-4" />
              </div>
              <span>Confirmation</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === "shipping" && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContinueToPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={shippingAddress.fullName}
                        onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={shippingAddress.zipCode}
                          onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Select 
                          value={shippingAddress.country} 
                          onValueChange={(value) => setShippingAddress({...shippingAddress, country: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Continue to Payment
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePlaceOrder} className="space-y-4">
                    <div>
                      <Label>Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="card" id="card" />
                          <Label htmlFor="card">Credit/Debit Card</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="digital_wallet" id="digital_wallet" />
                          <Label htmlFor="digital_wallet">Digital Wallet</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                          <Label htmlFor="bank_transfer">Bank Transfer</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {paymentMethod === "card" && (
                      <>
                        <div>
                          <Label htmlFor="cardNumber">Card Number *</Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={paymentDetails.cardNumber}
                            onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expiryDate">Expiry Date *</Label>
                            <Input
                              id="expiryDate"
                              placeholder="MM/YY"
                              value={paymentDetails.expiryDate}
                              onChange={(e) => setPaymentDetails({...paymentDetails, expiryDate: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV *</Label>
                            <Input
                              id="cvv"
                              placeholder="123"
                              value={paymentDetails.cvv}
                              onChange={(e) => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="nameOnCard">Name on Card *</Label>
                          <Input
                            id="nameOnCard"
                            value={paymentDetails.nameOnCard}
                            onChange={(e) => setPaymentDetails({...paymentDetails, nameOnCard: e.target.value})}
                            required
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex space-x-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep("shipping")}
                        className="flex-1"
                      >
                        Back to Shipping
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? "Processing..." : "Place Order"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === "confirmation" && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
                  <p className="text-slate-600 mb-6">
                    Thank you for your purchase. Your order has been successfully placed and will be processed shortly.
                  </p>
                  <div className="space-y-2">
                    <Button onClick={() => setLocation("/customer-dashboard")} className="w-full">
                      View Order Details
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/marketplace")} className="w-full">
                      Continue Shopping
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                        {item.product.imageUrl ? (
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(item.product.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatCurrency(calculateShipping())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {calculateShipping() === 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      🎉 Free shipping on orders over KWD 15.000!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
