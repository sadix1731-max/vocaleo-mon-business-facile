import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users, Loader2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/components/org-context";
import { fetchCustomers, fetchSales } from "@/lib/api";
import { fcfa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/states";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({
    meta: [
      { title: "Clients — VOCALEO" },
      { name: "description", content: "Votre carnet de clients, leurs achats et ce qu'ils vous doivent." },
      { property: "og:title", content: "Clients — VOCALEO" },
      { property: "og:description", content: "Gardez le contact avec vos meilleurs clients." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const customersQuery = useQuery({ queryKey: ["customers", org.id], queryFn: () => fetchCustomers(org.id) });
  const salesQuery = useQuery({ queryKey: ["sales", org.id], queryFn: () => fetchSales(org.id) });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert({
        organization_id: org.id,
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: phone.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Client ajouté");
      setOpen(false);
      setName("");
      setPhone("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["customers", org.id] });
    },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  const statsFor = (customerId: string) => {
    const sales = (salesQuery.data ?? []).filter((s) => s.customer_id === customerId);
    const total = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const due = sales.reduce((sum, s) => sum + (Number(s.total_amount) - Number(s.amount_paid)), 0);
    return { count: sales.length, total, due };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Vos clients et ce qu'ils vous doivent."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl">
                <Plus className="h-4 w-4" aria-hidden /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Nouveau client</DialogTitle>
                <DialogDescription>Le nom suffit, le reste est facultatif.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return toast.error("Le nom est obligatoire");
                  mutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Nom du client</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">Téléphone / WhatsApp</Label>
                  <Input
                    id="c-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-notes">Note</Label>
                  <Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-12 rounded-2xl" />
                </div>
                <Button type="submit" disabled={mutation.isPending} className="h-12 w-full rounded-2xl">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Enregistrer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {customersQuery.isError ? (
        <ErrorState onRetry={() => customersQuery.refetch()} />
      ) : customersQuery.isLoading ? (
        <LoadingList />
      ) : (customersQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Aucun client enregistré"
          description="Ajoutez vos clients réguliers pour suivre leurs achats et leurs dettes."
          action={
            <Button className="h-11 rounded-2xl" onClick={() => setOpen(true)}>
              Ajouter un client
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {(customersQuery.data ?? []).map((c) => {
            const stats = statsFor(c.id);
            return (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    {c.phone ? (
                      <>
                        <Phone className="h-3 w-3 shrink-0" aria-hidden /> {c.phone}
                      </>
                    ) : (
                      "Pas de numéro"
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{fcfa(stats.total)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {stats.due > 0 ? `Doit ${fcfa(stats.due)}` : `${stats.count} achat(s)`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
