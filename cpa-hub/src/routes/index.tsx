import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  ImagePlus,
  Package,
  X,
} from "lucide-react";

import { ViewSwitch } from "@/components/ViewSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { useAuth } from "@/lib/auth";
import {
  ApiError,
  createCampaign,
  createProduct,
  imageUrl,
  initializeDeposit,
  etb,
  getMyCampaigns,
  getMyProducts,
  updateProduct,
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

type Section = "dashboard" | "products" | "launch" | "wallet";

const navItems: { key: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
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
            {section === "products" && <ProductsSection />}
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
          <h2 className="text-sm font-semibold">Campaigns</h2>
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
                  <th className="px-5 py-3 font-medium">Products</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">CPA Reward</th>
                  <th className="w-[34%] px-5 py-3 font-medium">Budget Remaining</th>
                  <th className="px-5 py-3 text-right font-medium">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const firstImage = c.productIds[0]?.images[0];
                  const title =
                    c.productIds.map((p) => p.name).join(", ") || "(products unavailable)";
                  return (
                    <tr key={c._id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          {firstImage ? (
                            <img
                              src={imageUrl(firstImage)}
                              alt=""
                              className="size-8 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <div className="size-8 shrink-0 rounded-md bg-muted" />
                          )}
                          <span className="max-w-[16rem] truncate">{title}</span>
                        </div>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const MIN_PRODUCT_IMAGES = 3;
const MAX_PRODUCT_IMAGES = 6;

function ProductsSection() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products", "mine"], queryFn: getMyProducts });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async (product) => {
      setAdded(product.name);
      setName("");
      setDescription("");
      setCategory("");
      setPrice("");
      setStockQuantity("");
      setImages([]);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["products", "mine"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to add product");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateProduct(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products", "mine"] }),
  });

  const addImages = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_PRODUCT_IMAGES));
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const canSubmit =
    name && description.trim() && category && price && images.length >= MIN_PRODUCT_IMAGES;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setAdded(null);
    createMutation.mutate({
      name,
      description: description.trim(),
      category,
      price: Number(price),
      stockQuantity: stockQuantity ? Number(stockQuantity) : undefined,
      images,
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your catalog. Products live here independently of campaigns — pick from them when you
          launch a campaign.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="max-w-xl space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="pname">Product / Service Name</Label>
          <Input
            id="pname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Habesha Coffee Sampler Box"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdescription">Description</Label>
          <Textarea
            id="pdescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is it, who's it for, what makes it worth promoting?"
            rows={3}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pcategory">Category</Label>
            <select
              id="pcategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a category…</option>
              {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pprice">Price (ETB)</Label>
            <Input
              id="pprice"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1250"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pstock">Stock Quantity (leave blank for unlimited / services)</Label>
          <Input
            id="pstock"
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="e.g. 50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pimages">
            Images ({images.length}/{MAX_PRODUCT_IMAGES}, at least {MIN_PRODUCT_IMAGES} required)
          </Label>
          <Input
            id="pimages"
            type="file"
            accept="image/*"
            multiple
            disabled={images.length >= MAX_PRODUCT_IMAGES}
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {previews.map((src, i) => (
                <div key={src} className="group relative size-16 overflow-hidden rounded-lg border border-border">
                  <img src={src} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < MIN_PRODUCT_IMAGES && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImagePlus className="size-3.5" /> {MIN_PRODUCT_IMAGES - images.length} more image
              {MIN_PRODUCT_IMAGES - images.length === 1 ? "" : "s"} needed
            </p>
          )}
        </div>
        <Button type="submit" disabled={createMutation.isPending || !canSubmit} className="w-full sm:w-auto">
          {createMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Adding…
            </>
          ) : (
            <>
              <Package className="size-4" /> Add to Catalog
            </>
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {added && (
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="size-4" />"{added}" was added to your catalog.
          </p>
        )}
      </form>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Your Catalog</h2>
        </div>
        {productsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (productsQuery.data ?? []).length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No products yet — add your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {(productsQuery.data ?? []).map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-5 py-3">
                {p.images[0] ? (
                  <img src={imageUrl(p.images[0])} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="size-10 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · {etb(p.price)}
                    {p.stockQuantity !== null ? ` · ${p.stockQuantity} in stock` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={toggleActiveMutation.isPending}
                  onClick={() => toggleActiveMutation.mutate({ id: p._id, isActive: !p.isActive })}
                >
                  {p.isActive ? "Deactivate" : "Activate"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LaunchSection({ onLaunched }: { onLaunched: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products", "mine"], queryFn: getMyProducts });
  const activeProducts = (productsQuery.data ?? []).filter((p) => p.isActive);

  const [selected, setSelected] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [reward, setReward] = useState("");
  const [endDate, setEndDate] = useState("");
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: async () => {
      setLaunched(true);
      setSelected([]);
      setBudget("");
      setReward("");
      setEndDate("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["campaigns", "mine"] }),
        onLaunched(),
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to launch campaign");
    },
  });

  const toggleProduct = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const canSubmit = selected.length > 0 && budget && reward && endDate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLaunched(false);
    launchMutation.mutate({
      productIds: selected,
      totalBudget: Number(budget),
      cpaReward: Number(reward),
      endDate,
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Launch Campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick products from your catalog, set a budget and reward, and choose an end date. Your
          budget is held in escrow. Campaigns go live once an admin approves them.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="max-w-xl space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Products to promote</Label>
          {productsQuery.isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : activeProducts.length === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              You have no active products yet. Add one in the Products section first.
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {activeProducts.map((p) => (
                <label
                  key={p._id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p._id)}
                    onChange={() => toggleProduct(p._id)}
                    className="size-4 rounded border-input"
                  />
                  {p.images[0] ? (
                    <img src={imageUrl(p.images[0])} alt="" className="size-8 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="size-8 shrink-0 rounded bg-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{etb(p.price)}</span>
                </label>
              ))}
            </div>
          )}
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
        <div className="space-y-2">
          <Label htmlFor="endDate">Campaign End Date</Label>
          <Input
            id="endDate"
            type="date"
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={launchMutation.isPending || !canSubmit}
          className="w-full sm:w-auto"
        >
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
            <CheckCircle2 className="size-4" /> Campaign submitted for admin review — it'll go
            live once approved.
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
