import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">ለነገ CPA</p>
            <p className="text-xs text-muted-foreground">Admin console</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lenege.et"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin accounts are created via the backend's{" "}
          <code className="rounded bg-muted px-1 py-0.5">npm run create-admin</code> script.
        </p>
      </div>
    </div>
  );
}
