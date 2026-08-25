import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import { etb, getUsers } from "@/lib/api";

export default function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: getUsers });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Influencers & Buyers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Telegram users registered on the platform.</p>
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
                  <th className="px-5 py-3 font-medium">Telegram ID</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Total Earned</th>
                  <th className="px-5 py-3 text-right font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((u) => (
                  <tr key={u._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-mono text-xs">{u.telegramId}</td>
                    <td className="px-5 py-4">{u.username ? `@${u.username}` : "—"}</td>
                    <td className="px-5 py-4">
                      <Badge tone="muted">{u.role}</Badge>
                    </td>
                    <td className="px-5 py-4 font-medium">{etb(u.earningsBalance)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{etb(u.totalEarnings)}</td>
                    <td className="px-5 py-4 text-right">{u.totalConversions}</td>
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
