import { createContext, useContext, type ReactNode } from "react";
import type { Organization } from "@/lib/api";

type OrgContextValue = { org: Organization; userEmail: string };

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ value, children }: { value: OrgContextValue; children: ReactNode }) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg doit être utilisé dans l'espace connecté");
  return ctx;
}
