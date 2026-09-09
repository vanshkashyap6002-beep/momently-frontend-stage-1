# Momently — Stage 1

A plain **HTML / CSS / Vanilla JavaScript** rebuild of the Momently frontend,
backed by a small **Node.js/Express** API. This is a separate, parallel
project — it does not modify, delete, or replace the original Next.js
project in any way. The Next.js project was used only as the design/product
reference (colors, fonts, animations, layout, copy, data model).

Momently: a personalized digital memory service. A customer picks a
template, gives us their story, photos, and a date, pays, and **Momently
personally builds and publishes** the memory page — there is no self-serve
drag-and-drop editor in Stage 1, by design.

---

## Folder structure

```
momently-stage1/
├── index.html              Homepage
├── login.html               Customer login
├── signup.html               Customer signup
├── templates.html             Template marketplace (search, filters, preview)
├── create-memory.html          3-step flow: info → upload → summary
├── payment.html                Razorpay checkout
├── success.html                 Order confirmation
├── memory/
│   └── memory.html              One shared template, populated per customer
├── admin/
│   ├── index.html                Admin login (separate from customer login)
│   └── orders.html                Admin dashboard: list + detail + publish
├── css/
│   ├── style.css                  Design tokens + all component styles
│   └── animations.css              Floating hearts, bloom, loaders, transitions
├── js/
│   ├── main.js                     Shared chrome + API helper (loaded everywhere)
│   ├── auth.js                      Login/signup forms + Google button
│   ├── templates.js                  Catalog rendering (homepage + marketplace)
│   ├── create-memory.js               Multi-step flow orchestration
│   ├── upload.js                       Drag-and-drop upload zone
│   ├── payment.js                       Razorpay checkout integration
│   ├── memory.js                        Public memory page renderer
│   └── admin.js                          Admin login + dashboard + publish
├── assets/
├── .env.example
├── .gitignore
├── README.md                (this file)
└── server/                   Backend — the one deliberate structural addition
    ├── server.js               Express entrypoint + static file serving
    ├── package.json
    ├── db/schema.sql            SQLite schema
    ├── lib/                      db, jwt, storage, mailer, razorpay, googleOAuth, slug, rateLimit, env
    ├── middleware/                customerAuth.js, adminAuth.js — kept fully separate
    ├── routes/                     auth, templates, orders, media, payment, memory, admin
    ├── scripts/                     seed-templates.js, create-admin.js
    └── uploads/                      Private media storage (gitignored)
```

**Why a `server/` folder exists:** the brief is explicit that the frontend must
be HTML/CSS/vanilla JS only, and it is — there is no React, Next.js,
TypeScript, JSX, or build step anywhere in the files above `server/`. But
real auth, real Google OAuth, a real database, private file storage, real
Razorpay payments, and outbound email all need *something* running
server-side to hold secrets and talk to those services safely. `server/` is
that something — a small Express API, plain JavaScript, no framework beyond
Express itself.

## Technology used

| Concern | Choice | Why |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JS (classic scripts, no build step) | Required |
| Server | Node.js + Express | Minimal, well-understood, easy to self-host or move to serverless later |
| Database | SQLite (`better-sqlite3`) | Zero external services to stand up; the schema in `server/db/schema.sql` maps directly to Postgres if you outgrow it |
| Auth | Custom JWT-in-httpOnly-cookie, `bcryptjs` for hashing | No session store needed; two independent token namespaces for customer vs. admin |
| Google OAuth | Hand-rolled Authorization Code flow (`server/lib/googleOAuth.js`) | Real OAuth against Google's actual endpoints, no extra dependency |
| Payments | `razorpay` npm package + manual HMAC verification | Matches Razorpay's documented server-side verification pattern |
| File storage | Local disk under `server/uploads/`, never web-served directly | Simplest thing that's actually private; swappable later (see `server/lib/storage.js`) |
| Email | `nodemailer` over SMTP (any provider) | Works with Gmail/SendGrid/Resend/SES/Mailtrap interchangeably |

## Customer vs. admin: kept structurally separate

Per your instruction, these never share a path, a cookie, or a code path:

- **Different login pages**: `/login.html` vs `/admin/index.html`.
- **Different API endpoints**: `/api/auth/*` vs `/api/admin/*`.
- **Different cookies**: `momently_session` vs `momently_admin_session`, signed
  with two different secrets (`SESSION_SECRET` / `ADMIN_SESSION_SECRET`).
- **Different database tables**: `users` vs `admin_users`.
- **No public admin signup, ever.** The only way an admin account is created
  is by running `npm run create-admin` on the server itself.
- `middleware/customerAuth.js` and `middleware/adminAuth.js` each check only
  their own cookie — a customer token is structurally incapable of passing
  `requireAdmin`, and vice versa (verified in testing below).

## Setup

```bash
cp .env.example .env        # then fill in real values (see below)
cd server
npm install
npm run seed                # loads the 8 master templates
npm run create-admin        # prompts for an admin name/email/password
npm start                   # serves the whole app (frontend + API) on :3000
```

