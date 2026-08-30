import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Users,
  PieChart,
  Plus,
  Bell,
  Receipt,
  Wallet,
  Sparkles,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useOrg } from "@/components/org-context";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineBanner } from "@/components/states";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { to: "/tableau-de-bord", label: "Accueil", icon: Home },
  { to: "/produits", label: "Produits", icon: Package },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/bilan", label: "Bilan", icon: PieChart },
] as const;

const SECONDARY_NAV = [
  { to: "/historique", label: "Historique", icon: Receipt },
  { to: "/depenses", label: "Dépenses", icon: Wallet },
  { to: "/assistant", label: "Assistant IA", icon: Sparkles },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/parametres", label: "Réglages", icon: Settings },
] as const;

export function AppShell({
  children,
  unreadCount = 0,
}: {
  children: ReactNode;
  unreadCount?: number;
}) {
  const { org, userEmail } = useOrg();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar bureau */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <Link to="/tableau-de-bord" className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-hero-gradient font-display text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="min-w-0">
            <span className="block font-display text-base font-bold tracking-tight">VOCALEO</span>
            <span className="block truncate text-xs text-muted-foreground">{org.name}</span>
          </span>
        </Link>

        <Button asChild className="mt-6 h-11 rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90">
          <Link to="/ventes/nouvelle">
            <Plus className="h-4 w-4" aria-hidden /> Nouvelle vente
          </Link>
        </Button>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{item.label}</span>
              {item.to === "/notifications" && unreadCount > 0 ? (
                <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{userEmail}</span>
        </button>
      </aside>

      {/* Barre haute mobile */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur lg:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hero-gradient font-display text-xs font-bold text-primary-foreground">
              V
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold">{org.name}</span>
              <span className="block text-[11px] text-muted-foreground">VOCALEO · FCFA</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/notifications" aria-label="Notifications">
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="font-display">Menu</SheetTitle>
                <nav className="mt-4 flex flex-col gap-1">
                  {SECONDARY_NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden /> {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={signOut}
                    className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden /> Se déconnecter
                  </button>
                </nav>
                <p className="mt-6 px-3 text-xs text-muted-foreground">Connecté : {userEmail}</p>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:max-w-none lg:pb-12 lg:pl-72 lg:pr-8 lg:pt-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {!online ? <OfflineBanner /> : null}
          {children}
        </div>
      </main>

      {/* Navigation basse mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end px-2 py-1.5">
          {PRIMARY_NAV.slice(0, 2).map((item) => (
            <NavTab key={item.to} {...item} active={isActive(item.to)} />
          ))}
          <div className="flex justify-center">
            <Link
              to="/ventes/nouvelle"
              aria-label="Nouvelle vente"
              className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient text-accent-foreground shadow-lift"
            >
              <Plus className="h-6 w-6" aria-hidden />
            </Link>
          </div>
          {PRIMARY_NAV.slice(2).map((item) => (
            <NavTab key={item.to} {...item} active={isActive(item.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavTab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
        active ? "text-accent" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
