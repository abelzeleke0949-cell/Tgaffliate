import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ApiError, etb, verifyDeposit } from "@/lib/api";

const searchSchema = z.object({
  tx_ref: z.string().optional(),
});

export const Route = createFileRoute("/wallet-callback")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Confirming deposit — Gulit CPA Affiliate Marketplace" }],
  }),
  component: WalletCallbackPage,
});

function WalletCallbackPage() {
  const { tx_ref } = Route.useSearch();
  const { refresh } = useAuth();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!tx_ref) {
      setState("error");
      setMessage("Missing transaction reference.");
      return;
    }

    let cancelled = false;

    verifyDeposit(tx_ref)
      .then(async (data) => {
        if (cancelled) return;
        await refresh();
        setBalance(data.walletBalance);
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
            <p className="mt-4 text-sm font-medium">Deposit confirmed</p>
            {balance !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                New wallet balance: {etb(balance)}
              </p>
            )}
            <Button asChild className="mt-6">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto size-8 text-destructive" />
            <p className="mt-4 text-sm font-medium">Payment not confirmed</p>
            {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
