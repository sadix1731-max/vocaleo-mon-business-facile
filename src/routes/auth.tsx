import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — VOCALEO" },
      {
        name: "description",
        content: "Connectez-vous à VOCALEO pour suivre vos ventes, votre stock et votre bénéfice.",
      },
      { property: "og:title", content: "Connexion — VOCALEO" },
      { property: "og:description", content: "Accédez à votre espace commerçant VOCALEO." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/tableau-de-bord" });
  }, [loading, user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Connexion impossible", { description: "Vérifiez votre e-mail et mot de passe." });
      return;
    }
    toast.success("Bon retour !");
    navigate({ to: "/tableau-de-bord" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/tableau-de-bord`,
        data: { full_name: fullName },
      },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName });
    }
    setBusy(false);
    if (error) {
      toast.error("Inscription impossible", { description: error.message });
      return;
    }
    if (data.session) {
      toast.success("Compte créé", { description: "Bienvenue sur VOCALEO." });
      navigate({ to: "/onboarding" });
    } else {
      toast.success("Vérifiez votre boîte mail", {
        description: "Un lien de confirmation vous a été envoyé.",
      });
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Connexion Google impossible");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/tableau-de-bord" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-hero-gradient px-5 pb-16 pt-10 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 font-display text-sm font-bold">
            V
          </span>
          <span className="font-display text-lg font-bold tracking-tight">VOCALEO</span>
        </Link>
        <h1 className="mt-8 text-2xl font-bold">Votre commerce, bien géré.</h1>
        <p className="mt-2 max-w-sm text-sm text-primary-foreground/80">
          Connectez-vous pour retrouver vos ventes, votre stock et votre bénéfice du mois.
        </p>
      </div>

      <div className="mx-auto -mt-10 w-full max-w-md px-5 pb-12">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              <TabsTrigger value="signin" className="rounded-xl">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl">
                Créer un compte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-5 space-y-4">
                <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} />
                <Field
                  id="password"
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-5 space-y-4">
                <Field
                  id="name"
                  label="Votre nom"
                  type="text"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Moussa Diallo"
                />
                <Field id="email2" label="E-mail" type="email" value={email} onChange={setEmail} />
                <Field
                  id="password2"
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  hint="Au moins 6 caractères"
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-12 w-full rounded-2xl bg-accent-gradient text-accent-foreground hover:opacity-90"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={signInWithGoogle}
            className="h-12 w-full rounded-2xl"
          >
            Continuer avec Google
          </Button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez que VOCALEO conserve vos données de commerce de façon
            privée et sécurisée.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
