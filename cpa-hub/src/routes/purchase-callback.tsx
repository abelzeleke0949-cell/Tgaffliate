import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { ViewSwitch } from "@/components/ViewSwitch";
import { Button } from "@/components/ui/button";
import { ApiError, verifyPurchase } from "@/lib/api";

const searchSchema = z.object({
  tx_ref: z.string().optional(),
});

export const Route = createFileRoute("/purchase-callback")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Confirming purchase — Gulit CPA Affiliate Marketplace" }],
  }),
  component: PurchaseCallbackPage,
});

function PurchaseCallbackPage() {
  const { tx_ref } = Route.useSearch();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tx_ref) {
      setState("error");
      setMessage("Missing transaction reference.");
      return;
    }

    let cancelled = false;

    verifyPurchase(tx_ref)
      .then(() => {
        if (cancelled) return;
        setState("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError ? err.message : "Could not confirm this payment.");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx_ref]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <ViewSwitch />
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your payment…</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto size-8 text-success" />
            <p className="mt-4 text-sm font-medium">Payment confirmed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thanks for your purchase — the referring influencer has been credited.
            </p>
            <Button asChild className="mt-6">
              <Link to="/miniapp">Back to app</Link>
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto size-8 text-destructive" />
            <p className="mt-4 text-sm font-medium">Payment not confirmed</p>
            {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
            <Button asChild variant="outline" className="mt-6">
              <Link to="/miniapp">Back to app</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
