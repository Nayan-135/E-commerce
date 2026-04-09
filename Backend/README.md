# 🛍️ E-Commerce Backend

Full-featured REST API built with **Node.js + Express + Supabase** featuring:
- 🔐 Supabase Auth (JWT-based login/register)
- 📦 Product catalog with categories & stock management
- 🛒 Order management with automatic stock decrement
- 💳 Billing address management
- 📧 HTML order confirmation emails (Nodemailer)
- 🤖 AI chatbot powered by Claude (searches real product data)

---

## 📁 Project Structure

```
src/
├── server.js                  # Express app + route mounting
├── config/
│   ├── supabase.js            # Supabase admin + anon clients
│   └── mailer.js              # Nodemailer transporter
├── middleware/
│   ├── auth.middleware.js     # JWT verification via Supabase
│   └── error.middleware.js    # Global error handler + asyncHandler
├── routes/
│   ├── auth.routes.js
│   ├── product.routes.js
│   ├── order.routes.js
│   ├── billing.routes.js
│   └── chatbot.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── product.controller.js
│   ├── order.controller.js
│   ├── billing.controller.js
│   └── chatbot.controller.js
└── services/
    └── email.service.js       # HTML email templates
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in env vars
cp .env.example .env

# 3. Run Supabase SQL (see section below)

# 4. Start dev server
npm run dev
```

---

## 🗄️ Supabase Database Setup

> **Copy the entire SQL block below and paste it into:**
> **Supabase Dashboard → SQL Editor → New Query → Run**

```sql
-- ============================================================
--  E-COMMERCE DATABASE SCHEMA
--  Paste this entire block into Supabase SQL Editor and run.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy product search

-- ── 1. PROFILES ──────────────────────────────────────────────
-- Mirrors auth.users; auto-populated via trigger on signup
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    phone       TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. CATEGORIES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url   TEXT,
    parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sample categories
INSERT INTO public.categories (name, slug, description) VALUES
    ('Electronics',    'electronics',    'Phones, laptops, gadgets and more'),
    ('Clothing',       'clothing',       'Men, women and kids apparel'),
    ('Books',          'books',          'Fiction, non-fiction, education'),
    ('Home & Kitchen', 'home-kitchen',   'Appliances, décor, cookware'),
    ('Sports',         'sports',         'Equipment, clothing, nutrition')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. PRODUCTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE,
    description     TEXT,
    price           NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    compare_price   NUMERIC(12, 2),                          -- original / crossed-out price
    cost_price      NUMERIC(12, 2),                          -- for profit calculation
    sku             TEXT UNIQUE,
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_alert INTEGER NOT NULL DEFAULT 5,
    weight_grams    INTEGER,
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    images          TEXT[],                                  -- array of image URLs
    tags            TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index on products
CREATE INDEX IF NOT EXISTS products_fts_idx ON public.products
    USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- Trigram index for ILIKE search
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_category_idx  ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx    ON public.products (is_active);

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(value), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;

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

DROP TRIGGER IF EXISTS set_product_slug_trigger ON public.products;
CREATE TRIGGER set_product_slug_trigger
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_product_slug();

-- Sample products
INSERT INTO public.products (name, description, price, compare_price, stock_quantity, category_id, images, tags, sku) VALUES
    ('Wireless Bluetooth Headphones',
     'Premium sound quality with active noise cancellation. 30-hour battery life.',
     2999.00, 4999.00, 50,
     (SELECT id FROM public.categories WHERE slug = 'electronics'),
     ARRAY['https://placehold.co/600x400?text=Headphones'],
     ARRAY['wireless', 'bluetooth', 'audio'],
     'ELEC-001'),
    ('Men''s Cotton T-Shirt',
     'Soft, breathable 100% cotton t-shirt. Available in multiple colours.',
     499.00, 799.00, 200,
     (SELECT id FROM public.categories WHERE slug = 'clothing'),
     ARRAY['https://placehold.co/600x400?text=T-Shirt'],
     ARRAY['mens', 'cotton', 'casual'],
     'CLO-001'),
    ('The Pragmatic Programmer',
     'Classic software engineering book. 20th Anniversary Edition.',
     799.00, NULL, 30,
     (SELECT id FROM public.categories WHERE slug = 'books'),
     ARRAY['https://placehold.co/600x400?text=Book'],
     ARRAY['programming', 'software', 'education'],
     'BOOK-001')
ON CONFLICT (sku) DO NOTHING;

-- ── 4. BILLING ADDRESSES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    address_line1   TEXT NOT NULL,
    address_line2   TEXT,
    city            TEXT NOT NULL,
    state           TEXT,
    postal_code     TEXT NOT NULL,
    country         TEXT NOT NULL DEFAULT 'IN',
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_addresses_user_idx ON public.billing_addresses (user_id);

-- Enforce only one default address per user
CREATE UNIQUE INDEX IF NOT EXISTS billing_addresses_one_default_per_user
    ON public.billing_addresses (user_id)
    WHERE is_default = TRUE;

-- ── 5. ORDERS ────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS public.order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

CREATE TYPE IF NOT EXISTS public.payment_method AS ENUM (
    'cod', 'upi', 'card', 'netbanking', 'wallet'
);

CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status              public.order_status NOT NULL DEFAULT 'pending',
    subtotal            NUMERIC(12, 2) NOT NULL,
    tax_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    shipping_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12, 2) NOT NULL,
    billing_address_id  UUID REFERENCES public.billing_addresses(id) ON DELETE SET NULL,
    shipping_address_id UUID REFERENCES public.billing_addresses(id) ON DELETE SET NULL,
    payment_method      public.payment_method NOT NULL DEFAULT 'cod',
    payment_status      TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed | refunded
    payment_reference   TEXT,                              -- transaction ID
    tracking_number     TEXT,
    notes               TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_idx   ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_date_idx   ON public.orders (created_at DESC);

-- ── 6. ORDER ITEMS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,          -- snapshot at time of order
    product_image TEXT,                   -- snapshot
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price   NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);

-- ── 7. STOCK DECREMENT FUNCTION ──────────────────────────────
-- Called by the backend after order is created
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
      AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
END;
$$;

-- ── 8. AUTO-UPDATE updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to all tables that have updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles', 'products', 'billing_addresses', 'orders'] LOOP
        EXECUTE FORMAT('
            DROP TRIGGER IF EXISTS set_updated_at_%1$s ON public.%1$s;
            CREATE TRIGGER set_updated_at_%1$s
                BEFORE UPDATE ON public.%1$s
                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        ', t);
    END LOOP;
END;
$$;

-- ── 9. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- billing_addresses: users own their addresses
CREATE POLICY "billing_select_own" ON public.billing_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "billing_insert_own" ON public.billing_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "billing_update_own" ON public.billing_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "billing_delete_own" ON public.billing_addresses FOR DELETE USING (auth.uid() = user_id);

-- orders: users own their orders
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

-- order_items: accessible via order ownership
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- products & categories: public read, admin write
CREATE POLICY "products_select_all"  ON public.products   FOR SELECT USING (is_active = TRUE);
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (TRUE);

-- NOTE: The backend uses the SERVICE_ROLE key which bypasses RLS.
-- RLS policies above protect direct client-side Supabase SDK calls.

-- ── 10. USEFUL VIEWS ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.order_summary AS
SELECT
    o.id,
    o.user_id,
    p.full_name AS customer_name,
    p.email     AS customer_email,
    o.status,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    COUNT(oi.id) AS item_count,
    o.created_at
FROM public.orders o
JOIN public.profiles p   ON p.id = o.user_id
JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, p.full_name, p.email;

-- ── DONE ─────────────────────────────────────────────────────
-- Your schema is ready. 🎉
```

