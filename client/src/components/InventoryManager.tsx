import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Minus, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryLog {
  id: string;
  productId: string;
  changeType: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  orderId?: string;
  createdAt: string;
}

interface InventoryManagerProps {
  productId: string;
  currentStock: number;
  productName: string;
}

export default function InventoryManager({ productId, currentStock, productName }: InventoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockForm, setStockForm] = useState({
    quantityChange: 0,
    reason: "",
  });

  const { data: inventoryLogs = [], isLoading } = useQuery({
    queryKey: ['/api/products', productId, 'inventory'],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/inventory`);
      return await response.json();
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async (data: { quantityChange: number; reason: string }) => {
      const response = await fetch(`/api/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsDialogOpen(false);
      setStockForm({ quantityChange: 0, reason: "" });
      toast({
        title: "Stock updated",
        description: "Inventory has been successfully updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStock = () => {
    if (stockForm.quantityChange === 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a quantity change",
        variant: "destructive",
      });
      return;
    }

    if (!stockForm.reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for the stock change",
        variant: "destructive",
      });
      return;
    }

    updateStockMutation.mutate(stockForm);
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'sale':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'restock':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'adjustment':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'return':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'sale':
        return 'destructive';
      case 'restock':
        return 'default';
      case 'adjustment':
        return 'secondary';
      case 'return':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isLowStock = currentStock < 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span>Inventory Management</span>
            {isLowStock && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Low Stock
              </Badge>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Update Stock</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Stock - {productName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current Stock</label>
                  <div className="text-2xl font-bold">{currentStock} units</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity Change</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockForm(prev => ({ ...prev, quantityChange: prev.quantityChange - 1 }))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={stockForm.quantityChange}
                      onChange={(e) => setStockForm(prev => ({ ...prev, quantityChange: parseInt(e.target.value) || 0 }))}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockForm(prev => ({ ...prev, quantityChange: prev.quantityChange + 1 }))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    New stock: {currentStock + stockForm.quantityChange}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <Textarea
                    placeholder="Enter reason for stock change (e.g., 'Received new shipment', 'Damaged items', etc.)"
                    value={stockForm.reason}
                    onChange={(e) => setStockForm(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpdateStock}
                    disabled={updateStockMutation.isPending}
                    className="flex-1"
                  >
                    Update Stock
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="text-3xl font-bold mb-2">{currentStock}</div>
          <div className="text-sm text-gray-600">Units in stock</div>
          {isLowStock && (
            <div className="text-sm text-red-600 mt-2">
              ⚠️ Low stock alert! Consider restocking soon.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Recent Inventory Changes</h4>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : inventoryLogs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No inventory changes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {inventoryLogs.map((log: InventoryLog) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getChangeTypeIcon(log.changeType)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getChangeTypeColor(log.changeType) as any}>
                          {log.changeType}
                        </Badge>
                        <span className={`font-semibold ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {log.previousQuantity} → {log.newQuantity}
                      </div>
                      {log.reason && (
                        <div className="text-xs text-gray-500">{log.reason}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}