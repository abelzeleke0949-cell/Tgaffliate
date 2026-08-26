import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Smartphone } from "lucide-react";

export function ViewSwitch() {
  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const active = "bg-primary text-primary-foreground hover:text-primary-foreground shadow-sm";

  return (
    <nav
      aria-label="Switch view"
      className="fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
    >
      <Link
        to="/"
        className={base}
        activeProps={{ className: active }}
        activeOptions={{ exact: true }}
      >
        <LayoutDashboard className="size-4" />
        <span className="hidden min-[380px]:inline">Brand Dashboard</span>
      </Link>
      <Link to="/miniapp" className={base} activeProps={{ className: active }}>
        <Smartphone className="size-4" />
        <span className="hidden min-[380px]:inline">Telegram Mini App</span>
      </Link>
    </nav>
  );
}
