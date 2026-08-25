import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import { etb, getMerchants, setMerchantActive } from "@/lib/api";

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "merchants"], queryFn: getMerchants });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setMerchantActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] }),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
        <p className="mt-1 text-sm text-muted-foreground">Brands running campaigns on the platform.</p>
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
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Wallet Balance</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((m) => (
                  <tr key={m._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{m.businessName}</td>
                    <td className="px-5 py-4 text-muted-foreground">{m.email}</td>
                    <td className="px-5 py-4">{etb(m.walletBalance)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={m.isActive ? "success" : "muted"}>{m.isActive ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: m._id, isActive: !m.isActive })}
                      >
                        {m.isActive ? "Disable" : "Enable"}
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