Open `http://localhost:3000`. Admin is at `http://localhost:3000/admin/`.

### Authentication
Email/password works immediately after `npm install`. Passwords are hashed
with bcrypt; never stored in plain text.

### Google OAuth setup
1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → **Create OAuth client ID** → type **Web application**.
2. Add this **Authorized redirect URI** exactly: `{APP_BASE_URL}/api/auth/google/callback` (e.g. `http://localhost:3000/api/auth/google/callback`).
3. Put the client ID/secret in `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. The "Continue with Google" button is **hidden automatically** until both
   values are set — it never appears as a dead button (`GET /api/auth/google/available`).

### Payment setup (Razorpay)
1. [Razorpay Dashboard → API Keys](https://dashboard.razorpay.com/app/keys) → use **Test** keys while developing → `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Dashboard → **Webhooks** → add `{APP_BASE_URL}/api/payment/webhook`, subscribe to `payment.captured` → copy the signing secret into `RAZORPAY_WEBHOOK_SECRET` (this is deliberately a *different* secret from the key secret).
3. The client-side success callback is never trusted alone — `/api/payment/verify` recomputes the signature server-side, and the webhook is the durable source of truth even if the customer closes the tab right after paying.

### Storage setup
Nothing to configure for local/single-server use — files land in
`server/uploads/<order-id>/`, outside any web-served directory, and are only
served back through `GET /api/media/:id/file`, which checks ownership (or
that the order has been published). To move to S3/Cloudinary/Supabase
Storage later, only `server/lib/storage.js` needs to change.

### Email setup
Set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` in
`.env` — any provider works. Leave them blank during development and emails
are printed to the server console instead of failing.

## What Stage 1 deliberately does *not* include

These are real features of the reference Next.js project that the brief
explicitly scopes out of Stage 1, so they're not here:
- A self-serve drag-and-drop memory studio (Momently builds the memory by hand instead).
- Customer template submission / community templates / creator profiles.
- Password reset and email verification flows (not in the brief's page list — straightforward to add to `server/routes/auth.routes.js` later).
- A "my orders" history page (the brief's flow is linear: create → pay → success → email; there's no dashboard requested for customers).
- Any admin analytics/reporting beyond the orders list the brief asked for.

One small, deliberate content adaptation: the reference project's homepage
pricing section shows monthly subscription tiers tied to its creator
marketplace, which doesn't exist in Stage 1 (customers pay once, per
template — that's the actual checkout flow here). The Stage 1 homepage
keeps the same 3-card pricing *section design*, but relabeled around actual
template price tiers, so every button on the page leads somewhere real.

## Testing performed

Everything below was actually run in this environment, not just written:
- Full customer flow via curl: signup → create order → fill info → upload a
  real file → (Razorpay order creation correctly fails closed, since
  Razorpay's API isn't reachable from this sandbox — see below) → admin
  marks paid → admin builds the memory (title/subtitle/timeline/closing
  message) → admin publishes → email is generated correctly (logged, since
  no SMTP is configured here) → public `/api/memory/:slug` returns the
  right data → the previously-private photo becomes fetchable without auth
  *only* once its order is published.
- Isolation test: a customer session cookie gets `401` on every
  `/api/admin/*` route, and an admin session cookie gets `401` on
  customer-only routes.
- Every `.html` page and every `css/js` asset was requested from the running
  server and returned `200`.
- Every `href`/`src` in every HTML file was checked to resolve to a real
  file on disk.
- All server and frontend JavaScript passed `node --check` (syntax
  validation).
- Confirmed zero `.ts`/`.tsx`/`.jsx` files anywhere in the project.
- Found and fixed two real bugs during testing: a path-resolution bug where
  `DATABASE_PATH`/`UPLOAD_DIR` from `.env` resolved against the wrong
  working directory, and the publish endpoint reporting `emailSent: true`
  even when no SMTP was configured.

## Known limitations / remaining warnings

- **Razorpay checkout and Google's token exchange were not tested against
  the real Google/Razorpay APIs** — this sandbox's network egress only
  allows npm/PyPI/GitHub domains, so `api.razorpay.com` and
  `oauth2.googleapis.com` aren't reachable from here. The integration code
  follows both providers' documented server-side flows exactly, and the
  payment endpoint fails closed (a clean `502`, not a crash) when the API
  is unreachable — confirmed in testing — but you'll want to click through
  a real payment and a real Google sign-in once you add live keys.
- **No real browser was available to click-test the UI** (no headless
  Chromium could be installed in this sandbox). Every page was verified to
  serve correctly, every script passes syntax checking, every DOM element a
  script references was cross-checked against the page(s) that load it, and
  the entire data flow those scripts depend on was tested directly against
  the API — but a first real click-through in an actual browser is still
  worth doing before you consider this launch-ready.
- SQLite + local disk storage is a single-server design (documented above,
  not a bug) — fine for one instance, would need a shared DB/object storage
  before running multiple server instances behind a load balancer.
- The in-memory rate limiter (`server/lib/rateLimit.js`) is per-process for
  the same reason.
