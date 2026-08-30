
-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  locale text NOT NULL DEFAULT 'fr',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  business_type text,
  city text,
  country text NOT NULL DEFAULT 'SN',
  currency text NOT NULL DEFAULT 'XOF',
  whatsapp_number text,
  logo_url text,
  is_demo boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = auth.uid()
  );
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR owner_id = auth.uid());
CREATE POLICY "create own org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update org" ON public.organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner delete org" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own membership" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert own membership" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own membership" ON public.organization_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text,
  unit text NOT NULL DEFAULT 'pièce',
  cost_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org products" ON public.products FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- INVENTORY
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(14,2) NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity numeric(14,2) NOT NULL,
  reason text,
  reference_id uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org movements" ON public.inventory_movements FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  whatsapp text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org customers" ON public.customers FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  reference text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'paid',
  note text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org sales" ON public.sales FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org sale items" ON public.sale_items FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  provider text,
  status text NOT NULL DEFAULT 'succeeded',
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org payments" ON public.payments FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  amount numeric(14,2) NOT NULL,
  note text,
  spent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'receipt',
  number text,
  file_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org documents" ON public.documents FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notif_type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  action_path text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- MONTHLY REPORTS
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  expenses_total numeric(14,2) NOT NULL DEFAULT 0,
  profit numeric(14,2) NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  top_product text,
  summary text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reports TO authenticated;
