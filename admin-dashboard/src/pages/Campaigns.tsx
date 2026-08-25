import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import { etb, getCampaigns, setCampaignActive } from "@/lib/api";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "campaigns"], queryFn: getCampaigns });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setCampaignActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every campaign across every merchant.</p>
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
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Merchant</th>
                  <th className="px-5 py-3 font-medium">Budget</th>
                  <th className="px-5 py-3 font-medium">CPA Reward</th>
                  <th className="px-5 py-3 font-medium">Sales</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr key={c._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{c.productName}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {typeof c.merchantId === "object" ? c.merchantId.businessName : c.merchantId}
                    </td>
                    <td className="px-5 py-4">
                      {etb(c.budgetRemaining)} / {etb(c.totalBudget)}
                    </td>
                    <td className="px-5 py-4">{etb(c.cpaReward)}</td>
                    <td className="px-5 py-4">{c.salesGenerated}</td>
                    <td className="px-5 py-4">
                      <Badge tone={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Paused"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: c._id, isActive: !c.isActive })}
                      >
                        {c.isActive ? "Pause" : "Resume"}
                      </Button>
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
