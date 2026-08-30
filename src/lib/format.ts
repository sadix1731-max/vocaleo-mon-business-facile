const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Formate un montant en FCFA, la devise unique de l'application. */
export function fcfa(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0 FCFA";
  return `${numberFormatter.format(Math.round(value))} FCFA`;
}

export function shortFcfa(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1000)} k`;
  return numberFormatter.format(value);
}

export function num(value: number | string | null | undefined): string {
  return numberFormatter.format(Number(value ?? 0));
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const dateLongFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export function shortDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function longDate(value: string | Date): string {
  return dateLongFormatter.format(new Date(value));
}

export function timeOf(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

export function monthLabel(value: string | Date): string {
  const label = monthFormatter.format(new Date(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "free_money", label: "Free Money" },
  { value: "bank", label: "Virement / Banque" },
  { value: "credit", label: "À crédit" },
] as const;

export function paymentLabel(method: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Autre";
}

export const EXPENSE_CATEGORIES = [
  { value: "approvisionnement", label: "Approvisionnement" },
  { value: "transport", label: "Transport" },
  { value: "loyer", label: "Loyer" },
  { value: "salaire", label: "Salaire" },
  { value: "communication", label: "Téléphone / Internet" },
  { value: "electricite", label: "Électricité / Eau" },
  { value: "autre", label: "Autre" },
] as const;

export function expenseLabel(category: string | null | undefined): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? "Autre";
}
