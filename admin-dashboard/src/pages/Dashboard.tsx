import { useQuery } from "@tanstack/react-query";
import { Loader2, Store, Megaphone, Users, Wallet, TrendingUp, Activity } from "lucide-react";

import { Card } from "@/components/ui";
import { etb, getStats } from "@/lib/api";

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Store }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: getStats });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live snapshot across every merchant on ለነገ CPA.</p>
      </header>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Merchants" value={String(data.merchantCount)} icon={Store} />
          <StatCard
            label="Campaigns"
            value={`${data.activeCampaignCount} active / ${data.campaignCount} total`}
            icon={Megaphone}
          />
          <StatCard label="Influencers & Buyers" value={String(data.userCount)} icon={Users} />
          <StatCard label="Budget in Escrow" value={etb(data.totalEscrow)} icon={Wallet} />
          <StatCard label="Total Paid Out" value={etb(data.totalPaidOut)} icon={TrendingUp} />
          <StatCard
            label="Conversions"
            value={`${data.sessions.converted} / ${data.sessions.total} sessions`}
            icon={Activity}
          />
        </div>
      )}
    </div>
  );
}
