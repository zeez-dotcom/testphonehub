import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: products = [] } = useRecommendations(10);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {products.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Recommended for you</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {products.map((p) => (
                <div key={p.id} className="w-64 flex-shrink-0">
                  <ProductCard
                    product={p}
                    onClick={() => setLocation(`/product/${p.id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