---

## 🌐 API Reference

### Auth  `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login → returns JWT |
| POST | `/logout` | ✅ | Logout |
| GET | `/profile` | ✅ | Get current user profile |
| PUT | `/profile` | ✅ | Update profile |
| POST | `/forgot-password` | ❌ | Send reset email |
| POST | `/reset-password` | ❌ | Set new password |
| PUT | `/change-password` | ✅ | Change password |

### Products  `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ❌ | List all (paginated, filterable) |
| GET | `/search?q=` | ❌ | Full-text search |
| GET | `/categories` | ❌ | List categories |
| GET | `/:id` | ❌ | Product detail |
| POST | `/` | 🔑 Admin | Create product |
| PUT | `/:id` | 🔑 Admin | Update product |
| DELETE | `/:id` | 🔑 Admin | Soft-delete product |

### Orders  `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | ✅ | Create order + send email |
| GET | `/my-orders` | ✅ | User's order history |
| GET | `/:id` | ✅ | Order detail |
| PUT | `/:id/cancel` | ✅ | Cancel order |
| GET | `/` | 🔑 Admin | All orders |
| PUT | `/:id/status` | 🔑 Admin | Update order status |

### Billing  `/api/billing`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/addresses` | ✅ | List saved addresses |
| POST | `/addresses` | ✅ | Add new address |
| PUT | `/addresses/:id` | ✅ | Update address |
| DELETE | `/addresses/:id` | ✅ | Delete address |
| PUT | `/addresses/:id/default` | ✅ | Set as default |

### Chatbot  `/api/chatbot`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/message` | ❌ | Send message to AI chatbot |

**Request body:**
```json
{
  "message": "Do you have wireless headphones under ₹3000?",
  "conversation_history": []
}
```

---

## 📧 Email Setup (Gmail)

1. Go to Google Account → Security → 2-Step Verification → App Passwords
2. Create an App Password for "Mail"
3. Use that 16-character password as `SMTP_PASS` in `.env`

For production, prefer **SendGrid** or **AWS SES** for better deliverability.

---

## 🤖 Chatbot Capabilities

The AI chatbot uses **Claude claude-opus-4-5** with tool use to:
- Search products by name, keyword, category, or price range
- Get detailed product info
- List all categories
- Maintain conversation history across turns

**Example conversation:**
```
User: "I'm looking for bluetooth headphones"
Bot:  [searches DB] "I found 3 wireless headphone options..."

User: "Which one has the best battery life?"
Bot:  [uses context] "The X model has 30-hour battery life..."
```

---

## 🔑 Making a User an Admin

Run this in Supabase SQL Editor:
```sql
UPDATE auth.users
SET app_metadata = app_metadata || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```

---

## 🏗️ Architecture Diagram

```
Client (React/Next.js)
        │
        ▼
   Express API (Node.js)
        │
   ┌────┴──────────────────────┐
   │                           │
   ▼                           ▼
Supabase                  Anthropic API
(Auth + DB)              (Claude claude-opus-4-5)
   │                           │
   ▼                           ▼
PostgreSQL            Product Search Tools
                      (queries Supabase)
        │
        ▼
    Nodemailer
    (SMTP/Gmail)
```
