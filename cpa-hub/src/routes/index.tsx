import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Rocket,
  Wallet,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Users,
  Megaphone,
  LogOut,
} from "lucide-react";

import { ViewSwitch } from "@/components/ViewSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import {
  ApiError,
  createCampaign,
  initializeDeposit,
  etb,
  getMyCampaigns,
  type Campaign,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brand Dashboard — Gulit CPA Affiliate Marketplace" },
      {
        name: "description",
        content:
          "Fund your wallet, launch CPA campaigns in ETB, and track affiliate sales from Telegram influencers.",
      },
      { property: "og:title", content: "Brand Dashboard — Gulit CPA Affiliate Marketplace" },
      {
        property: "og:description",
        content: "Launch pay-per-sale campaigns and track influencer-driven sales in real time.",
      },
    ],
  }),
  component: BrandDashboard,
});

type Section = "dashboard" | "launch" | "wallet";

const navItems: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "launch", label: "Launch Campaign", icon: Rocket },
  { key: "wallet", label: "Wallet", icon: Wallet },
];

function BrandDashboard() {
  const { status, merchant, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/login" });
    }
  }, [status, navigate]);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "mine"],
    queryFn: getMyCampaigns,
    enabled: status === "authenticated",
  });

  if (status !== "authenticated" || !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <ViewSwitch />
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Megaphone className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Gulit CPA</p>
              <p className="text-xs text-muted-foreground">{merchant.businessName}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (section === item.key
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-xl border border-sidebar-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Platform Balance</p>
              <p className="mt-1 text-lg font-semibold">{etb(merchant.walletBalance)}</p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 px-6 py-20 md:py-10">
          <div className="mx-auto max-w-5xl">
            {section === "dashboard" && (
              <DashboardSection
                campaigns={campaignsQuery.data ?? []}
                loading={campaignsQuery.isLoading}
                balance={merchant.walletBalance}
              />
            )}
            {section === "launch" && <LaunchSection onLaunched={refresh} />}
            {section === "wallet" && <WalletSection balance={merchant.walletBalance} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  if (campaign.approvalStatus === "pending") {
    return <Badge variant="secondary">Pending Review</Badge>;
  }
  if (campaign.approvalStatus === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return (
    <Badge variant="outline" className={campaign.isActive ? "text-success" : "text-muted-foreground"}>
      {campaign.isActive ? "Live" : "Paused"}
    </Badge>
  );
}

function DashboardSection({
  campaigns,
  loading,
  balance,
}: {
  campaigns: Campaign[];
  loading: boolean;
  balance: number;
}) {
  const totalSales = campaigns.reduce((s, c) => s + c.salesGenerated, 0);
  const activeBudget = campaigns.reduce((s, c) => s + c.budgetRemaining, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance across all pay-per-sale campaigns.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Platform Balance" value={etb(balance)} icon={Wallet} />
        <StatCard label="Budget in Escrow" value={etb(activeBudget)} icon={TrendingUp} />
        <StatCard label="Total Sales Generated" value={String(totalSales)} icon={Users} />
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Active Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No campaigns yet — launch your first one to see it here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">CPA Reward</th>
                  <th className="w-[34%] px-5 py-3 font-medium">Budget Remaining</th>
                  <th className="px-5 py-3 text-right font-medium">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{c.productName}</td>
                    <td className="px-5 py-4">
                      <CampaignStatusBadge campaign={c} />
                      {c.approvalStatus === "rejected" && c.rejectionReason && (
                        <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{c.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{etb(c.cpaReward)}</td>
                    <td className="px-5 py-4">
                      <Progress value={(c.budgetRemaining / c.totalBudget) * 100} className="h-2" />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {etb(c.budgetRemaining)} of {etb(c.totalBudget)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">{c.salesGenerated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function LaunchSection({ onLaunched }: { onLaunched: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const [productName, setProductName] = useState("");
  const [budget, setBudget] = useState("");
  const [reward, setReward] = useState("");
  const [launched, setLaunched] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launchMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (campaign) => {
      setLaunched(campaign.productName);
      setProductName("");
      setBudget("");
      setReward("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["campaigns", "mine"] }),
        onLaunched(),
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to launch campaign");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !budget || !reward) return;
    setError(null);
    setLaunched(null);
    launchMutation.mutate({
      productName,
      totalBudget: Number(budget),
      cpaReward: Number(reward),
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Launch Campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your budget is held in escrow. Campaigns go live once an admin approves them.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="max-w-xl space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="product">Product Name</Label>
          <Input
            id="product"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Habesha Coffee Sampler Box"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budget">Total Campaign Budget (ETB)</Label>
            <Input
              id="budget"
              type="number"
              min={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="20000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reward">CPA Reward (ETB per sale)</Label>
            <Input
              id="reward"
              type="number"
              min={1}
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>
        <Button type="submit" disabled={launchMutation.isPending} className="w-full sm:w-auto">
          {launchMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Launching…
            </>
          ) : (
            <>
              <Rocket className="size-4" /> Launch
            </>
          )}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {launched && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="size-4" />"{launched}" was submitted for admin review —
            it'll go live once approved.
          </p>
        )}
      </form>
    </div>
  );
}

function WalletSection({ balance }: { balance: number }) {
  const [amount, setAmount] = useState("10000");
  const [error, setError] = useState<string | null>(null);

  const topUpMutation = useMutation({
    mutationFn: () => initializeDeposit(Number(amount)),
    onSuccess: ({ checkoutUrl }) => {
      setError(null);
      window.location.href = checkoutUrl;
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to start payment");
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Funds available to allocate to new campaigns.
        </p>
      </header>

      <div className="max-w-xl rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Platform Balance</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">{etb(balance)}</p>

        <div className="mt-6 space-y-2">
          <Label htmlFor="topUpAmount">Amount (ETB)</Label>
          <Input
            id="topUpAmount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <Button
          onClick={() => topUpMutation.mutate()}
          disabled={topUpMutation.isPending || !Number(amount)}
          className="mt-4"
        >
          {topUpMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Redirecting to Chapa…
            </>
          ) : (
            <>
              <Wallet className="size-4" /> Top Up Wallet
            </>
          )}
        </Button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          You'll be redirected to Chapa's test checkout to complete payment.
        </p>
      </div>
    </div>
  );
}
