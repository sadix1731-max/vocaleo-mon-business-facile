import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Package,
  Receipt,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOCALEO — Gérez votre commerce depuis votre téléphone" },
      {
        name: "description",
        content:
          "Suivez vos ventes, votre stock, vos clients et votre bénéfice en FCFA. Simple, en français, pensé pour les commerçants du Sénégal.",
      },
      { property: "og:title", content: "VOCALEO — Gérez votre commerce depuis votre téléphone" },
      {
        property: "og:description",
        content:
          "Ventes, stock, clients, dépenses et bilan mensuel en FCFA. Sans jargon comptable.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Receipt,
    title: "Enregistrer une vente en 15 secondes",
    text: "Choisissez le produit, le montant, le mode de paiement. Le reçu est prêt.",
  },
  {
    icon: Package,
    title: "Stock toujours à jour",
    text: "Le stock baisse tout seul à chaque vente et vous alerte avant la rupture.",
  },
  {
    icon: TrendingUp,
    title: "Savoir si vous gagnez",
    text: "Ventes moins dépenses : votre bénéfice du mois, en une seule phrase claire.",
  },
  {
    icon: MessageCircle,
    title: "Prêt pour WhatsApp",
    text: "Envoyez reçus et rappels de paiement à vos clients (bientôt disponible).",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-hero-gradient font-display text-sm font-bold text-primary-foreground">
            V
          </span>
          <span className="font-display text-lg font-bold tracking-tight">VOCALEO</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              Assistant de gestion pour commerçants
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Votre commerce, clair comme le jour.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
              VOCALEO note vos ventes, suit votre stock, vos clients et vos dépenses — et vous dit
              chaque mois combien vous avez réellement gagné. En français, en FCFA, sans jargon.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90"
              >
                <Link to="/auth">Commencer gratuitement</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl">
                <Link to="/auth">Voir la démo Moussa Fashion</Link>
              </Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-accent" aria-hidden /> Pensé mobile d'abord
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden /> Vos données restent
                privées
              </li>
            </ul>
          </div>

          <div className="mt-12 lg:mt-0">
            <div className="mx-auto max-w-sm rounded-[2rem] bg-hero-gradient p-6 shadow-lift">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                Bénéfice du mois
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold text-primary-foreground">
                +182 000 <span className="text-xl">FCFA</span>
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Ventes du jour", value: "43 000 FCFA" },
                  { label: "Dépenses du mois", value: "174 000 FCFA" },
                  { label: "Clients fidèles", value: "12" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm text-primary-foreground"
                  >
                    <span className="text-primary-foreground/80">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Tout ce qu'il faut, rien de compliqué
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-border bg-background p-6 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-accent">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg" className="h-12 rounded-2xl">
              <Link to="/auth">Créer mon compte</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-sm text-muted-foreground">
        VOCALEO · Dakar, Sénégal · Devise FCFA
      </footer>
    </div>
  );
}
