import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, StarIcon, User, Calendar, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['/api/products', productId, 'reviews'],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/reviews`);
      return await response.json();
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "" });
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to leave a review",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      productId,
      rating: reviewForm.rating,
      title: reviewForm.title,
      comment: reviewForm.comment,
    });
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter((review: Review) => review.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter((review: Review) => review.rating === rating).length / reviews.length) * 100 : 0
  }));

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Customer Reviews</span>
            <Badge variant="outline">{reviews.length} reviews</Badge>
          </div>
          {user && (
            <Button onClick={() => setShowReviewForm(!showReviewForm)}>
              Write a Review
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{averageRating}</div>
            <div className="flex justify-center">
              {renderStars(parseFloat(averageRating))}
            </div>
            <div className="text-sm text-gray-600">{reviews.length} reviews</div>
          </div>
          
          <div className="flex-1 space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-8">{rating}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                {renderStars(reviewForm.rating, true, (rating) => 
                  setReviewForm(prev => ({ ...prev, rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Title (optional)</label>
                <Input
                  placeholder="Brief summary of your review"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comment</label>
                <Textarea
                  placeholder="Share your experience with this product"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitReview}
                  disabled={createReviewMutation.isPending || !reviewForm.comment.trim()}
                >
                  Submit Review
                </Button>
                <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            reviews.map((review: Review) => (
              <Card key={review.id} className="border-l-4 border-l-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      {review.isVerifiedPurchase && (
                        <Badge variant="secondary" className="text-xs">
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {review.title && (
                    <h4 className="font-semibold mb-2">{review.title}</h4>
                  )}
                  
                  {review.comment && (
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}