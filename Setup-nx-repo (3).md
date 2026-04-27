# Nx + Web + API — 10-point guide

A single doc for new teammates: from empty folder to a running **Next.js** + **Express** monorepo, plus how the repo is laid out.

---

## 1) Prerequisites and naming

### Nx in one glance

**Nx** = one repo, many apps. Here, **`apps/web`** and **`apps/api`** share one root install and the same Nx commands (`npx nx run …`). You get **web + API in one place**, **shared tooling** (TypeScript, lint), and **caching** so builds stay fast. No need to master Nx first—use the steps below.

- **Node.js** 20+ and **npm** 10+ (install from nodejs.org or use a version manager).
- **MongoDB** running locally or a cloud URI (Atlas) for the API to store data.
- **Web UI stack:** **[shadcn/ui](https://ui.shadcn.com/) is mandatory for `apps/web`** — build screens and shared UI with Shadcn components (on top of Tailwind + React). Do not introduce a second ad-hoc component library for the same job.
- Optional later: S3, SMTP, SMS — not required to boot the dev servers.
- **Folder name:** replace **`your-app-name`** in every command below with your real workspace folder (e.g. `nx-workspace`). Same name in `npx create…` and `cd …`.

---

## 2) Create the Nx workspace

From a parent directory (where the new folder should appear):

```bash
npx create-nx-workspace@latest your-app-name --preset=apps
cd your-app-name
```

In the wizard, choose **TypeScript** for the monorepo root. You are not required to add all apps in the wizard — you will add `web` and `api` in the next steps with generators so `project.json` and Nx targets are correct.

---

## 3) Install Nx and plugins (repository root)

Stay at the **root** of the repo (where `package.json` lives). This stack matches this project: Nx core, TypeScript/JS, Node apps, Next.js, esbuild for the API bundle, ESLint, SWC.

```bash
npm add -D nx @nx/js @nx/node @nx/next @nx/esbuild @nx/eslint @swc-node/register @swc/core typescript
```

- **`nx`** — CLI and task graph.
- **`@nx/js`** — TS/JS and shared tooling.
- **`@nx/node`** — Node/Express app generator and `serve` integration.
- **`@nx/next`** — Next.js app generator and build/serve.
- **`@nx/esbuild`** — used when the API is built with **esbuild** (faster than plain `tsc` for the server app).

The root `package.json` also uses **`"workspaces": ["apps/*"]`** so `apps/web` and `apps/api` can each have their own `package.json` and still share one `node_modules` install from the root.

---

## 4) Add the Next.js app (`apps/web`)

Generate the public/admin UI (App Router + Tailwind):

```bash
npx nx g @nx/next:app web --directory=apps/web --style=tailwind --e2eTestRunner=none
npm install
npx nx run web:serve
```

- **Dev URL:** `http://localhost:3000` (Next’s default; port can change if busy).
- **Where to work:** `apps/web/src/app` = routes and pages; `apps/web/src/components` = shared UI; `apps/web/src/services` = API calls (including `apiClient`).

**shadcn/ui (mandatory on web)** — All new user-facing UI in **`apps/web`** should use **shadcn/ui** patterns: reusable primitives under `components/ui` (Button, Dialog, Card, etc.), composed in feature components and pages. Tailwind is already the styling base the Shadcn CLI and components expect. Follow the same file layout and naming as the rest of this repo; do not document or run install steps here — that is already done in the project (or done once per machine by a lead). If you are unsure which component to use, check [shadcn/ui docs](https://ui.shadcn.com/docs) and existing pages in this codebase.

---

## 5) Add the Node/Express API (`apps/api`)

Create the API with **esbuild** as the bundler (same as this repo):

```bash
npx nx g @nx/node:app api --directory=apps/api --bundler=esbuild
```

Add server libraries to the **root** `package.json` `dependencies` (e.g. `express`, `cors`, `dotenv`, `mongoose`), then:

```bash
npm install
npx nx run @nx-workspace/api:build
npx nx run @nx-workspace/api:serve
```

- **Default URL:** `http://localhost:3333` if `PORT` is not set; override in `apps/api/.env`.
- **Project name on disk:** the `nx run` name comes from `apps/api/package.json` (here **`@nx-workspace/api`**). If your generator used another name, run `npx nx show projects` and use that in `npx nx run <name>:serve`.
- **Entry file:** `apps/api/src/main.ts` should register middleware and mount route modules under `/api/...`.

---

## 6) Environment files, `.env.example`, and `.gitignore`

### Real env files (never commit secrets)

Create these **only on your machine**; add the filenames to **`apps/api/.gitignore`** and **`apps/web/.gitignore`** (with the right patterns) so they are not pushed to Git.

| File | Purpose |
|------|---------|
| `apps/api/.env` | `PORT`, MongoDB URI, JWT secrets, SMTP, Twilio, AWS keys, etc. |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` pointing at the API in staging/production. **Local dev** often works without it because `apiClient` falls back to `http://localhost:3333` when you open the site on localhost. |
| (optional) | `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SITE_URL` for metadata and sitemap, if the app uses them. |

### `.env.example` (do commit this)

Add **template files** named **`.env.example`** next to where the real file lives, and **commit** them. They should list **every variable name** the app reads, with **fake or empty values** and short comments—**no real passwords, keys, or production URLs.**

- **`apps/api/.env.example`** — same keys as `apps/api/.env` (e.g. `PORT=`, `MONGODB_URI=`, `JWT_SECRET=`, …). New developers copy: `cp apps/api/.env.example apps/api/.env` and fill in real values.
- **`apps/web/.env.example`** (or `.env.local.example` if you prefer) — same idea for `NEXT_PUBLIC_*` keys used by the web app.

Keep examples in sync when you add a new `process.env` key in code.

### `.gitignore` (per app: `api` and `web`)

Use **`apps/api/.gitignore`** and **`apps/web/.gitignore`** to tell Git what **not** to track for that app. **Commit** these files. Split rules by app: e.g. API `dist/`, build tmp; web **`.next/`**, `out/`, and env files under the web app.

**Usually ignore (add a line when a new tool drops junk files):**

- **`node_modules/`**
- **Build / cache:** `dist/`, `.next/`, `out/`, `tmp/`, `.nx/cache/`
- **Secrets:** **`.env`**, **`.env.local`**, **`.env.*.local`**, `*.env` for real files — match the file names your app actually uses
- **OS / editor:** e.g. `.DS_Store` if it appears in that folder

**Do not** ignore: **`.env.example`**, source, `package.json`, committed docs.

**New secret or generated file?** Add a line to the **correct app’s** `.gitignore` and keep variable names in **`.env.example`** only.

---

## 7) Day-to-day: two processes

From the **repo root**, install once, then run **API and Web in two terminals** so the UI can call the backend:

```bash
npm install
# Terminal 1
npx nx run @nx-workspace/api:serve
# Terminal 2
npx nx run web:serve
```

For production-style builds, use `npx nx run web:build` and `npx nx run @nx-workspace/api:build` and run the output as your hosting expects (separate from this short intro).

---

## 8) How the web app talks to the API (end-to-end request path)

1. The browser loads the **Next.js** app (usually port **3000**).
2. **Axios** in `apps/web/src/services/apiClient.ts` is the main HTTP client. It sets `baseURL` from `NEXT_PUBLIC_API_URL` or, in dev, often **`http://localhost:3333`**.
3. The **Express** server in `apps/api` listens on **`PORT`** and exposes JSON routes under `/api/...` (e.g. `/api/auth`, `/api/user`, `/api/admin`, `/api/sitemap`).
4. **MongoDB** is connected from `apps/api` (see `config` + Mongoose `models`).
5. **API docs (Swagger):** in this project, **GET `/api-docs`** on the API host when Swagger is enabled in `main.ts`.

That is the full line from **React page → apiClient → Express route → database**.

---

## 9) Monorepo folder structure (from root to `src`)

**Flow:** workspace **root** → **`apps/api`** (backend) + **`apps/web`** (frontend) → **`docs`**.

**Git:** ignore rules for each app live in **`apps/api/.gitignore`** and **`apps/web/.gitignore`** (commit them). See **§6**.

```text
your-app-name/                          # workspace root
├── nx.json                            # Nx: plugins, cache, default targets
├── package.json                       # workspaces + shared dependencies
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc
│
├── apps/
│   ├── api/
│   │   ├── .gitignore                 # API: dist, .env, tool output — commit this file
│   │   ├── package.json               # Nx project (e.g. @nx-workspace/api)
│   │   ├── tsconfig.app.json
│   │   ├── .env                        # local only (gitignored) — use .env.example as template
│   │   ├── .env.example                # committed: variable names, no real secrets
│   │   └── src/
│   │       ├── main.ts
│   │       ├── config/                # DB, email, s3, twilio, swagger, seeders, logger
│   │       ├── routes/                # HTTP route modules
│   │       ├── controllers/           # request handlers
│   │       ├── models/                 # Mongoose
│   │       ├── middleware/            # e.g. JWT auth
│   │       ├── services/              # email, PDF, uploads, domain logic
│   │       ├── utils/                 # small helpers
│   │       └── assets/                 # static assets for dist
│   │
│   └── web/
│       ├── .gitignore                 # Web: .next, .env*, local build — commit this file
│       ├── project.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── .env.local                  # local only (gitignored)
│       ├── .env.example                # committed template for NEXT_PUBLIC_* etc.
│       ├── public/
│       └── src/
│           ├── app/                    # App Router: pages, layouts, route groups
│           ├── components/            # feature + shared UI (compose shadcn below)
│           │   └── ui/                 # shadcn/ui — mandatory primitives for web
│           ├── layout/                 # shells (e.g. admin)
│           ├── services/               # apiClient + feature services
│           ├── store/                  # client state if used
│           ├── utils/
│           └── styles/
│
└── docs/
    └── Setup-nx-repo.md                 # (or other guides — team docs)
```

#### What each folder / file is (short)

**Workspace root**

| Path | What it is |
|------|------------|
| `nx.json` | Nx workspace config: plugins, named inputs, target defaults, generators. |
| `package.json` | Root **workspaces** and shared `dependencies` / `devDependencies` for all apps. |
| `tsconfig.base.json` | Base TypeScript options every app `tsconfig` extends. |
| `eslint.config.mjs` | Root ESLint rules (flat config). |
| `.prettierrc` | Shared code formatting. |

**`apps/api`**

| Path | What it is |
|------|------------|
| `.gitignore` | Rules Git skips for the API (e.g. `dist/`, local secrets) — **commit the file**. |
| `package.json` | Nx project id (e.g. `@nx-workspace/api`) and `build` / `serve` targets. |
| `tsconfig.app.json` | TypeScript for `src/*.ts` only. |
| `.env` | **Local** secrets; **not** in Git — copy from `.env.example`. |
| `.env.example` | **Committed** list of variable names; no real values. |
| `src/main.ts` | Express bootstrap: listen, CORS, mount `/api/...` routes, DB connect. |
| `src/config/` | DB, Swagger, email/SMS, S3, optional seeders, logger. |
| `src/routes/` | Express `Router` files; group URLs by feature. |
| `src/controllers/` | Request → response: call services, return JSON/errors. |
| `src/models/` | Mongoose schemas = collections. |
| `src/middleware/` | Cross-cutting logic (e.g. JWT, logging). |
| `src/services/` | Reusable logic (email, PDF, S3) used by controllers. |
| `src/utils/` | Small helpers (hashing, status codes) with no I/O. |
| `src/assets/` | Files copied into `dist` at build. |

**`apps/web`**

| Path | What it is |
|------|------------|
| `.gitignore` | Rules for Next output and local env under web — **commit the file**. |
| `project.json` | Nx **targets** for this app: `build`, `serve`, `start`, `lint`, … |
| `next.config.js` | Next + Nx (`withNx`), images, rewrites, etc. |
| `tailwind.config.js` | Tailwind theme and content paths (used with shadcn). |
| `tsconfig.json` | TypeScript for the Next app. |
| `.env.local` | **Local** `NEXT_PUBLIC_*` overrides; **not** in Git. |
| `.env.example` | **Committed** template for public env var names. |
| `public/` | Static files served as-is (favicons, robots at root). |
| `src/app/` | **App Router**: `page.tsx`, `layout.tsx`, routes by folder. |
| `src/components/` | Feature and shared React pieces (use `ui` for shadcn primitives). |
| `src/components/ui/` | **shadcn/ui** components only — Button, Card, Dialog, … |
| `src/layout/` | Shared shells (e.g. admin header/sidebar) composed around pages. |
| `src/services/` | API calls: **`apiClient.ts`** plus one file per feature domain. |
| `src/store/` | Client state (e.g. Zustand) if the app uses global stores. |
| `src/utils/` | Web-only helpers (formatting, env-safe helpers); e.g. **`validation.ts`** for shared validation logic. |
| `src/styles/` | Global CSS / Tailwind entry. |

**`docs/`**

| Path | What it is |
|------|------------|
| `Setup-nx-repo.md` (and friends) | Onboarding and structure guides — **commit**; no secrets. |

There is no top-level `libs/` in this layout. For more detail, see **`docs/PROJECT-STRUCTURE.md`**.

---

## 10) Nx and API quick reference

**Nx**

- `npx nx graph` — visual graph of projects and how tasks depend on each other.
- `npx nx show projects` — list Nx project names (needed for `npx nx run <project>:<target>`).
- `npx nx run web:lint` / API lint if configured — run linters the same way as `serve` and `build`.

**API surface (handy for Postman or debugging)**

- Health-style checks and root metadata — see `main.ts` and `/api/health` if present.
- **Auth** — under `/api/auth/...` (see `src/routes` under `auth`).
- **Storefront + logged-in user** — often `/api/user/...`
- **Admin back office** — `/api/admin/...`
- **Swagger** — `http://<api-host>:<port>/api-docs` when enabled.

**If something fails to start:** confirm MongoDB is reachable with the same URI as in `apps/api/.env`, both terminals are using the same repo root, and no other process is using the same `PORT` or the Next default port.
