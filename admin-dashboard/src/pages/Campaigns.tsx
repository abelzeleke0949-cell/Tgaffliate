import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import {
  etb,
  getCampaigns,
  setCampaignActive,
  approveCampaign,
  rejectCampaign,
  imageUrl,
  type Campaign,
} from "@/lib/api";

function StatusBadge({ campaign }: { campaign: Campaign }) {
  if (campaign.approvalStatus === "pending") {
    return <Badge tone="muted">Pending Review</Badge>;
  }
  if (campaign.approvalStatus === "rejected") {
    return <Badge tone="destructive">Rejected</Badge>;
  }
  return <Badge tone={campaign.isActive ? "success" : "muted"}>{campaign.isActive ? "Active" : "Paused"}</Badge>;
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "campaigns"], queryFn: getCampaigns });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "campaigns"] });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setCampaignActive(id, isActive),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveCampaign(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectCampaign(id, reason),
    onSuccess: invalidate,
  });

  const handleReject = (id: string) => {
    const reason = window.prompt("Reason for rejecting this campaign (optional):") ?? undefined;
    reject.mutate({ id, reason: reason || undefined });
  };

  const actionsPending = toggle.isPending || approve.isPending || reject.isPending;

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
                    <td className="px-5 py-4 font-medium">
                      <div className="flex items-start gap-3">
                        {c.productImages[0] ? (
                          <a href={imageUrl(c.productImages[0])} target="_blank" rel="noreferrer">
                            <img
                              src={imageUrl(c.productImages[0])}
                              alt=""
                              className="size-10 shrink-0 rounded-md object-cover"
                            />
                          </a>
                        ) : (
                          <div className="size-10 shrink-0 rounded-md bg-muted" />
                        )}
                        <div>
                          <p>{c.productName}</p>
                          {c.productDescription && (
                            <p className="mt-0.5 max-w-[18rem] text-xs font-normal text-muted-foreground">
                              {c.productDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {typeof c.merchantId === "object" ? c.merchantId.businessName : c.merchantId}
                    </td>
                    <td className="px-5 py-4">
                      {etb(c.budgetRemaining)} / {etb(c.totalBudget)}
                    </td>
                    <td className="px-5 py-4">{etb(c.cpaReward)}</td>
                    <td className="px-5 py-4">{c.salesGenerated}</td>
                    <td className="px-5 py-4">
                      <StatusBadge campaign={c} />
                      {c.approvalStatus === "rejected" && c.rejectionReason && (
                        <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">{c.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {c.approvalStatus === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" disabled={actionsPending} onClick={() => approve.mutate(c._id)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionsPending}
                            onClick={() => handleReject(c._id)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : c.approvalStatus === "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionsPending}
                          onClick={() => toggle.mutate({ id: c._id, isActive: !c.isActive })}
                        >
                          {c.isActive ? "Pause" : "Resume"}
                        </Button>
                      ) : null}
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
