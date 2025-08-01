import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        return null; // No token, not authenticated
      }
      
      const res = await fetch("/api/auth/user", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (res.status === 401 || res.status === 403) {
        // Token is invalid, remove it
        localStorage.removeItem('authToken');
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false, 
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnReconnect: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
