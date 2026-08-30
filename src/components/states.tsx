import type { ReactNode } from "react";
import { Loader2, AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function LoadingList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-3xl border border-destructive/25 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
      <h2 className="mt-3 font-display text-base font-semibold">Impossible de charger les données</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? "Vérifiez votre connexion et réessayez."}
      </p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-sm text-warning-foreground"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        Vous êtes hors ligne. Consultez vos données, l'enregistrement reprendra au retour du réseau.
      </span>
    </div>
  );
}
