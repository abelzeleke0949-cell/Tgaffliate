import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Link2,
  Copy,
  Loader2,
  ShoppingBag,
  Wallet,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  etb,
  getActiveCampaigns,
  imageUrl,
  initializePurchase,
  createOrUpdateTelegramUser,
  getTelegramUserProfile,
  type Campaign,
  type Product,
  type TelegramUser,
} from "@/lib/api";

// Must match the bot actually registered with BotFather under TELEGRAM_BOT_TOKEN
// (verify with the Telegram Bot API's getMe) — a mismatch here silently breaks every
// affiliate link the Mini App generates, since t.me/<wrong-username> resolves to nothing.
const TELEGRAM_BOT_USERNAME = import.meta.env["VITE_TELEGRAM_BOT_USERNAME"] || "Lenege_bot";

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
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: { user?: { id: number; username?: string; first_name?: string } };
      };
    };
  }
}

const TELEGRAM_WEB_APP_SCRIPT_SRC = "https://telegram.org/js/telegram-web-app.js";

// Telegram only populates window.Telegram.WebApp once this SDK script has loaded — it isn't
// bundled by us, so without it every real user (opened from inside Telegram) would look
// indistinguishable from someone visiting in a plain browser, and never get past the
// "Open this app from Telegram to continue" screen.
function loadTelegramWebAppScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${TELEGRAM_WEB_APP_SCRIPT_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TELEGRAM_WEB_APP_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function getTelegramUserId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return id ? String(id) : null;
}

function getTelegramUserName(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.username;
}

function getTelegramFirstName(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;
}

function MiniAppPage() {
  const { campaignId, buyerId } = Route.useSearch();
  const arrivedViaReferral = Boolean(campaignId);
  const [mode, setMode] = useState<"influencer" | "buyer">(
    arrivedViaReferral ? "buyer" : "influencer",
  );

  const [tgUser, setTgUser] = useState<{
    telegramId: string;
    username: string | undefined;
    firstName: string | undefined;
  } | null>(null);
  const [tgReady, setTgReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadTelegramWebAppScript().then(() => {
      if (cancelled) return;

      // Tells Telegram the app is ready to be displayed and expands it to full height —
      // required for the Mini App to behave like a native screen instead of a cramped popup.
      window.Telegram?.WebApp?.ready?.();
      window.Telegram?.WebApp?.expand?.();

      const id = getTelegramUserId();
      setTgUser({
        telegramId: id ?? "",
        username: getTelegramUserName(),
        firstName: getTelegramFirstName(),
      });
      setTgReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const profileQuery = useQuery({
    queryKey: ["telegramProfile", tgUser?.telegramId],
    queryFn: async (): Promise<TelegramUser> => {
      if (!tgUser?.telegramId) throw new Error("No Telegram user detected");
      const payload: { telegramId: string; username?: string; firstName?: string } = {
        telegramId: tgUser.telegramId,
      };
      if (tgUser.username) payload.username = tgUser.username;
      if (tgUser.firstName) payload.firstName = tgUser.firstName;
      await createOrUpdateTelegramUser(payload);
      return getTelegramUserProfile(tgUser.telegramId);
    },
    enabled: tgReady && !!tgUser?.telegramId,
  });

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: getActiveCampaigns,
  });

  const profile = profileQuery.data;
  const displayName =
    profile?.firstName || profile?.username || tgUser?.firstName || tgUser?.username || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {profile?.username ? `@${profile.username}` : displayName}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="size-3" /> Earnings Balance:{" "}
              {profile ? etb(profile.earningsBalance) : "—"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-6 grid max-w-xs grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["influencer", "buyer"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "rounded-full py-2.5 text-sm font-semibold capitalize transition-colors " +
                (mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m} mode
            </button>
          ))}
        </div>

        {campaignsQuery.isLoading || profileQuery.isLoading || !tgReady ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tgReady && !tgUser?.telegramId ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Open this app from Telegram to continue.
            </p>
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
  );
}

function InfluencerMode({ campaigns }: { campaigns: Campaign[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const influencerId = useMemo(() => getTelegramUserId() ?? "123", []);

  if (campaigns.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">
        No active campaigns to promote right now — check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Products to promote</h1>
        <p className="mt-1 text-sm text-muted-foreground">Get paid per verified sale, not per click.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => {
          const title = c.productIds.map((p) => p.name).join(", ") || "(products unavailable)";
          const firstImage = c.productIds[0]?.images[0];
          return (
            <article key={c._id} className="overflow-hidden rounded-xl border border-border bg-card">
              {firstImage ? (
                <img src={imageUrl(firstImage)} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-muted">
                  <ShoppingBag className="size-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{title}</p>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    <Sparkles className="size-3" /> {etb(c.cpaReward)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Reward: {etb(c.cpaReward)} per sale</p>

                {links[c._id] ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                      <Link2 className="size-3.5 shrink-0 text-primary" />
                      <code className="min-w-0 flex-1 truncate text-xs">{links[c._id]}</code>
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
                    className="w-full"
                    onClick={() =>
                      setLinks((prev) => ({
                        ...prev,
                        [c._id]: `t.me/${TELEGRAM_BOT_USERNAME}?start=inf_${influencerId}_camp_${c._id}`,
                      }))
                    }
                  >
                    <Link2 className="size-3.5" /> Generate My Affiliate Link
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
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
    <div className="space-y-6">
      {arrivedViaReferral && (
        <div className="rounded-full bg-accent/60 px-4 py-2 text-center text-sm font-medium text-accent-foreground">
          Arrived via an affiliate link
        </div>
      )}

      {campaign.productIds.length > 1 && (
        <div className="space-y-3">
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (categoryFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground")
                }
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                    (categoryFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground")
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {filteredProducts.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelectedProduct(p)}
                className={
                  "shrink-0 overflow-hidden rounded-xl border-2 transition-colors " +
                  (activeProduct._id === p._id ? "border-primary" : "border-transparent hover:border-border")
                }
              >
                {p.images[0] ? (
                  <img src={imageUrl(p.images[0])} alt="" className="size-16 object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center bg-muted">
                    <ShoppingBag className="size-5 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <article className="overflow-hidden rounded-xl border border-border bg-card">
        {activeProduct.images[0] ? (
          <img
            src={imageUrl(activeProduct.images[0])}
            alt={activeProduct.name}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="flex h-52 items-center justify-center bg-primary/10">
            <ShoppingBag className="size-12 text-primary" />
          </div>
        )}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-semibold leading-snug">{activeProduct.name}</h1>
            <Badge variant="secondary" className="shrink-0">
              {activeProduct.category}
            </Badge>
          </div>
          {activeProduct.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{activeProduct.description}</p>
          )}
          <p className="pt-1 text-3xl font-semibold tracking-tight">{etb(activeProduct.price)}</p>
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

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
