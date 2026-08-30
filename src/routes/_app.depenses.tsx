import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/components/org-context";
import { fetchExpenses } from "@/lib/api";
import { EXPENSE_CATEGORIES, expenseLabel, fcfa, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/states";

export const Route = createFileRoute("/_app/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — VOCALEO" },
      { name: "description", content: "Notez vos dépenses pour connaître votre vrai bénéfice." },
      { property: "og:title", content: "Dépenses — VOCALEO" },
      { property: "og:description", content: "Loyer, transport, stock : tout est pris en compte." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("approvisionnement");

  const expensesQuery = useQuery({ queryKey: ["expenses", org.id], queryFn: () => fetchExpenses(org.id) });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        organization_id: org.id,
        label: label.trim(),
        amount: Number(amount) || 0,
        category,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Dépense enregistrée");
      setOpen(false);
      setLabel("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["expenses", org.id] });
    },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  const expenses = expensesQuery.data ?? [];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthTotal = expenses
    .filter((e) => new Date(e.spent_at).getTime() >= monthStart)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        subtitle="Tout ce qui sort de la caisse."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl">
                <Plus className="h-4 w-4" aria-hidden /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Nouvelle dépense</DialogTitle>
                <DialogDescription>Deux informations suffisent.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!label.trim() || !amount) return toast.error("Indiquez un libellé et un montant");
                  mutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="e-label">C'était pour quoi ?</Label>
                  <Input
                    id="e-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Transport marché"
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-amount">Montant (FCFA)</Label>
                  <Input
                    id="e-amount"
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={mutation.isPending} className="h-12 w-full rounded-2xl">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Enregistrer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-lift">
        <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Dépenses de ce mois</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{fcfa(monthTotal)}</p>
      </div>

      {expensesQuery.isError ? (
        <ErrorState onRetry={() => expensesQuery.refetch()} />
      ) : expensesQuery.isLoading ? (
        <LoadingList />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="Aucune dépense notée"
          description="Notez vos dépenses pour savoir combien vous gagnez vraiment."
          action={
            <Button className="h-11 rounded-2xl" onClick={() => setOpen(true)}>
              Ajouter une dépense
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{e.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {expenseLabel(e.category)} · {shortDate(e.spent_at)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-destructive">−{fcfa(e.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
