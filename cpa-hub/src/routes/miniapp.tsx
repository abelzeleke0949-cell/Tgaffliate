import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Link2,
  Copy,
  Loader2,
  ShoppingBag,
  Wallet,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  etb,
  getActiveCampaigns,
  imageUrl,
  initializePurchase,
  type Campaign,
  type Product,
} from "@/lib/api";

const searchSchema = z.object({
  campaignId: z.string().optional(),
  buyerId: z.string().optional(),
});

export const Route = createFileRoute("/miniapp")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Telegram Mini App — Promote & Earn in ETB" },
      {
        name: "description",
        content:
          "Influencers generate affiliate links and buyers check out with Chapa inside the Telegram Mini App.",
      },
      { property: "og:title", content: "Telegram Mini App — Promote & Earn in ETB" },
      {
        property: "og:description",
        content:
          "Generate affiliate links, share on Telegram, and earn ETB for every verified sale.",
      },
    ],
  }),
  component: MiniAppPage,
});

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: { user?: { id: number; username?: string; first_name?: string } };
      };
    };
  }
}

function getTelegramUserId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return id ? String(id) : null;
}

function getTelegramUserName(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;
}

function MiniAppPage() {
  const { campaignId, buyerId } = Route.useSearch();
  const arrivedViaReferral = Boolean(campaignId);
  const [mode, setMode] = useState<"influencer" | "buyer">(
    arrivedViaReferral ? "buyer" : "influencer",
  );
  const [earnings] = useState(150);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: getActiveCampaigns,
  });

  return (
    <div className="min-h-screen bg-muted/40 px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-[393px]">
        <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-2xl">
          <div className="h-[852px] overflow-y-auto">
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                SB
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">@selam_bekele</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wallet className="size-3" /> Earnings Balance: {etb(earnings)}
                </p>
              </div>
            </header>

            <div className="px-4 pt-4">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                {(["influencer", "buyer"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={
                      "rounded-full py-2 text-xs font-semibold capitalize transition-colors " +
                      (mode === m
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground")
                    }
                  >
                    {m} mode
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-5">
              {campaignsQuery.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : mode === "influencer" ? (
                <InfluencerMode campaigns={campaignsQuery.data ?? []} />
              ) : (
                <BuyerMode
                  campaigns={campaignsQuery.data ?? []}
                  campaignId={campaignId}
                  buyerId={buyerId}
                  arrivedViaReferral={arrivedViaReferral}
                />
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Mini App preview — iPhone Pro viewport (393 × 852)
        </p>
      </div>
    </div>
  );
}

function InfluencerMode({ campaigns }: { campaigns: Campaign[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const influencerId = useMemo(() => getTelegramUserId() ?? "123", []);

  if (campaigns.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No active campaigns to promote right now — check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Products to promote</h1>
        <p className="text-xs text-muted-foreground">Get paid per verified sale, not per click.</p>
      </div>

      {campaigns.map((c) => {
        const title = c.productIds.map((p) => p.name).join(", ") || "(products unavailable)";
        return (
          <article key={c._id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-snug">{title}</p>
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground">
                <Sparkles className="size-3" /> {etb(c.cpaReward)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Reward: {etb(c.cpaReward)} per sale</p>

            {links[c._id] ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <Link2 className="size-3.5 shrink-0 text-primary" />
                  <code className="truncate text-[11px]">{links[c._id]}</code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigator.clipboard?.writeText(links[c._id]!)}
                >
                  <Copy className="size-3.5" /> Copy link
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() =>
                  setLinks((prev) => ({
                    ...prev,
                    [c._id]: `t.me/gulitbot?start=inf_${influencerId}_camp_${c._id}`,
                  }))
                }
              >
                <Link2 className="size-3.5" /> Generate My Affiliate Link
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function BuyerMode({
  campaigns,
  campaignId,
  buyerId,
  arrivedViaReferral,
}: {
  campaigns: Campaign[];
  campaignId: string | undefined;
  buyerId: string | undefined;
  arrivedViaReferral: boolean;
}) {
  const campaign = useMemo(
    () => campaigns.find((c) => c._id === campaignId) ?? campaigns[0],
    [campaigns, campaignId],
  );

  const categories = useMemo(
    () => Array.from(new Set((campaign?.productIds ?? []).map((p) => p.category))),
    [campaign],
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const filteredProducts = (campaign?.productIds ?? []).filter(
    (p) => !categoryFilter || p.category === categoryFilter,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const activeProduct = selectedProduct ?? filteredProducts[0] ?? campaign?.productIds[0] ?? null;

  const [error, setError] = useState<string | null>(null);

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!campaign || !activeProduct) throw new Error("No product selected");
      const effectiveBuyerId = buyerId ?? getTelegramUserId() ?? `preview_${Date.now()}`;
      return initializePurchase({
        buyerTelegramId: effectiveBuyerId,
        campaignId: campaign._id,
        productId: activeProduct._id,
        buyerName: getTelegramUserName(),
      });
    },
    onSuccess: ({ checkoutUrl }) => {
      setError(null);
      window.location.href = checkoutUrl;
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "Payment could not be started. Please try again.",
      );
    },
  });

  if (!campaign || !activeProduct) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No product to check out — open this app via an influencer's affiliate link.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {arrivedViaReferral && (
        <div className="rounded-full bg-accent px-3 py-1.5 text-center text-[11px] font-medium text-accent-foreground">
          Arrived via an affiliate link
        </div>
      )}

      {campaign.productIds.length > 1 && (
        <div className="space-y-2">
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter(null)}
                className={
                  "rounded-full px-2.5 py-1 text-[11px] font-medium " +
                  (categoryFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-medium " +
                    (categoryFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredProducts.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelectedProduct(p)}
                className={
                  "shrink-0 overflow-hidden rounded-lg border-2 " +
                  (activeProduct._id === p._id ? "border-primary" : "border-transparent")
                }
              >
                {p.images[0] ? (
                  <img src={imageUrl(p.images[0])} alt="" className="size-14 object-cover" />
                ) : (
                  <div className="flex size-14 items-center justify-center bg-muted">
                    <ShoppingBag className="size-5 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        {activeProduct.images[0] ? (
          <img
            src={imageUrl(activeProduct.images[0])}
            alt={activeProduct.name}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-primary/10">
            <ShoppingBag className="size-12 text-primary" />
          </div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-base font-semibold leading-snug">{activeProduct.name}</h1>
            <Badge variant="secondary" className="shrink-0">
              {activeProduct.category}
            </Badge>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-current text-chart-4" /> 4.8 · 1,204 orders
          </p>
          {activeProduct.description && (
            <p className="text-sm text-muted-foreground">{activeProduct.description}</p>
          )}
          <p className="pt-1 text-2xl font-semibold tracking-tight">{etb(activeProduct.price)}</p>
        </div>
      </article>

      <Button onClick={() => buyMutation.mutate()} disabled={buyMutation.isPending} size="lg" className="w-full">
        {buyMutation.isPending ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Contacting Chapa…
          </>
        ) : (
          "Buy Now with Chapa"
        )}
      </Button>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
