import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Plus, Search, Loader2, Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/components/org-context";
import { fetchProducts, type ProductWithStock } from "@/lib/api";
import { fcfa, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/states";

export const Route = createFileRoute("/_app/produits")({
  head: () => ({
    meta: [
      { title: "Produits et stock — VOCALEO" },
      {
        name: "description",
        content: "Gérez vos produits, leurs prix et vos quantités en stock, avec alerte de rupture.",
      },
      { property: "og:title", content: "Produits et stock — VOCALEO" },
      { property: "og:description", content: "Vos articles, prix et stock toujours à jour." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["products", org.id],
    queryFn: () => fetchProducts(org.id),
  });

  const products = (productsQuery.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        subtitle="Vos articles, leurs prix et le stock disponible."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl">
                <Plus className="h-4 w-4" aria-hidden /> Ajouter
              </Button>
            </DialogTrigger>
            <ProductDialog
              orgId={org.id}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["products", org.id] });
              }}
            />
          </Dialog>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit"
          className="h-12 rounded-2xl pl-11"
          aria-label="Rechercher un produit"
        />
      </div>

      {productsQuery.isError ? (
        <ErrorState onRetry={() => productsQuery.refetch()} />
      ) : productsQuery.isLoading ? (
        <LoadingList />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title={search ? "Aucun produit trouvé" : "Aucun produit pour l'instant"}
          description={
            search
              ? "Essayez un autre mot."
              : "Ajoutez vos articles une fois : ensuite, vendre prend quelques secondes."
          }
          action={
            search ? undefined : (
              <Button className="h-11 rounded-2xl" onClick={() => setOpen(true)}>
                Ajouter mon premier produit
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithStock }) {
  const inv = product.inventory?.[0];
  const qty = Number(inv?.quantity ?? 0);
  const low = inv ? qty <= Number(inv.low_stock_threshold) : false;
  const margin = Number(product.sale_price) - Number(product.cost_price);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {product.category ?? "Sans catégorie"} · marge {fcfa(margin)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{fcfa(product.sale_price)}</p>
        <Badge
          className={`mt-0.5 border-0 text-[10px] ${
            low ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent-foreground"
          }`}
        >
          {num(qty)} en stock
        </Badge>
      </div>
    </li>
  );
}

function ProductDialog({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [threshold, setThreshold] = useState("5");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .insert({
          organization_id: orgId,
          name: name.trim(),
          category: category.trim() || null,
          cost_price: Number(cost) || 0,
          sale_price: Number(price) || 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const quantity = Number(qty) || 0;
      const inv = await supabase.from("inventory").insert({
        organization_id: orgId,
        product_id: data.id,
        quantity,
        low_stock_threshold: Number(threshold) || 0,
      });
      if (inv.error) throw new Error(inv.error.message);

      if (quantity > 0) {
        await supabase.from("inventory_movements").insert({
          organization_id: orgId,
          product_id: data.id,
          movement_type: "in",
          quantity,
          reason: "Stock initial",
        });
      }
    },
    onSuccess: () => {
      toast.success("Produit ajouté");
      onDone();
    },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  return (
    <DialogContent className="rounded-3xl sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">Nouveau produit</DialogTitle>
        <DialogDescription>Renseignez le minimum : nom, prix de vente et stock.</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast.error("Le nom du produit est obligatoire");
          mutation.mutate();
        }}
      >
        <Row id="p-name" label="Nom du produit" value={name} onChange={setName} placeholder="Robe wax femme" />
        <Row id="p-cat" label="Catégorie (facultatif)" value={category} onChange={setCategory} />
        <div className="grid grid-cols-2 gap-3">
          <Row id="p-cost" label="Prix d'achat (FCFA)" value={cost} onChange={setCost} type="number" />
          <Row id="p-price" label="Prix de vente (FCFA)" value={price} onChange={setPrice} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row id="p-qty" label="Quantité en stock" value={qty} onChange={setQty} type="number" />
          <Row id="p-thr" label="Alerte en dessous de" value={threshold} onChange={setThreshold} type="number" />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-12 w-full rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <Package className="h-4 w-4" aria-hidden /> Enregistrer le produit
            </>
          )}
        </Button>
      </form>
    </DialogContent>
  );
}

function Row({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl"
      />
    </div>
  );
}
