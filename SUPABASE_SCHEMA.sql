-- ================================================================
--  E-COMMERCE — COMPLETE SUPABASE SCHEMA
--  Copy this entire file and paste into:
--  Supabase Dashboard → SQL Editor → New Query → RUN (F5)
--
--  Order of execution:
--  1. Extensions
--  2. Profiles + trigger
--  3. Categories + seed data
--  4. Products + indexes + trigger + seed data
--  5. Billing Addresses
--  6. Orders + Order Items
--  7. Helper functions (decrement_stock, updated_at)
--  8. Row Level Security
--  9. Views
-- ================================================================


-- ================================================================
--  SECTION 1 — EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram search on products


-- ================================================================
--  SECTION 2 — PROFILES
--  One row per auth user. Auto-created via trigger on signup.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT        NOT NULL UNIQUE,
    full_name   TEXT,
    phone       TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function: fires after a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
--  SECTION 3 — CATEGORIES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL UNIQUE,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    image_url   TEXT,
    parent_id   UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: default categories
INSERT INTO public.categories (name, slug, description) VALUES
    ('Electronics',    'electronics',    'Phones, laptops, gadgets and accessories'),
    ('Clothing',       'clothing',       'Men, women and kids apparel'),
    ('Books',          'books',          'Fiction, non-fiction, education and more'),
    ('Home & Kitchen', 'home-kitchen',   'Appliances, decor and cookware'),
    ('Sports',         'sports',         'Equipment, clothing and nutrition'),
    ('Beauty',         'beauty',         'Skincare, makeup and personal care'),
    ('Toys',           'toys',           'Games and toys for all ages'),
    ('Grocery',        'grocery',        'Daily essentials and packaged foods')
ON CONFLICT (slug) DO NOTHING;


-- ================================================================
--  SECTION 4 — PRODUCTS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT          NOT NULL,
    slug            TEXT          UNIQUE,
    description     TEXT,
    price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    compare_price   NUMERIC(12,2),                      -- crossed-out / MRP
    cost_price      NUMERIC(12,2),                      -- for internal margin calc
    sku             TEXT          UNIQUE,
    stock_quantity  INTEGER       NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_alert INTEGER       NOT NULL DEFAULT 5,   -- alert threshold
    weight_grams    INTEGER,
    category_id     UUID          REFERENCES public.categories(id) ON DELETE SET NULL,
    images          TEXT[],                             -- array of image URLs
    tags            TEXT[],                             -- searchable tags
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN       NOT NULL DEFAULT FALSE,
    metadata        JSONB         NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS products_category_idx
    ON public.products (category_id);

