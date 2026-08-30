import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Organization = Tables<"organizations">;
export type Product = Tables<"products">;
export type Inventory = Tables<"inventory">;
export type Customer = Tables<"customers">;
export type Sale = Tables<"sales">;
export type SaleItem = Tables<"sale_items">;
export type Expense = Tables<"expenses">;
export type NotificationRow = Tables<"notifications">;
export type MonthlyReport = Tables<"monthly_reports">;

export type ProductWithStock = Product & { inventory: Inventory[] | null };
export type SaleWithRelations = Sale & {
  customers: Pick<Customer, "id" | "name" | "phone" | "whatsapp"> | null;
  sale_items: SaleItem[];
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function fetchMyOrganizations(): Promise<Organization[]> {
  return unwrap(
    await supabase.from("organizations").select("*").order("created_at", { ascending: true }),
  );
}

export async function fetchProducts(orgId: string): Promise<ProductWithStock[]> {
  return unwrap(
    await supabase
      .from("products")
      .select("*, inventory(*)")
      .eq("organization_id", orgId)
      .order("name"),
  ) as ProductWithStock[];
}

export async function fetchCustomers(orgId: string): Promise<Customer[]> {
  return unwrap(
    await supabase.from("customers").select("*").eq("organization_id", orgId).order("name"),
  );
}

export async function fetchSales(orgId: string, limit = 100): Promise<SaleWithRelations[]> {
  return unwrap(
    await supabase
      .from("sales")
      .select("*, customers(id,name,phone,whatsapp), sale_items(*)")
      .eq("organization_id", orgId)
      .order("sold_at", { ascending: false })
      .limit(limit),
  ) as SaleWithRelations[];
}

export async function fetchSale(saleId: string): Promise<SaleWithRelations> {
  return unwrap(
    await supabase
      .from("sales")
      .select("*, customers(id,name,phone,whatsapp), sale_items(*)")
      .eq("id", saleId)
      .single(),
  ) as SaleWithRelations;
}

export async function fetchExpenses(orgId: string): Promise<Expense[]> {
  return unwrap(
    await supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", orgId)
      .order("spent_at", { ascending: false }),
  );
}

export async function fetchNotifications(orgId: string): Promise<NotificationRow[]> {
  return unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
  );
}

export type NewSaleInput = {
  organizationId: string;
  customerId: string | null;
  paymentMethod: string;
  amountPaid: number;
  note: string;
  soldAt: string;
  lines: { productId: string | null; name: string; quantity: number; unitPrice: number }[];
};

export async function createSale(input: NewSaleInput): Promise<Sale> {
  const total = input.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const paid = Math.min(input.amountPaid, total);
  const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
  const reference = `V-${Date.now().toString().slice(-6)}`;

  const sale = unwrap(
    await supabase
      .from("sales")
      .insert({
        organization_id: input.organizationId,
        customer_id: input.customerId,
        reference,
        total_amount: total,
        amount_paid: paid,
        payment_method: input.paymentMethod,
        status,
        note: input.note || null,
        sold_at: input.soldAt,
      })
      .select()
      .single(),
  );

  const items = input.lines.map((l) => ({
    organization_id: input.organizationId,
    sale_id: sale.id,
    product_id: l.productId,
    product_name: l.name,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    line_total: l.quantity * l.unitPrice,
  }));
  const itemsRes = await supabase.from("sale_items").insert(items);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  if (paid > 0) {
    await supabase.from("payments").insert({
      organization_id: input.organizationId,
      sale_id: sale.id,
      customer_id: input.customerId,
      amount: paid,
      method: input.paymentMethod,
    });
  }

  await supabase.from("documents").insert({
    organization_id: input.organizationId,
    sale_id: sale.id,
    doc_type: "receipt",
    number: `RECU-${reference.replace("V-", "")}`,
  });

  // Décrémente le stock et trace les mouvements
  for (const line of input.lines) {
    if (!line.productId) continue;
    const current = await supabase
      .from("inventory")
      .select("id,quantity,low_stock_threshold")
      .eq("product_id", line.productId)
      .maybeSingle();
    if (current.data) {
      const nextQty = Number(current.data.quantity) - line.quantity;
      await supabase
        .from("inventory")
        .update({ quantity: nextQty, updated_at: new Date().toISOString() })
        .eq("id", current.data.id);
      if (nextQty <= Number(current.data.low_stock_threshold)) {
        await supabase.from("notifications").insert({
          organization_id: input.organizationId,
          notif_type: "stock",
          title: `Stock bas : ${line.name}`,
          body: `Il reste ${Math.max(nextQty, 0)} unité(s). Pensez à réapprovisionner.`,
          action_path: "/produits",
        });
      }
    }
    await supabase.from("inventory_movements").insert({
      organization_id: input.organizationId,
      product_id: line.productId,
      movement_type: "out",
      quantity: line.quantity,
      reason: `Vente ${reference}`,
      reference_id: sale.id,
    });
  }

  if (status !== "paid") {
    await supabase.from("notifications").insert({
      organization_id: input.organizationId,
      notif_type: "payment",
      title: "Paiement incomplet",
      body: `Il reste ${Math.round(total - paid)} FCFA à encaisser sur la vente ${reference}.`,
      action_path: "/historique",
    });
  }

  return sale;
}
