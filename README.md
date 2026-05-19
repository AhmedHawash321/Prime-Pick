<div align="center">

# PRIME-PICK

### Production-Grade Full-Stack E-Commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)](https://graphql.org)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://rust-lang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)

A complete, production-quality e-commerce platform featuring an integrated **Rust AI Agent** for intelligent product search and automated comment moderation, built with a modern polyglot architecture.

<img width="2880" height="1342" alt="Home-page" src="https://github.com/user-attachments/assets/b1c83f7b-9b30-4567-a2e2-62f4c3f893ba" />



[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Testing](#-testing)

</div>

---

## 📺 Live Demo

Watch the complete project walkthrough, including the Rust AI Agent tool-calling, automated moderation flow, and system architecture explanation on **[LinkedIn](https://www.linkedin.com/posts/ahmed-hawash-21b992149_rust-nodejs-typescript-activity-7460587764711833600-TLWq?utm_source=share&utm_medium=member_desktop&rcm=ACoAACPrI7cBGWtDBaEdsNsnYRuAwN7ujeZGHsE)**.

---

## Features

### Storefront
- **Product Catalog** — filterable grid with real-time search, category browsing, price range filters, and soft-delete support
- **Product Detail Pages** — image gallery, stock status, average rating, and verified-purchase reviews
- **Smart Search** — global Zustand-powered search with live dropdown suggestions across all pages
- **Shopping Cart** — real-time sync with stock validation, quantity controls, and upsert logic
- **Secure Checkout** — Stripe Checkout integration; cart only clears after webhook confirms successful payment
- **Order Tracking** — per-user order history with full status flow (`pending → processing → shipped → delivered → completed`)

### AI Agent (Rust)

<img width="2880" height="1355" alt="Ai-Chat bot" src="https://github.com/user-attachments/assets/330fdfb2-cf66-4e56-b2a4-b11d70f01f7b" />

- **Intelligent Chatbot** — powered by Ollama LLaMA 3.2 via the Rig framework; instant fast-path responses for common phrases with zero LLM latency
- **Product Search Tool** — agent calls the GraphQL backend in real-time to answer stock and price queries
- **Comment Moderation** — automated review pipeline with three-tier decisions: `approved`, `rejected`, `pending`
- **Scam Detection** — fast-reject layer catches Egyptian phone numbers (01x), WhatsApp references, and external links before hitting the LLM
- **Admin Review Queue** — borderline comments flagged as `pending` route to the admin dashboard for manual approval

### Content & SEO

<img width="2880" height="1349" alt="SEO % Articles" src="https://github.com/user-attachments/assets/c3fe1e8c-2857-438f-85a0-d2a7f0353fda" />


- **Blog / Articles System** — full CMS with Markdown support, DOMPurify sanitization, and ISR (1-hour revalidation)
- **Dynamic Sitemap** — auto-generated XML covering products, categories, and articles
- **Schema.org Markup** — `BlogPosting` and `CollectionPage` structured data for rich search snippets
- **Per-page Metadata** — `generateMetadata` on all dynamic routes with Open Graph and canonical URLs
- **robots.txt** — GPTBot and crawler rules with sitemap pointer

### Admin Dashboard

<img width="2880" height="1342" alt="Admin-Dashboard" src="https://github.com/user-attachments/assets/7196db2a-243b-4c7d-b24a-c7badfac5aa7" />


- **Product CRUD** — create / edit / delete with UploadThing image upload (admin-only middleware)
- **Category Management** — slug-based categories with product-count badges
- **Order Management** — status updates with automatic delivery-notification triggers
- **Comment Moderation Queue** — review AI-flagged comments with one-click approve / reject
- **Analytics** — order and revenue overview with Recharts visualizations

### Notifications & Reviews

<img width="2880" height="1340" alt="Popup-notification" src="https://github.com/user-attachments/assets/e6c2d3b4-b018-42cc-84b3-a0f1e7fa65b2" />

- **Delivery Notifications** — automatically created when admin marks order as `delivered`
- **Review Prompts** — modal popup with star rating, verified-purchase gate, and `localStorage` dismiss state
- **AI Moderation** — every review passes through the Rust agent before being saved to the database

### Authentication & Security
- **Clerk Auth** — JWT Bearer token + cookie-session fallback with lazy user sync to PostgreSQL
- **RBAC** — `admin` / `user` roles enforced at the GraphQL resolver layer
- **Purchase Verification** — comments only allowed on `delivered` / `completed` orders
- **Rate Limiting** — Redis-backed sliding window (100 req / 15 min per IP)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│   Next.js 15 · Apollo Client 4 · Zustand · DaisyUI/TW      │
└──────────────────────────┬──────────────────────────────────┘
                           │ GraphQL / REST
┌──────────────────────────▼──────────────────────────────────┐
│                      API LAYER (Node.js)                    │
│   Express 5 · GraphQL Yoga · Clerk Middleware               │
│   UploadThing · Stripe Webhook · Redis Rate Limiter         │
└───────┬──────────────────┬──────────────────────┬───────────┘
        │ Drizzle ORM       │ Axios proxy           │ Redis
┌───────▼──────┐    ┌───────▼──────┐    ┌──────────▼─────────┐
│  PostgreSQL  │    │  Rust Agent  │    │  Redis             │
│  (Neon)      │    │  Axum 0.8    │    │  Cache + Rate Limit│
│              │    │  Rig + Ollama│    │  + Sessions        │
└──────────────┘    └──────┬───────┘    └────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Ollama LLM  │
                    │ LLaMA 3.2   │
                    └─────────────┘
```

### Comment Moderation Flow

```
User submits review
       ↓
Frontend → POST /api/moderate (Express proxy)
       ↓
Rust Agent /moderate endpoint
       ↓
Fast-reject check (phone numbers / links / WhatsApp)
       ↓ (if not fast-rejected)
LLM analysis — Ollama llama3.2 (temp=0.1)
       ↓
approved  → save to DB, visible immediately  ✅
rejected  → GraphQLError thrown, never saved ❌
pending   → save with status=pending, admin notified 🔔
       ↓
Admin Dashboard → approve / reject manually
```

### Cart & Payment Flow

<img width="2880" height="1344" alt="cart" src="https://github.com/user-attachments/assets/00a58b01-c937-4f3d-97aa-552dcb47469a" />


```
Add to Cart → stock validation → upsert with conflict resolution
       ↓
Checkout → create DB order (status=pending)
       ↓
Stripe Checkout Session created
       ↓
User pays → Stripe fires checkout.session.completed webhook
       ↓
Webhook handler → update order status + clear cart
       ↓
User cancels → redirect to /cart  (items preserved ✅)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Apollo Client 4, Zustand, DaisyUI, Recharts |
| **Backend** | Node.js, Express 5, GraphQL Yoga, Drizzle ORM |
| **AI Agent** | Rust, Axum 0.8, Rig 0.36, Ollama (LLaMA 3.2), Tokio |
| **Database** | PostgreSQL via Neon (serverless) |
| **Cache** | Redis — rate limiting, product cache, notification cache |
| **Auth** | Clerk — JWT + sessions, RBAC |
| **Payments** | Stripe Checkout + Webhooks |
| **File Storage** | UploadThing — admin-only image uploads |
| **Testing** | Playwright E2E |
| **Infrastructure** | Docker, Docker Compose |
| **SEO** | Next.js Metadata API, Schema.org, ISR, Dynamic Sitemap |

---

## Project Structure

```
prime-pick/
├── frontend/                    # Next.js 15 application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── (store)/         # Public storefront routes
│   │   │   ├── dashboard/       # Admin dashboard
│   │   │   ├── api/             # Next.js API routes (chat, moderate)
│   │   │   ├── checkout/        # Stripe checkout flow
│   │   │   └── articles/        # Blog system
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ChatWidget.tsx
│   │   │   ├── NotificationPopup.tsx
│   │   │   ├── ReviewPopup.tsx
│   │   │   └── SearchModal.tsx
│   │   ├── context/             # React contexts (ChatContext)
│   │   ├── graphql/             # GQL queries and mutations
│   │   ├── store/               # Zustand stores (cart, search)
│   │   └── lib/                 # Apollo client, UploadThing
│   └── tests/                   # Playwright E2E tests
│
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle schema — all tables + relations
│   │   │   ├── validation.ts    # Zod schemas
│   │   │   └── queries/         # Database query functions
│   │   ├── graphql/
│   │   │   ├── typedefs/        # GraphQL type definitions
│   │   │   └── resolvers/       # Resolver implementations
│   │   ├── authorization/       # Clerk context + RBAC
│   │   ├── middleware/
│   │   │   └── services/        # Stripe service
│   │   ├── uploadthing/         # File router — admin-only
│   │   ├── lib/                 # Shared Redis client
│   │   └── server.ts            # Express app + all middleware
│   └── drizzle/                 # Database migrations
│
├── ai-chat-service/             # Rust AI Agent
│   ├── src/
│   │   ├── main.rs              # CLI + HTTP server dual mode
│   │   ├── server.rs            # Axum HTTP server
│   │   ├── agent.rs             # ProductAgent (search + fast-path)
│   │   ├── moderator.rs         # Comment moderation engine
│   │   ├── tools.rs             # Rig tools (product search)
│   │   └── config.rs            # Environment configuration
│   └── Cargo.toml
│
└── docker-compose.yml           # Backend + Redis orchestration
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Rust 1.75+ (`rustup`)
- Docker + Docker Compose
- Ollama — `ollama serve` and `ollama pull llama3.2`
- Accounts: Clerk, Stripe, Neon, UploadThing

### Environment Variables

**`backend/.env`**
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
UPLOADTHING_TOKEN=...
REDIS_URL=redis://redis:6379
AI_AGENT_URL=http://localhost:8080
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:5000/graphql
AI_AGENT_URL=http://localhost:8080
BACKEND_URL=http://localhost:5000
```

**`ai-chat-service/.env`**
```env
BACKEND_API_URL=http://localhost:5000/graphql
OLLAMA_MODEL=llama3.2
OLLAMA_API_BASE_URL=http://localhost:11434
TEMPERATURE=0.3
MAX_PRODUCT_RESULTS=5
RUST_LOG=info
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AhmedHawash321/prime-pick.git
cd prime-pick

# 2. Start backend + Redis
cd backend
docker compose up --build

# 3. Apply database migrations
npx drizzle-kit push

# 4. Apply comment moderation migration (Neon SQL Editor)
# ALTER TABLE comments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
# ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reason text;

# 5. Start the frontend
cd ../frontend
npm install && npm run dev

# 6. Start the Rust AI Agent
cd ../ai-chat-service
cargo run -- --server
```

### Running Modes — Rust Agent

```bash
# HTTP server mode (for production use)
cargo run -- --server

# CLI mode (for quick testing)
cargo run -- "show me fridges"

# Fast search mode (no LLM)
cargo run -- --quick "laptop"
```

---

## API Reference

### GraphQL — `POST /graphql`

All authenticated operations require `Authorization: Bearer <token>`.

**Queries**
```graphql
getProducts(limit: Int, offset: Int, filter: ProductFilterInput): [Product]
getProductById(id: ID!): Product
getCategories(search: String): [Category]
getCategoryBySlug(slug: String!): Category
getArticles(search: String): [Article!]!
getMyOrders: [Order]
getMyNotifications(limit: Int): [Notification!]!
getPendingComments: [Comment!]!          # Admin only
```

**Mutations**
```graphql
createProduct(input: CreateProductInput!): Product       # Admin only
createCheckoutSession: CheckoutSession
createComment(input: CreateCommentInput!): Comment       # Verified purchase required
approveComment(id: ID!): Comment!                        # Admin only
rejectComment(id: ID!, reason: String): Comment!         # Admin only
updateOrderStatus(orderId: ID!, status: String!): Order  # Admin only
markNotificationAsRead(id: ID!): Notification!
```

### REST Endpoints (Express)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Proxy to Rust AI chatbot |
| `POST` | `/api/moderate` | Proxy to Rust comment moderation |
| `POST` | `/api/webhook` | Stripe payment webhook |
| `POST` | `/api/uploadthing` | UploadThing file handler (admin) |
| `GET`  | `/health` | Health check |

### Rust Agent Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | AI chat — accepts `{ message, user_id? }` |
| `POST` | `/moderate` | Comment moderation — returns `approved` / `rejected` / `pending` |
| `GET`  | `/health` | Health check |

---

## Testing

```bash
# Run all Playwright E2E tests
cd frontend
npx playwright test

# Open Playwright UI with trace viewer
npx playwright test --ui

# Run Rust unit tests
cd ai-chat-service
cargo test
```

**Playwright test suite covers:**
- Chat widget message persistence across page navigation (ChatContext)
- AI assistant response rendering with `data-testid` selectors

**Rust unit tests cover:**
- Comment moderation fast-reject (phone numbers, WhatsApp, external links)
- LLM response JSON parsing and edge cases (low confidence, malformed JSON)
- Config validation (temperature range, empty model, zero results)
- Instant-response fast-path matching (greetings, thanks, Arabic phrases)

---

## Key Design Decisions

**Why Rust for the AI Agent?**
Rust provides memory safety and near-zero overhead for the always-on HTTP server. The Rig framework enables clean tool-calling abstractions with Ollama. Running the agent as a separate service means LLM latency (20–40s) never blocks the Node.js event loop.

**Why GraphQL over REST?**
GraphQL eliminates over-fetching on product detail pages (comments, category, user in one query) and enables the Rust agent's `ProductSearchTool` to request exactly the fields it needs with a single POST.

**Why soft delete for products?**
Order history must reference original product data. Hard deletion would break order-item joins and historical pricing. `deletedAt` keeps the data while hiding it from all public queries via `isNull(products.deletedAt)` filters.

**Why cart clearing in the webhook — not the frontend?**
Clearing the cart before payment confirmation causes data loss if the user's bank declines or the browser crashes mid-redirect. The Stripe `checkout.session.completed` webhook is the only reliable signal that money actually moved.

**Why double-check moderation (frontend + backend)?**
Frontend moderation provides fast UX feedback and saves a round-trip. Backend re-moderation in the GraphQL resolver prevents direct API bypass (Postman, Apollo Sandbox, curl). Security must live server-side.

---

## License

MIT © 2026 Ahmed Hawash

---

<div align="center">

Built with ❤️ in Cairo, Egypt

**[GitHub](https://github.com/AhmedHawash321)** · **[LinkedIn](https://linkedin.com/in/ahmed-hawash)**

</div>
