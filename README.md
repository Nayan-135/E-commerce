# 🛍️ Full-Stack E-Commerce Platform

A production-ready, full-stack e-commerce platform featuring a modern **Next.js** frontend and a robust **Node.js/Express** backend, powered by **Supabase** (PostgreSQL + Auth) and featuring an intelligent **AI Chatbot** shopping assistant powered by Anthropic's Claude.

---

## 🏗️ Project Structure

This repository is structured as a monorepo containing both the frontend and backend applications:

- **[`/Frontend`](./Frontend)**: A modern React application built with Next.js (App Router), focusing on dynamic design, responsive components, and an interactive shopping experience.
- **[`/Backend`](./Backend)**: A full-featured REST API built with Node.js and Express, handling everything from user authentication and order processing to AI agent interactions and automated email notifications.
- **`ARCHITECTURE.md`**: Comprehensive technical documentation detailing the system architecture, request flows, database relationships, and security model.
- **`SUPABASE_SCHEMA.sql`**: The complete PostgreSQL database schema with tables, functions, triggers, and Row Level Security (RLS) policies.

---

## ✨ Key Features

### 💻 Frontend
- **Framework**: Next.js (App Router) with React 19.
- **Styling**: Smooth UI themes with warm midnight aesthetics, sophisticated color palettes, and glassmorphism.
- **Components**: Interactive UI elements including a specialized AI Chatbot Widget, Header, Footer, and product grids.
- **Integration**: Real-time communication with the backend API and Supabase Auth.

### ⚙️ Backend
- **Framework**: Node.js with Express 4.x.
- **Authentication**: JWT-based login/registration powered by Supabase Auth.
- **Database**: PostgreSQL (via Supabase) with full-text search, trigram indexing, and robust Row Level Security (RLS).
- **E-Commerce Logic**: 
  - Product catalog and inventory management with atomic stock decrements.
  - Cart, billing addresses, and complete order lifecycle management.
- **AI Shopping Assistant**: Integrated Claude (claude-opus-4-5) agent capable of using tools to search products and provide contextual help based on real database data.
- **Transactional Emails**: HTML order confirmation emails using Nodemailer.
- **Security**: Hardened with Helmet, CORS, Morgan logging, and rate-limiting.

---

## 🚀 Getting Started

To get this project running locally, you'll need to set up the database, backend, and frontend in sequence.

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) account
- An [Anthropic](https://console.anthropic.com/) account for Claude API keys (if using the chatbot)

### 1. Database Setup (Supabase)
1. Create a new Supabase project.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of the `SUPABASE_SCHEMA.sql` file (or the SQL block in `Backend/README.md`) and run it. This will create all necessary tables, triggers, policies, and insert sample data.
4. Ensure "Email Confirmations" are configured in your Supabase Auth settings if required.

### 2. Backend Setup
1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase URL, Keys (Anon & Service Role), Anthropic API Key, and SMTP credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The backend will typically run on http://localhost:5000.*

### 3. Frontend Setup
1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 📖 Documentation

For a deep dive into how the system works under the hood, please refer to the detailed documentation:

- **[System Architecture](ARCHITECTURE.md)**: Detailed breakdown of the Request Flow, Authentication Lifecycle, Order processing, and AI Agent loops.
- **[Backend API Reference](Backend/README.md)**: Complete list of REST API endpoints for Auth, Products, Orders, Billing, and Chatbot.
- **[Frontend Next.js Guide](Frontend/README.md)**: Details on the Next.js specific setup and deployment.

---

## 🤖 AI Chatbot Capabilities

The integrated AI assistant uses **Claude** with specific tool use to:
- Search products by name, keyword, category, or price range.
- Fetch detailed product information directly from the PostgreSQL database.
- Maintain conversation history across multiple turns to provide a continuous, contextual shopping experience.

---

## 🛡️ Security

The project incorporates multiple layers of protection:
- **Network Level**: Express Helmet for HTTP header hardening.
- **Rate Limiting**: Brute-force protection on Auth and standard endpoints.
- **Database Level**: Supabase Row Level Security (RLS) ensures users can only read/write their own profiles, addresses, and orders.
- **Validation**: Strict server-side verification of product pricing and stock availability before order confirmation.