CREATE INDEX IF NOT EXISTS products_active_idx
    ON public.products (is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS products_featured_idx
    ON public.products (is_featured)
    WHERE is_featured = TRUE;

-- Full-text search index (English stemming)
CREATE INDEX IF NOT EXISTS products_fts_idx
    ON public.products
    USING GIN (
        to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
    );

-- Trigram index for fast ILIKE / partial matching
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
    ON public.products
    USING GIN (name gin_trgm_ops);

-- Auto-slug helper
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(TRIM(value), '[^a-zA-Z0-9\s\-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$;

-- Auto-generate slug on INSERT if not provided
CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.slugify(NEW.name) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_product_slug();

-- Seed: sample products
INSERT INTO public.products
    (name, description, price, compare_price, stock_quantity, low_stock_alert, category_id, images, tags, sku, is_featured)
VALUES
    (
        'Wireless Bluetooth Headphones',
        'Premium noise-cancelling headphones with 30-hour battery life and foldable design. Compatible with all Bluetooth 5.0 devices.',
        2999.00, 4999.00, 50, 10,
        (SELECT id FROM public.categories WHERE slug = 'electronics'),
        ARRAY['https://placehold.co/600x400/1e293b/ffffff?text=Headphones'],
        ARRAY['wireless', 'bluetooth', 'audio', 'noise-cancelling'],
        'ELEC-001', TRUE
    ),
    (
        'USB-C Fast Charger 65W',
        'GaN technology fast charger. Charges laptop, phone and tablet simultaneously.',
        1299.00, 1999.00, 120, 20,
        (SELECT id FROM public.categories WHERE slug = 'electronics'),
        ARRAY['https://placehold.co/600x400/1e293b/ffffff?text=Charger'],
        ARRAY['charger', 'usb-c', 'fast-charging', 'gan'],
        'ELEC-002', FALSE
    ),
    (
        'Men''s Classic Cotton T-Shirt',
        'Soft, breathable 100% organic cotton t-shirt. Pre-shrunk fabric. Available in S, M, L, XL, XXL.',
        499.00, 799.00, 300, 30,
        (SELECT id FROM public.categories WHERE slug = 'clothing'),
        ARRAY['https://placehold.co/600x400/334155/ffffff?text=T-Shirt'],
        ARRAY['mens', 'cotton', 'casual', 'tshirt'],
        'CLO-001', FALSE
    ),
    (
        'The Pragmatic Programmer — 20th Anniversary Edition',
        'The classic book on software craftsmanship, updated for modern development practices.',
        799.00, NULL, 40, 5,
        (SELECT id FROM public.categories WHERE slug = 'books'),
        ARRAY['https://placehold.co/600x400/0f172a/ffffff?text=Book'],
        ARRAY['programming', 'software-engineering', 'education', 'bestseller'],
        'BOOK-001', TRUE
    ),
    (
        'Yoga Mat — Non-Slip 6mm',
        'Eco-friendly TPE yoga mat. Dual-layer for extra grip. Includes carry strap. 183cm x 61cm.',
        899.00, 1200.00, 75, 10,
        (SELECT id FROM public.categories WHERE slug = 'sports'),
        ARRAY['https://placehold.co/600x400/0f4c75/ffffff?text=Yoga+Mat'],
        ARRAY['yoga', 'fitness', 'exercise', 'mat'],
        'SPORT-001', FALSE
    )
ON CONFLICT (sku) DO NOTHING;


-- ================================================================
--  SECTION 5 — BILLING ADDRESSES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.billing_addresses (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT        NOT NULL,
    phone           TEXT,
    address_line1   TEXT        NOT NULL,
    address_line2   TEXT,
    city            TEXT        NOT NULL,
    state           TEXT,
    postal_code     TEXT        NOT NULL,
    country         TEXT        NOT NULL DEFAULT 'IN',
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_addresses_user_idx
    ON public.billing_addresses (user_id);

-- Only one default address per user
CREATE UNIQUE INDEX IF NOT EXISTS billing_addresses_one_default_idx
    ON public.billing_addresses (user_id)
    WHERE is_default = TRUE;


-- ================================================================
--  SECTION 6 — ORDERS & ORDER ITEMS
-- ================================================================

-- Order status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM (
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'refunded'
        );
    END IF;
END;
$$;

-- Payment method enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM (
            'cod',
            'upi',
            'card',
            'netbanking',
            'wallet'
        );
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID                 NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status              public.order_status  NOT NULL DEFAULT 'pending',
    subtotal            NUMERIC(12,2)        NOT NULL CHECK (subtotal >= 0),
    tax_amount          NUMERIC(12,2)        NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_amount     NUMERIC(12,2)        NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
    discount_amount     NUMERIC(12,2)        NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount        NUMERIC(12,2)        NOT NULL CHECK (total_amount >= 0),
    billing_address_id  UUID                 REFERENCES public.billing_addresses(id) ON DELETE SET NULL,
    shipping_address_id UUID                 REFERENCES public.billing_addresses(id) ON DELETE SET NULL,
    payment_method      public.payment_method NOT NULL DEFAULT 'cod',
    payment_status      TEXT                 NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
    payment_reference   TEXT,                                             -- Razorpay / Stripe txn ID
    tracking_number     TEXT,
    notes               TEXT,
    metadata            JSONB                NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_idx    ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders (created_at DESC);

-- Order items (line items; snapshot product details at purchase time)
CREATE TABLE IF NOT EXISTS public.order_items (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id       UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id     UUID          REFERENCES public.products(id) ON DELETE SET NULL,
    product_name   TEXT          NOT NULL,       -- snapshot: name at time of order
    product_image  TEXT,                         -- snapshot: first image URL
    quantity       INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price     NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price    NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON public.order_items (product_id);


-- ================================================================
--  SECTION 7 — HELPER FUNCTIONS
-- ================================================================

-- Atomic stock decrement — prevents overselling
-- Called by the backend via supabase.rpc('decrement_stock', {...})
CREATE OR REPLACE FUNCTION public.decrement_stock(
    p_product_id UUID,
    p_quantity   INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET
        stock_quantity = stock_quantity - p_quantity,
        updated_at     = NOW()
    WHERE
        id             = p_product_id
        AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Insufficient stock for product %. Requested: %, Available: check stock_quantity.',
            p_product_id, p_quantity;
    END IF;
END;
$$;

-- Atomic stock increment — used for cancellations / refunds
CREATE OR REPLACE FUNCTION public.increment_stock(
    p_product_id UUID,
    p_quantity   INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET
        stock_quantity = stock_quantity + p_quantity,
        updated_at     = NOW()
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found.', p_product_id;
    END IF;
END;
$$;

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply set_updated_at to all relevant tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles',
        'products',
        'billing_addresses',
        'orders'
    ]
    LOOP
        EXECUTE FORMAT('
            DROP TRIGGER IF EXISTS trg_set_updated_at_%1$s ON public.%1$s;
            CREATE TRIGGER trg_set_updated_at_%1$s
                BEFORE UPDATE ON public.%1$s
                FOR EACH ROW
                EXECUTE FUNCTION public.set_updated_at();
        ', tbl);
    END LOOP;
END;
$$;


-- ================================================================
--  SECTION 8 — ROW LEVEL SECURITY (RLS)
--
--  NOTE: The backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses
--  all RLS policies. These policies protect direct client-side
--  Supabase SDK calls (e.g. from a React app using the anon key).
-- ================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items       ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies before recreating (idempotent)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END;
$$;

-- PROFILES: users can read and update their own profile only
CREATE POLICY "profiles: select own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles: update own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- CATEGORIES: public read-only
CREATE POLICY "categories: public read"
    ON public.categories FOR SELECT
    USING (TRUE);

-- PRODUCTS: public read active products; no direct writes
CREATE POLICY "products: public read active"
    ON public.products FOR SELECT
    USING (is_active = TRUE);

-- BILLING ADDRESSES: users manage their own addresses
CREATE POLICY "billing: select own"
    ON public.billing_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "billing: insert own"
    ON public.billing_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "billing: update own"
    ON public.billing_addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "billing: delete own"
    ON public.billing_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- ORDERS: users manage their own orders
CREATE POLICY "orders: select own"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "orders: insert own"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders: update own"
    ON public.orders FOR UPDATE
    USING (auth.uid() = user_id);

-- ORDER ITEMS: accessible only if user owns the parent order
CREATE POLICY "order_items: select via own order"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = order_id
              AND o.user_id = auth.uid()
        )
    );


-- ================================================================
--  SECTION 9 — USEFUL VIEWS
-- ================================================================

-- Order summary for admin dashboard
CREATE OR REPLACE VIEW public.v_order_summary AS
SELECT
    o.id                                        AS order_id,
    o.user_id,
    p.full_name                                 AS customer_name,
    p.email                                     AS customer_email,
    o.status,
    o.payment_method,
    o.payment_status,
    o.subtotal,
    o.tax_amount,
    o.shipping_amount,
    o.discount_amount,
    o.total_amount,
    COUNT(oi.id)                                AS item_count,
    SUM(oi.quantity)                            AS total_units,
    o.created_at,
    o.updated_at
FROM public.orders o
JOIN public.profiles    p  ON p.id       = o.user_id
JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, p.full_name, p.email;

-- Low stock alert view — products at or below their alert threshold
CREATE OR REPLACE VIEW public.v_low_stock AS
SELECT
    id,
    name,
    sku,
    stock_quantity,
    low_stock_alert,
    (stock_quantity = 0) AS is_out_of_stock
FROM public.products
WHERE is_active = TRUE
  AND stock_quantity <= low_stock_alert
ORDER BY stock_quantity ASC;

-- Product catalogue with category name
CREATE OR REPLACE VIEW public.v_products AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.price,
    p.compare_price,
    p.sku,
    p.stock_quantity,
    p.is_active,
    p.is_featured,
    p.images,
    p.tags,
    c.name  AS category_name,
    c.slug  AS category_slug,
    p.created_at,
    p.updated_at
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id;


-- ================================================================
--  SECTION 10 — MAKE A USER AN ADMIN
--
--  Run this separately after creating the user:
--
--  UPDATE auth.users
--  SET app_metadata = app_metadata || '{"role": "admin"}'::jsonb
--  WHERE email = 'admin@yourdomain.com';
--
-- ================================================================


-- ================================================================
--  ALL DONE ✅
--  Your Supabase schema is ready.
--
--  Tables created:
--    public.profiles
--    public.categories     (with 8 seed categories)
--    public.products       (with 5 sample products)
--    public.billing_addresses
--    public.orders
--    public.order_items
--
--  Functions created:
--    public.handle_new_user()    — auto-create profile on signup
--    public.slugify()            — generate URL slug
--    public.set_product_slug()   — auto-slug products
--    public.decrement_stock()    — atomic stock reduction
--    public.increment_stock()    — atomic stock addition
--    public.set_updated_at()     — auto-timestamp on update
--
--  Views created:
--    public.v_order_summary
--    public.v_low_stock
--    public.v_products
--
--  RLS enabled on all tables with appropriate policies.
-- ================================================================