GRANT ALL ON public.monthly_reports TO service_role;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reports" ON public.monthly_reports FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_orgs_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_customers_upd BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- DEMO SEED: Moussa Fashion
CREATE OR REPLACE FUNCTION public.seed_demo_organization()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_s uuid;
  v_month date := date_trunc('month', now())::date;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT o.id INTO v_org FROM public.organizations o
    JOIN public.organization_members m ON m.organization_id = o.id
    WHERE m.user_id = v_user AND o.is_demo LIMIT 1;
  IF v_org IS NOT NULL THEN RETURN v_org; END IF;

  INSERT INTO public.organizations (owner_id, name, business_type, city, whatsapp_number, is_demo, onboarding_completed)
  VALUES (v_user, 'Moussa Fashion', 'Prêt-à-porter', 'Dakar', '+221 77 123 45 67', true, true)
  RETURNING id INTO v_org;

  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (v_org, v_user, 'owner');

  INSERT INTO public.products (organization_id, name, category, unit, cost_price, sale_price) VALUES
    (v_org, 'Bazin riche homme', 'Tissus', 'pièce', 12000, 25000) RETURNING id INTO v_p1;
  INSERT INTO public.products (organization_id, name, category, unit, cost_price, sale_price) VALUES
    (v_org, 'Robe wax femme', 'Prêt-à-porter', 'pièce', 8000, 18000) RETURNING id INTO v_p2;
  INSERT INTO public.products (organization_id, name, category, unit, cost_price, sale_price) VALUES
    (v_org, 'Chemise lin', 'Prêt-à-porter', 'pièce', 6000, 13000) RETURNING id INTO v_p3;
  INSERT INTO public.products (organization_id, name, category, unit, cost_price, sale_price) VALUES
    (v_org, 'Sac en cuir', 'Accessoires', 'pièce', 9000, 20000) RETURNING id INTO v_p4;
  INSERT INTO public.products (organization_id, name, category, unit, cost_price, sale_price) VALUES
    (v_org, 'Foulard soie', 'Accessoires', 'pièce', 2500, 6000) RETURNING id INTO v_p5;

  INSERT INTO public.inventory (organization_id, product_id, quantity, low_stock_threshold) VALUES
    (v_org, v_p1, 14, 5), (v_org, v_p2, 9, 5), (v_org, v_p3, 3, 5), (v_org, v_p4, 6, 3), (v_org, v_p5, 2, 4);

  INSERT INTO public.customers (organization_id, name, phone, whatsapp, notes) VALUES
    (v_org, 'Awa Diop', '+221 77 555 11 22', '+221 77 555 11 22', 'Cliente fidèle') RETURNING id INTO v_c1;
  INSERT INTO public.customers (organization_id, name, phone, whatsapp) VALUES
    (v_org, 'Cheikh Ndiaye', '+221 78 444 33 21', '+221 78 444 33 21') RETURNING id INTO v_c2;
  INSERT INTO public.customers (organization_id, name, phone, whatsapp, notes) VALUES
    (v_org, 'Fatou Sarr', '+221 76 888 90 10', '+221 76 888 90 10', 'Paye souvent en 2 fois') RETURNING id INTO v_c3;

  INSERT INTO public.sales (organization_id, customer_id, reference, total_amount, amount_paid, payment_method, status, sold_at)
  VALUES (v_org, v_c1, 'V-1001', 43000, 43000, 'wave', 'paid', now() - interval '1 day') RETURNING id INTO v_s;
  INSERT INTO public.sale_items (organization_id, sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES
    (v_org, v_s, v_p1, 'Bazin riche homme', 1, 25000, 25000),
    (v_org, v_s, v_p2, 'Robe wax femme', 1, 18000, 18000);
  INSERT INTO public.payments (organization_id, sale_id, customer_id, amount, method) VALUES (v_org, v_s, v_c1, 43000, 'wave');
  INSERT INTO public.documents (organization_id, sale_id, doc_type, number) VALUES (v_org, v_s, 'receipt', 'RECU-1001');

  INSERT INTO public.sales (organization_id, customer_id, reference, total_amount, amount_paid, payment_method, status, sold_at)
  VALUES (v_org, v_c2, 'V-1002', 20000, 10000, 'cash', 'partial', now() - interval '3 days') RETURNING id INTO v_s;
  INSERT INTO public.sale_items (organization_id, sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES
    (v_org, v_s, v_p4, 'Sac en cuir', 1, 20000, 20000);
  INSERT INTO public.payments (organization_id, sale_id, customer_id, amount, method) VALUES (v_org, v_s, v_c2, 10000, 'cash');

  INSERT INTO public.sales (organization_id, customer_id, reference, total_amount, amount_paid, payment_method, status, sold_at)
  VALUES (v_org, v_c3, 'V-1003', 32000, 32000, 'orange_money', 'paid', now() - interval '6 days') RETURNING id INTO v_s;
  INSERT INTO public.sale_items (organization_id, sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES
    (v_org, v_s, v_p3, 'Chemise lin', 2, 13000, 26000),
    (v_org, v_s, v_p5, 'Foulard soie', 1, 6000, 6000);
  INSERT INTO public.payments (organization_id, sale_id, customer_id, amount, method) VALUES (v_org, v_s, v_c3, 32000, 'orange_money');

  INSERT INTO public.inventory_movements (organization_id, product_id, movement_type, quantity, reason) VALUES
    (v_org, v_p1, 'in', 15, 'Approvisionnement'),
    (v_org, v_p1, 'out', 1, 'Vente V-1001'),
    (v_org, v_p3, 'out', 2, 'Vente V-1003');

  INSERT INTO public.expenses (organization_id, label, category, amount, spent_at) VALUES
    (v_org, 'Loyer boutique', 'loyer', 75000, now() - interval '8 days'),
    (v_org, 'Transport marché HLM', 'transport', 6000, now() - interval '4 days'),
    (v_org, 'Achat tissus', 'approvisionnement', 90000, now() - interval '10 days'),
    (v_org, 'Crédit téléphone', 'communication', 3000, now() - interval '2 days');

  INSERT INTO public.notifications (organization_id, notif_type, title, body, action_path) VALUES
    (v_org, 'stock', 'Stock bas : Foulard soie', 'Il ne reste que 2 pièces. Pensez à réapprovisionner.', '/produits'),
    (v_org, 'payment', 'Paiement en attente', 'Cheikh Ndiaye doit encore 10 000 FCFA.', '/historique'),
    (v_org, 'info', 'Bienvenue sur VOCALEO', 'Votre boutique de démonstration est prête.', '/tableau-de-bord');

  INSERT INTO public.monthly_reports (organization_id, period_start, revenue, expenses_total, profit, sales_count, top_product, summary)
  VALUES (v_org, v_month, 95000, 174000, -79000, 3, 'Bazin riche homme', 'Mois de lancement : les achats de stock dépassent encore les ventes.')
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END; $$;

GRANT EXECUTE ON FUNCTION public.seed_demo_organization() TO authenticated;
