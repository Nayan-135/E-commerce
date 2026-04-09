# 🛍️ E-Commerce Backend — Complete Architecture

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Diagram](#architecture-diagram)
5. [Request Flow](#request-flow)
6. [Module Breakdown](#module-breakdown)
7. [Database Schema](#database-schema)
8. [Authentication Flow](#authentication-flow)
9. [Order Lifecycle](#order-lifecycle)
10. [AI Chatbot Architecture](#ai-chatbot-architecture)
11. [Email Service](#email-service)
12. [Security Architecture](#security-architecture)
13. [API Endpoints Reference](#api-endpoints-reference)
14. [Environment Variables](#environment-variables)
15. [Deployment Guide](#deployment-guide)

---

## System Overview

A production-ready e-commerce REST API that handles user authentication, product management, order processing, billing, automated email notifications, and an AI-powered shopping assistant.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│         React / Next.js / Mobile App / Postman                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP/HTTPS (Bearer JWT)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS API SERVER                          │
│                  Node.js — Port 5000                            │
│                                                                 │
│  Helmet │ CORS │ Morgan │ Rate Limiter │ Body Parser            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────┐  │
│  │  /auth   │ │/products │ │ /orders  │ │/billing│ │/chat  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬───┘  │
│       │             │            │            │          │      │
│  ┌────▼─────────────▼────────────▼────────────▼──────────▼───┐ │
│  │              Auth Middleware (JWT via Supabase)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Controllers                           │  │
│  │  auth │ product │ order │ billing │ chatbot              │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────┬───────────────────────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                 ┌─────────────────┐
│   SUPABASE   │                 │  ANTHROPIC API  │
│              │                 │  claude-opus-4-5 │
│  Auth        │◄────────────────│  (Tool Use)     │
│  PostgreSQL  │                 └─────────────────┘
│  RLS         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   NODEMAILER │
│   SMTP/Gmail │
│   (Emails)   │
└──────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20+ | JavaScript server runtime |
| Framework | Express 4.x | HTTP routing and middleware |
| Database | Supabase (PostgreSQL) | Primary data store |
| Auth | Supabase Auth | JWT-based authentication |
| AI | Anthropic Claude claude-opus-4-5 | Chatbot with tool use |
| Email | Nodemailer + SMTP | Transactional emails |
| Security | Helmet, express-rate-limit | HTTP hardening |
| Logging | Morgan | Request logging |

---

## Project Structure

```
ecommerce-backend/
│
├── src/
│   ├── server.js                   # App entry — middleware, routes, error handler
│   │
│   ├── config/
│   │   ├── supabase.js             # Two Supabase clients (admin + anon)
│   │   └── mailer.js               # Nodemailer SMTP transporter
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # Bearer JWT verification via Supabase
│   │   └── error.middleware.js     # Global error handler + asyncHandler wrapper
│   │
│   ├── routes/
│   │   ├── auth.routes.js          # /api/auth/*
│   │   ├── product.routes.js       # /api/products/*
│   │   ├── order.routes.js         # /api/orders/*
│   │   ├── billing.routes.js       # /api/billing/*
│   │   └── chatbot.routes.js       # /api/chatbot/*
│   │
│   ├── controllers/
│   │   ├── auth.controller.js      # Register, login, profile, password
│   │   ├── product.controller.js   # CRUD, search, categories
│   │   ├── order.controller.js     # Create order, history, status
│   │   ├── billing.controller.js   # Address CRUD
│   │   └── chatbot.controller.js   # Claude AI agentic loop
│   │
│   └── services/
│       └── email.service.js        # HTML email templates + sendMail
│
├── package.json
├── .env.example
└── README.md
```

---

## Architecture Diagram

### Layer Architecture

```
┌─────────────────────────────────────────────────┐
│                 PRESENTATION LAYER               │
│           Routes  (Express Router)               │
│  auth | products | orders | billing | chatbot    │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                MIDDLEWARE LAYER                  │
│  authenticateUser → requireAdmin → asyncHandler  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                BUSINESS LOGIC LAYER              │
│               Controllers                        │
│  Validation → DB Queries → Response Shaping      │
└──────────┬───────────────────────┬──────────────┘
           │                       │
┌──────────▼──────────┐  ┌─────────▼──────────────┐
│   DATA ACCESS LAYER │  │    SERVICE LAYER        │
│   Supabase Client   │  │  email.service.js       │
│   (Admin + Anon)    │  │  Anthropic SDK          │
└──────────┬──────────┘  └────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│               SUPABASE / POSTGRESQL              │
│  profiles | categories | products | orders       │
│  order_items | billing_addresses                 │
│  Row Level Security | Triggers | Functions       │
└─────────────────────────────────────────────────┘
```

---

## Request Flow

### Standard Authenticated Request

```
Client
  │
  │  POST /api/orders  { Authorization: Bearer <token> }
  ▼
Express Server
  │
  ├─► Helmet (set security headers)
  ├─► CORS (check origin)
  ├─► Morgan (log request)
  ├─► Rate Limiter (check 100 req/15min)
  ├─► Body Parser (parse JSON)
  │
  ├─► Router matches /api/orders
  │
  ├─► authenticateUser middleware
  │       │
  │       ├─► Extract Bearer token from Authorization header
  │       ├─► supabase.auth.getUser(token)  ──► Supabase verifies JWT
  │       ├─► Attach req.user = { id, email, ... }
  │       └─► next()
  │
  ├─► orderController.create()
  │       │
  │       ├─► Validate request body
  │       ├─► Fetch & validate product stock from Supabase
  │       ├─► Calculate subtotal, tax (18% GST), shipping
  │       ├─► INSERT into orders table
  │       ├─► INSERT into order_items table
  │       ├─► CALL decrement_stock() PostgreSQL function
  │       ├─► Fetch user profile for email
  │       ├─► emailService.sendOrderConfirmation()  (non-blocking)
  │       └─► res.json({ order })
  │
  └─► errorHandler (catches any thrown errors)
```

---

## Module Breakdown

### `src/server.js` — Entry Point

Responsibilities:
- Instantiate Express app
- Apply global middleware stack (helmet, cors, morgan, rate-limit, body-parser)
- Mount all routers under `/api/*`
- Register global error handler
- Start HTTP listener

### `src/config/supabase.js` — Two Clients

Two Supabase clients serve different purposes:

```
supabaseAdmin  (SERVICE_ROLE key)
    └── Bypasses Row Level Security
    └── Used for all server-side DB operations
    └── Never exposed to client

supabase  (ANON key)
    └── Used only for auth.getUser(token) — to verify JWTs
    └── Respects RLS policies
```

### `src/middleware/auth.middleware.js`

```
Request
  │
  ├── Check Authorization header exists
  ├── Extract token after "Bearer "
  ├── supabase.auth.getUser(token)
  │       ├── Valid  → attach req.user, call next()
  │       └── Invalid → 401 Unauthorized
  │
  └── requireAdmin (used after authenticateUser)
          ├── Read req.user.app_metadata.role
          ├── role === 'admin' → next()
          └── else → 403 Forbidden
```

### `src/controllers/chatbot.controller.js` — AI Agentic Loop

```
Client Message
  │
  ▼
Claude claude-opus-4-5 (with tools)
  │
  ├── stop_reason === 'tool_use'?
  │       │
  │       ├── search_products   → Supabase query
  │       ├── get_product_details → Supabase query
  │       └── get_categories    → Supabase query
  │
  ├── Tool results fed back to Claude
  ├── Claude generates final text response
  └── Return { reply, conversation_history }
```

---

## Database Schema

### Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    │ 1:1 (trigger)
    ▼
profiles
    id │ email │ full_name │ phone │ avatar_url

    │ 1:N
    ▼
billing_addresses
    id │ user_id │ full_name │ phone
    address_line1 │ city │ state │ postal_code │ country
    is_default

    │ 1:N
    ▼
orders
    id │ user_id │ status │ subtotal
    tax_amount │ shipping_amount │ total_amount
    billing_address_id │ shipping_address_id
    payment_method │ payment_status │ payment_reference
    tracking_number │ notes

    │ 1:N
    ▼
order_items
    id │ order_id │ product_id
    product_name │ product_image (snapshots)
    quantity │ unit_price │ total_price


categories ──────────────── products
    id │ name │ slug       id │ name │ slug │ description
    description │ parent_id  price │ compare_price │ sku
                            stock_quantity │ category_id
                            images[] │ tags[] │ is_active
                            weight_grams │ metadata
```

### Table Summary

| Table | Rows | Key Features |
|-------|------|-------------|
| `profiles` | One per user | Auto-created by DB trigger on signup |
| `categories` | Store categories | Self-referential (parent_id for sub-categories) |
| `products` | Product catalog | Full-text search index, trigram index, soft delete |
| `billing_addresses` | Saved addresses | Unique constraint: only one default per user |
| `orders` | Purchase orders | ENUM status type, GST tax fields |
| `order_items` | Line items | Snapshots product name/image at order time |

---

## Authentication Flow

### Registration

```
POST /api/auth/register
  │
  ├── supabase.auth.signUp({ email, password, data: { full_name } })
  │       └── Supabase creates auth.users record
  │       └── Sends verification email (if enabled in Supabase dashboard)
  │
  ├── DB Trigger fires: on_auth_user_created
  │       └── INSERT INTO profiles (id, email, full_name)
  │
  └── Response: 201 { message, user: { id, email } }
```

### Login

```
POST /api/auth/login
  │
  ├── supabase.auth.signInWithPassword({ email, password })
  │       └── Returns { session: { access_token, refresh_token }, user }
  │
  ├── Fetch full profile from profiles table
  │
  └── Response: 200 { token, refresh_token, user: { ...authUser, profile } }
```

### Authenticated Requests

```
All protected routes:
  Client sends →  Authorization: Bearer <access_token>
  Server verifies → supabase.auth.getUser(token)
  Supabase validates JWT signature + expiry
  req.user is populated for controller use
```

---

## Order Lifecycle

```
          ┌─────────┐
          │ pending │  ← Order created, payment awaited
          └────┬────┘
               │
          ┌────▼─────┐
          │confirmed │  ← Payment received / COD accepted
          └────┬─────┘
               │
          ┌────▼──────┐
          │processing │  ← Being packed in warehouse
          └────┬──────┘
               │
          ┌────▼────┐
          │ shipped │  ← Dispatched, tracking number assigned
          └────┬────┘
               │
          ┌────▼──────┐
          │ delivered │  ← Confirmed delivery
          └───────────┘

  At any point before "shipped":
          ┌───────────┐
          │ cancelled │  ← User or admin cancelled
          └───────────┘

  After delivery:
          ┌──────────┐
          │ refunded │  ← Return/refund processed
          └──────────┘
```

### Stock Management

```
Order Created
  │
  ├── Validate: product.stock_quantity >= requested quantity
  │       └── If insufficient → 400 error, order not created
  │
  ├── INSERT order + order_items (price snapshot taken here)
  │
  └── CALL decrement_stock(product_id, quantity) PostgreSQL function
          └── Atomic UPDATE with CHECK: stock_quantity >= quantity
          └── RAISE EXCEPTION if stock changed between validation and update
```

---

## AI Chatbot Architecture

### Tool Definitions

| Tool | Description | Parameters |
|------|-------------|-----------|
| `search_products` | Search catalog by keyword/price/category | query, category, max_price, limit |
| `get_product_details` | Fetch full details of one product | product_id |
| `get_categories` | List all categories | none |

### Agentic Loop

```
User: "Do you have wireless headphones under ₹3000?"
  │
  ▼
Claude receives message + tool definitions
  │
  ├── Claude decides to call: search_products({ query: "wireless headphones", max_price: 3000 })
  │
  ├── Backend executes: Supabase query → returns matching products
  │
  ├── Tool result fed back to Claude
  │
  ├── Claude generates natural language response with product details
  │
  └── Response: "Yes! I found 2 wireless headphones under ₹3000: ..."

Conversation history maintained client-side, sent with each message (last 10 turns).
```

---

## Email Service

### Order Confirmation Email Structure

```
┌────────────────────────────────────────┐
│  HEADER — Store name + logo area       │
├────────────────────────────────────────┤
│  GREETING — "Thank you, {name}! 🎉"   │
├────────────────────────────────────────┤
│  ORDER META                            │
│  Order ID | Date | Status badge        │
├────────────────────────────────────────┤
│  ORDER ITEMS TABLE                     │
│  Product | Qty | Unit Price | Total    │
│  ──────────────────────────────────    │
│  Item 1  |  2  |  ₹999     | ₹1998   │
│  Item 2  |  1  |  ₹499     |  ₹499   │
├────────────────────────────────────────┤
│  TOTALS                                │
│  Subtotal        ₹2497                 │
│  GST (18%)        ₹449                 │
│  Shipping          FREE                │
│  ─────────────────────                 │
│  Total           ₹2946                 │
├────────────────────────────────────────┤
│  BILLING ADDRESS                       │
├────────────────────────────────────────┤
│  FOOTER — support email, copyright     │
└────────────────────────────────────────┘
```

Email is sent non-blocking — a mail server failure never causes the order API to return an error.

---

## Security Architecture

### Layers of Protection

```
1. NETWORK LAYER
   └── Helmet.js sets: Content-Security-Policy, X-Frame-Options,
       X-XSS-Protection, HSTS, etc.

2. RATE LIMITING
   └── All routes:  100 requests / 15 minutes
   └── Auth routes: 10 requests / 15 minutes (brute-force protection)

3. AUTHENTICATION
   └── Supabase issues JWTs signed with project secret
   └── Server verifies every token on protected routes
   └── Tokens expire (default 1 hour); client uses refresh_token

4. AUTHORIZATION
   └── requireAdmin checks app_metadata.role === 'admin'
   └── Orders/billing scoped to req.user.id (users see only their data)

5. DATABASE LAYER (Row Level Security)
   └── profiles: SELECT/UPDATE own row only
   └── billing_addresses: full CRUD on own rows only
   └── orders: SELECT/INSERT/UPDATE own rows only
   └── products/categories: public SELECT, no direct write
   └── Service role key (server-side only) bypasses RLS

6. INPUT VALIDATION
   └── Required field checks in each controller
   └── Enum validation for order status
   └── Price/quantity CHECK constraints in PostgreSQL
```

### Key Security Rules

- `SUPABASE_SERVICE_ROLE_KEY` is never sent to the client
- All DB writes go through the backend — no direct client-to-Supabase writes for orders/billing
- Product prices are always read from the database at order time — client-submitted prices are ignored
- Stock decrement is an atomic PostgreSQL function — prevents overselling under concurrent load

---

## API Endpoints Reference

### Auth  `BASE: /api/auth`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/register` | ❌ | `{ email, password, full_name, phone }` | Create account |
| POST | `/login` | ❌ | `{ email, password }` | Login → JWT |
| POST | `/logout` | ✅ | — | Invalidate session |
| GET | `/profile` | ✅ | — | Get profile |
| PUT | `/profile` | ✅ | `{ full_name, phone, avatar_url }` | Update profile |
| POST | `/forgot-password` | ❌ | `{ email }` | Send reset link |
| POST | `/reset-password` | ❌ | `{ new_password }` | Set new password |
| PUT | `/change-password` | ✅ | `{ new_password }` | Change password |

### Products  `BASE: /api/products`

| Method | Endpoint | Auth | Query / Body | Description |
|--------|----------|------|-------------|-------------|
| GET | `/` | ❌ | `?page&limit&category&min_price&max_price&sort&order` | List products |
| GET | `/search` | ❌ | `?q=keyword&limit` | Search products |
| GET | `/categories` | ❌ | — | All categories |
| GET | `/:id` | ❌ | — | Product detail |
| POST | `/` | 🔑 Admin | `{ name, price, description, stock_quantity, category_id, images, sku, tags }` | Create product |
| PUT | `/:id` | 🔑 Admin | (any product fields) | Update product |
| DELETE | `/:id` | 🔑 Admin | — | Soft delete |

### Orders  `BASE: /api/orders`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/` | ✅ | `{ items: [{product_id, quantity}], billing_address_id, payment_method, notes }` | Place order |
| GET | `/my-orders` | ✅ | `?page&limit` | Order history |
| GET | `/:id` | ✅ | — | Order detail |
| PUT | `/:id/cancel` | ✅ | — | Cancel order |
| GET | `/` | 🔑 Admin | `?page&limit&status` | All orders |
| PUT | `/:id/status` | 🔑 Admin | `{ status }` | Update status |

### Billing  `BASE: /api/billing`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/addresses` | ✅ | — | List addresses |
| POST | `/addresses` | ✅ | `{ full_name, phone, address_line1, city, state, postal_code, country, is_default }` | Add address |
| PUT | `/addresses/:id` | ✅ | (any address fields) | Update address |
| DELETE | `/addresses/:id` | ✅ | — | Delete address |
| PUT | `/addresses/:id/default` | ✅ | — | Set as default |

### Chatbot  `BASE: /api/chatbot`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/message` | ❌ | `{ message: string, conversation_history: [] }` | Chat with AI |

---

## Environment Variables

```
# Server
PORT                    Express port (default 5000)
NODE_ENV                development | production
FRONTEND_URL            CORS allowed origin

# Supabase (Project Settings → API)
SUPABASE_URL            https://xxxx.supabase.co
SUPABASE_ANON_KEY       Public anon key
SUPABASE_SERVICE_ROLE_KEY  Secret service role key ⚠️ server only

# AI
ANTHROPIC_API_KEY       Claude API key (console.anthropic.com)

# Email
SMTP_HOST               smtp.gmail.com
SMTP_PORT               587
SMTP_SECURE             false (true for port 465)
SMTP_USER               sender@gmail.com
SMTP_PASS               Gmail App Password

# Store
STORE_NAME              Used in email subject/footer
SUPPORT_EMAIL           Shown in order confirmation email
```

---

## Deployment Guide

### Development

```bash
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

### Production (Railway / Render / EC2)

```bash
# Set all env vars in your hosting dashboard
# Then:
npm install --production
npm start
```

### Make a User an Admin

Run in Supabase SQL Editor:
```sql
UPDATE auth.users
SET app_metadata = app_metadata || '{"role": "admin"}'::jsonb
WHERE email = 'admin@yourdomain.com';
```

### Enable Email Verification (Recommended)

In Supabase Dashboard → Authentication → Settings → Enable "Email Confirmations"

---

## Scaling Considerations

As the store grows, consider these additions in order of priority:

**Phase 1 — Basic scale**
- Add Redis for rate limiting (shared across multiple server instances)
- Move email to SendGrid or AWS SES for better deliverability and retry logic
- Add request ID to logs for traceability

**Phase 2 — Performance**
- Add a product cache layer (Redis) with TTL invalidation on product update
- Use Supabase Storage for product images instead of external URLs
- Paginate chatbot conversation history on the server

**Phase 3 — Features**
- Add Stripe/Razorpay webhook handler for payment confirmation
- Add coupon/discount code system (discount_codes table)
- Add product reviews table (reviews: user_id, product_id, rating, body)
- Add inventory alerts (cron job checking low_stock_alert threshold)
