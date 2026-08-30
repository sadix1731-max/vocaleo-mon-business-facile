import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Store, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/states";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Créer ma boutique — VOCALEO" },
      {
        name: "description",
        content: "Trois questions rapides pour configurer votre boutique sur VOCALEO.",
      },
      { property: "og:title", content: "Créer ma boutique — VOCALEO" },
      { property: "og:description", content: "Configurez votre boutique en moins d'une minute." },
    ],
  }),
  component: Onboarding,
});

const ACTIVITIES = ["Prêt-à-porter", "Alimentation", "Cosmétiques", "Électronique", "Services", "Autre"];

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [activity, setActivity] = useState("Prêt-à-porter");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) return <Spinner label="Préparation de votre espace…" />;

  const createOrg = async () => {
    if (!name.trim()) {
      toast.error("Donnez un nom à votre boutique");
      setStep(0);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        business_type: activity,
        city: city.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        onboarding_completed: true,
      })
      .select()
      .single();

    if (error || !data) {
      setBusy(false);
      toast.error("Création impossible", { description: error?.message });
      return;
    }

    await supabase.from("organization_members").insert({
      organization_id: data.id,
      user_id: user.id,
      role: "owner",
    });
    await supabase.from("profiles").upsert({ id: user.id });
    await supabase.from("notifications").insert({
      organization_id: data.id,
      notif_type: "info",
      title: `Bienvenue, ${name.trim()} !`,
      body: "Ajoutez vos premiers produits puis enregistrez votre première vente.",
      action_path: "/produits",
    });

    setBusy(false);
    toast.success("Votre boutique est prête !");
    navigate({ to: "/tableau-de-bord" });
  };

  const useDemo = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("seed_demo_organization");
    setBusy(false);
    if (error) {
      toast.error("Démo indisponible", { description: error.message });
      return;
    }
    toast.success("Boutique de démonstration Moussa Fashion installée");
    navigate({ to: "/tableau-de-bord" });
  };

  const steps = [
    {
      title: "Comment s'appelle votre boutique ?",
      body: (
        <div className="space-y-2">
          <Label htmlFor="org-name">Nom de la boutique</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Moussa Fashion"
            className="h-12 rounded-2xl"
          />
        </div>
      ),
    },
    {
      title: "Que vendez-vous ?",
      body: (
        <div className="grid grid-cols-2 gap-2.5">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setActivity(a)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                activity === a
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Où êtes-vous, et comment vous joindre ?",
      body: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Dakar"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa">Numéro WhatsApp (facultatif)</Label>
            <Input
              id="wa"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+221 77 123 45 67"
              className="h-12 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground">
              Servira bientôt à envoyer les reçus à vos clients.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step]!;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-hero-gradient px-5 pb-14 pt-10 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <Store className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">VOCALEO</span>
        </div>
        <h1 className="mt-7 text-2xl font-bold">Créons votre boutique</h1>
        <p className="mt-2 text-sm text-primary-foreground/80">Trois questions, moins d'une minute.</p>
      </div>

      <div className="mx-auto -mt-8 w-full max-w-md px-5 pb-12">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`}
              />
            ))}
          </div>

          <h2 className="mt-6 font-display text-lg font-semibold">{current.title}</h2>
          <div className="mt-5">{current.body}</div>

          <div className="mt-7 flex gap-3">
            {step > 0 ? (
              <Button variant="outline" className="h-12 flex-1 rounded-2xl" onClick={() => setStep(step - 1)}>
                Retour
              </Button>
            ) : null}
            {step < steps.length - 1 ? (
              <Button
                className="h-12 flex-1 rounded-2xl"
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !name.trim()}
              >
                Continuer
              </Button>
            ) : (
              <Button
                className="h-12 flex-1 rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90"
                onClick={createOrg}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    <Check className="h-4 w-4" aria-hidden /> Terminer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-dashed border-border bg-card p-5 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-gold" aria-hidden />
          <p className="mt-2 text-sm font-medium">Vous voulez d'abord essayer ?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chargez la boutique de démonstration « Moussa Fashion » avec produits, clients et ventes.
          </p>
          <Button variant="outline" className="mt-4 h-11 w-full rounded-2xl" onClick={useDemo} disabled={busy}>
            Essayer avec les données démo
          </Button>
        </div>
      </div>
    </div>
  );
}
