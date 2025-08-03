import { Navigation } from "@/components/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoyaltyData {
  balance: number;
  transactions: {
    id: string;
    points: number;
    type: string;
    description: string | null;
    createdAt: string;
  }[];
}

export default function Loyalty() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const { data } = useQuery<LoyaltyData>({
    queryKey: ["/api/loyalty"],
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          {t("loyalty_points")}
        </h1>

        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-lg text-slate-600 mb-2">{t("point_balance")}</p>
            <p className="text-3xl font-bold">{data?.balance ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("transaction_history")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.transactions?.length ? (
              <div className="space-y-4">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between text-sm">
                    <span>{tx.description || tx.type}</span>
                    <span className={tx.points > 0 ? "text-green-600" : "text-red-600"}>
                      {tx.points > 0 ? `+${tx.points}` : tx.points}
                    </span>
                    <span className="text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
