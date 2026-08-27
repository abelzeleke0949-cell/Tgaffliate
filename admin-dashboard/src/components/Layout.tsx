import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Store, Megaphone, Users, Activity, LogOut, ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/merchants", label: "Merchants", icon: Store, end: false },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, end: false },
  { to: "/users", label: "Influencers", icon: Users, end: false },
  { to: "/sessions", label: "Transactions", icon: Activity, end: false },
];

export default function Layout() {
  const { admin, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">ለነገ CPA</p>
            <p className="text-xs text-muted-foreground">Admin console</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-sidebar-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold">{admin?.email}</p>
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

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
