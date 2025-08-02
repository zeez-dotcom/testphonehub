import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useLanguage();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/cart", {
        productId: product.id,
        quantity: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }
    addToCartMutation.mutate();
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    setIsWishlisted(!isWishlisted);
  };

  const discountPercentage = product.originalPrice 
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)
    : 0;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square bg-slate-100 relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <span className="text-slate-500">{product.name}</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1">
          <Badge 
            variant={product.condition === "new" ? "default" : "secondary"}
            className="text-xs"
          >
            {product.condition === "new" ? "New" : product.condition}
          </Badge>
          {discountPercentage > 0 && (
            <Badge className="bg-accent text-accent-foreground text-xs">
              -{discountPercentage}%
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        <div className="absolute top-3 right-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 bg-white/80 hover:bg-white rounded-full p-0"
            onClick={handleWishlistToggle}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? "fill-red-500 text-red-500" : "text-slate-600"
              }`} 
            />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-sm text-muted-foreground mb-2">
            by {product.brand}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-muted-foreground">
              {parseFloat(product.rating || "0").toFixed(1)}
            </span>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={handleAddToCart}
          disabled={addToCartMutation.isPending || product.stock === 0}
        >
          {addToCartMutation.isPending 
            ? "Adding..." 
            : product.stock === 0 
            ? "Out of Stock" 
            : "Add to Cart"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
