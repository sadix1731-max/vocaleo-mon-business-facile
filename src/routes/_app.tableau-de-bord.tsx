import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Wallet,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Receipt,
} from "lucide-react";
import { useOrg } from "@/components/org-context";
import { fetchSales, fetchExpenses, fetchProducts } from "@/lib/api";
import { fcfa, shortDate, paymentLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/states";

export const Route = createFileRoute("/_app/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — VOCALEO" },
      {
        name: "description",
        content: "Vos ventes du jour, vos dépenses et votre bénéfice du mois en un coup d'œil.",
      },
      { property: "og:title", content: "Tableau de bord — VOCALEO" },
      { property: "og:description", content: "Suivez l'activité de votre boutique au quotidien." },
    ],
  }),
  component: Dashboard,
});

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function Dashboard() {
  const { org } = useOrg();

  const salesQuery = useQuery({ queryKey: ["sales", org.id], queryFn: () => fetchSales(org.id) });
  const expensesQuery = useQuery({ queryKey: ["expenses", org.id], queryFn: () => fetchExpenses(org.id) });
  const productsQuery = useQuery({ queryKey: ["products", org.id], queryFn: () => fetchProducts(org.id) });

  const isLoading = salesQuery.isLoading || expensesQuery.isLoading;
  const isError = salesQuery.isError || expensesQuery.isError;

  const sales = salesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const today = new Date().toDateString();
  const monthStart = startOfMonth();

  const todayTotal = sales
    .filter((s) => new Date(s.sold_at).toDateString() === today)
    .reduce((sum, s) => sum + Number(s.total_amount), 0);
  const monthSales = sales.filter((s) => new Date(s.sold_at).getTime() >= monthStart);
  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const monthExpenses = expenses
    .filter((e) => new Date(e.spent_at).getTime() >= monthStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = monthRevenue - monthExpenses;
  const unpaid = sales
    .filter((s) => s.status !== "paid")
    .reduce((sum, s) => sum + (Number(s.total_amount) - Number(s.amount_paid)), 0);

  const lowStock = products.filter((p) => {
    const inv = p.inventory?.[0];
    return inv && Number(inv.quantity) <= Number(inv.low_stock_threshold);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour 👋`}
        subtitle={`Voici où en est ${org.name} aujourd'hui.`}
        action={
          <Button asChild className="h-11 rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90">
            <Link to="/ventes/nouvelle">
              <Plus className="h-4 w-4" aria-hidden /> Vendre
            </Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => salesQuery.refetch()} />
      ) : isLoading ? (
        <LoadingList rows={3} />
      ) : (
        <>
          <section className="rounded-3xl bg-hero-gradient p-6 text-primary-foreground shadow-lift">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
              Ventes du jour
            </p>
            <p className="mt-1 font-display text-4xl font-extrabold">{fcfa(todayTotal)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Ventes du mois" value={fcfa(monthRevenue)} />
              <MiniStat label="Dépenses du mois" value={fcfa(monthExpenses)} />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3">
              {profit >= 0 ? (
                <TrendingUp className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              )}
              <p className="min-w-0 text-sm">
                {profit >= 0 ? "Vous gagnez " : "Vous êtes en perte de "}
                <span className="font-bold">{fcfa(Math.abs(profit))}</span> ce mois-ci.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction to="/ventes/nouvelle" icon={Receipt} label="Nouvelle vente" />
            <QuickAction to="/depenses" icon={Wallet} label="Ajouter dépense" />
            <QuickAction to="/produits" icon={Package} label="Mes produits" />
            <QuickAction to="/clients" icon={Users} label="Mes clients" />
          </section>

          {unpaid > 0 ? (
            <Link
              to="/historique"
              className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3.5 text-sm"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-gold-foreground" aria-hidden />
              <span className="min-w-0">
                <strong>{fcfa(unpaid)}</strong> restent à encaisser chez vos clients.
              </span>
            </Link>
          ) : null}

          {lowStock.length > 0 ? (
            <Link
              to="/produits"
              className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm"
            >
              <Package className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <span className="min-w-0">
                {lowStock.length} produit{lowStock.length > 1 ? "s" : ""} en stock bas —{" "}
                {lowStock
                  .slice(0, 2)
                  .map((p) => p.name)
                  .join(", ")}
                .
              </span>
            </Link>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Dernières ventes</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/historique">Tout voir</Link>
              </Button>
            </div>

            {sales.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="Aucune vente pour l'instant"
                description="Enregistrez votre première vente, cela prend 15 secondes."
                action={
                  <Button asChild className="h-11 rounded-2xl">
                    <Link to="/ventes/nouvelle">Enregistrer une vente</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {sales.slice(0, 5).map((sale) => (
                  <li key={sale.id}>
                    <Link
                      to="/recu/$saleId"
                      params={{ saleId: sale.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft transition-colors hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {sale.customers?.name ?? "Client de passage"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {shortDate(sale.sold_at)} · {paymentLabel(sale.payment_method)} ·{" "}
                          {sale.sale_items.length} article{sale.sale_items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold">{fcfa(sale.total_amount)}</p>
                        <StatusBadge status={sale.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link
            to="/assistant"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-gold-foreground">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Demandez à votre assistant</span>
              <span className="block truncate text-xs text-muted-foreground">
                « Combien j'ai gagné cette semaine ? »
              </span>
            </span>
          </Link>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-[11px] text-primary-foreground/70">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-accent/40"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-accent">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "paid")
    return (
      <Badge className="mt-0.5 border-0 bg-accent/15 text-[10px] text-accent-foreground">Payée</Badge>
    );
  if (status === "partial")
    return <Badge className="mt-0.5 border-0 bg-gold/25 text-[10px] text-gold-foreground">Partielle</Badge>;
  return (
    <Badge className="mt-0.5 border-0 bg-destructive/15 text-[10px] text-destructive">Impayée</Badge>
  );
}
