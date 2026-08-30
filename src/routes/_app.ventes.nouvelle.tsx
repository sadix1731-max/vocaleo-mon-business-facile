import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useOrg } from "@/components/org-context";
import { createSale, fetchCustomers, fetchProducts } from "@/lib/api";
import { fcfa, PAYMENT_METHODS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Spinner } from "@/components/states";

export const Route = createFileRoute("/_app/ventes/nouvelle")({
  head: () => ({
    meta: [
      { title: "Nouvelle vente — VOCALEO" },
      { name: "description", content: "Enregistrez une vente en quelques secondes et générez le reçu." },
      { property: "og:title", content: "Nouvelle vente — VOCALEO" },
      { property: "og:description", content: "Produit, montant, paiement : la vente est enregistrée." },
    ],
  }),
  component: NewSalePage,
});

type Line = { productId: string | null; name: string; quantity: number; unitPrice: number };

function NewSalePage() {
  const { org } = useOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const productsQuery = useQuery({ queryKey: ["products", org.id], queryFn: () => fetchProducts(org.id) });
  const customersQuery = useQuery({ queryKey: ["customers", org.id], queryFn: () => fetchCustomers(org.id) });

  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState<string>("none");
  const [method, setMethod] = useState<string>("cash");
  const [paidInput, setPaidInput] = useState<string>("");
  const [note, setNote] = useState("");

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const paid = paidInput === "" ? total : Number(paidInput) || 0;

  const addProduct = (productId: string) => {
    const p = productsQuery.data?.find((x) => x.id === productId);
    if (!p) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing)
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitPrice: Number(p.sale_price) }];
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      createSale({
        organizationId: org.id,
        customerId: customerId === "none" ? null : customerId,
        paymentMethod: method,
        amountPaid: paid,
        note,
        soldAt: new Date().toISOString(),
        lines,
      }),
    onSuccess: (sale) => {
      qc.invalidateQueries();
      toast.success("Vente enregistrée !", { description: `${fcfa(total)} · reçu disponible` });
      navigate({ to: "/recu/$saleId", params: { saleId: sale.id } });
    },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  if (productsQuery.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Nouvelle vente" subtitle="Ajoutez les articles vendus, puis encaissez." />

      <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Label>Article vendu</Label>
        <Select onValueChange={addProduct} value="">
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue placeholder="Choisir un produit" />
          </SelectTrigger>
          <SelectContent>
            {(productsQuery.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {fcfa(p.sale_price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-2xl"
          onClick={() =>
            setLines((prev) => [...prev, { productId: null, name: "Article libre", quantity: 1, unitPrice: 0 }])
          }
        >
          <Plus className="h-4 w-4" aria-hidden /> Article hors catalogue
        </Button>

        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun article ajouté pour l'instant.
          </p>
        ) : (
          <ul className="space-y-2.5 pt-1">
            {lines.map((line, i) => (
              <li key={i} className="rounded-2xl bg-secondary/60 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <Input
                    value={line.name}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, j) => (j === i ? { ...l, name: e.target.value } : l)))
                    }
                    className="h-10 rounded-xl border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                    aria-label="Nom de l'article"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Retirer l'article"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quantité</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, j) => (j === i ? { ...l, quantity: Number(e.target.value) || 1 } : l)),
                        )
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Prix unitaire</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={line.unitPrice}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, j) => (j === i ? { ...l, unitPrice: Number(e.target.value) || 0 } : l)),
                        )
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="space-y-1.5">
          <Label>Client (facultatif)</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Client de passage</SelectItem>
              {(customersQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Mode de paiement</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Les paiements mobiles seront encaissés directement depuis VOCALEO prochainement.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paid">Montant reçu (FCFA)</Label>
          <Input
            id="paid"
            type="number"
            inputMode="numeric"
            value={paidInput}
            placeholder={String(total)}
            onChange={(e) => setPaidInput(e.target.value)}
            className="h-12 rounded-2xl"
          />
          {paid < total ? (
            <p className="text-xs text-gold-foreground">
              Reste à payer : <strong>{fcfa(total - paid)}</strong>
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (facultatif)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-2xl"
            rows={2}
          />
        </div>
      </section>

      <div className="sticky bottom-20 z-20 rounded-3xl border border-border bg-card p-4 shadow-lift lg:bottom-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-extrabold">{fcfa(total)}</span>
        </div>
        <Button
          className="mt-3 h-12 w-full rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90"
          disabled={lines.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" aria-hidden /> Enregistrer la vente
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
