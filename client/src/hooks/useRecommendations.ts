import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

export function useRecommendations(limit = 5) {
  return useQuery<Product[]>({
    queryKey: ["/api/recommendations", limit],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return [];
      const res = await fetch(`/api/recommendations?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      return res.json();
    },
    enabled: !!localStorage.getItem("authToken"),
    staleTime: 5 * 60 * 1000,
  });
}
