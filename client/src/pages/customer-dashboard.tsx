import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Heart, User } from "lucide-react";
import type { Order } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useLanguage();

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

    const getStatusBadge = (status: string) => {
      const statusMap: Record<string, { variant: "secondary" | "default" | "outline" | "destructive"; text: string; className?: string }> = {
        pending: { variant: "secondary", text: "Pending" },
        processing: { variant: "default", text: "Processing" },
        shipped: { variant: "outline", text: "Shipped" },
        delivered: { variant: "secondary", text: "Delivered", className: "bg-green-100 text-green-800" },
        cancelled: { variant: "destructive", text: "Cancelled" },
      };

      const config = statusMap[status] || statusMap.pending;

      return (
        <Badge variant={config.variant} className={config.className}>
          {config.text}
        </Badge>
      );
    };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const totalSpent = orders
    .filter(order => order.status === "delivered")
    .reduce((sum, order) => sum + parseFloat(order.total), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">My Account</h1>
          <p className="text-lg text-slate-600">Manage your orders and preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Recent Orders</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No orders yet</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Start shopping to see your orders here
                    </p>
                    <Button>Browse Products</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">
                              Order #{order.id.slice(-8)}
                            </h4>
                            <p className="text-sm text-slate-600">
                              {Array.isArray(order.items) 
                                ? `${order.items.length} items` 
                                : "Multiple items"} • ${order.total}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(order.status)}
                          <p className="text-sm text-slate-500 mt-1">
                            {formatDate(order.createdAt!)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Account Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Orders</span>
                  <span className="font-medium">{orders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Spent</span>
                  <span className="font-medium">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Member Since</span>
                  <span className="font-medium">
                    {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Track Order
                </Button>
                <Button className="w-full" variant="outline">
                  <Heart className="h-4 w-4 mr-2" />
                  View Wishlist
                </Button>
                <Button className="w-full" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
