import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import { getSessions } from "@/lib/api";

const toneFor = (status: string) =>
  status === "converted" ? "success" : status === "pending" ? "muted" : "destructive";

export default function SessionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "sessions"], queryFn: getSessions });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click sessions and conversions tracked from affiliate links (most recent 200).
        </p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Buyer</th>
                  <th className="px-5 py-3 font-medium">Referrer</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((s) => (
                  <tr key={s._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">
                      {typeof s.campaignId === "object" ? s.campaignId.productName : s.campaignId}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{s.buyerTelegramId}</td>
                    <td className="px-5 py-4 font-mono text-xs">{s.referrerId}</td>
                    <td className="px-5 py-4">
                      <Badge tone={toneFor(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right text-muted-foreground">
                      {new Date(s.convertedAt ?? s.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
