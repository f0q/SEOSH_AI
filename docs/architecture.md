# SEOSH.AI — System Architecture

> **Living Document** — Updated every time global functionality changes.  
> Last updated: 2026-04-22 · Phase: Content Planner (v0.3)

---

## Overview

SEOSH.AI is a monorepo SaaS platform that automates the full SEO workflow:  
**Keywords → Semantic Core → Content Plan → AI Generate → SEO Check → Publish → Analytics**

---

## Repository Structure

```
SEOSH_AI/
├── apps/
│   └── web/                         # Next.js 15 App Router (main app)
│       ├── src/
│       │   ├── app/                 # Routes (pages)
│       │   │   ├── (auth)/          # sign-in, sign-up, verify
│       │   │   ├── (dashboard)/     # root dashboard redirect
│       │   │   ├── analytics/       # Analytics page (shell)
│       │   │   ├── autopilot/       # Autopilot config + Content Planner
│       │   │   │   └── content-planner/  # ← Main content plan table
│       │   │   ├── billing/         # Token balance (shell)
│       │   │   ├── content/         # Content creation (shell)
│       │   │   ├── content-plan/
│       │   │   │   └── shared/[token]/   # Public shared plan view
│       │   │   ├── projects/        # Project list + onboarding wizard
│       │   │   ├── semantic-core/   # Semantic core dashboard + wizard
│       │   │   └── settings/        # Settings page (shell)
│       │   ├── components/
│       │   │   ├── layout/          # DashboardLayout, Sidebar, Navbar
│       │   │   ├── onboarding/      # Multi-step onboarding wizard steps
│       │   │   ├── semantic-core/   # SemanticCoreWizard (4-step)
│       │   │   ├── content/         # Content editor components (planned)
│       │   │   └── ui/              # Shared UI: AIModelSelector, etc.
│       │   ├── server/
│       │   │   ├── root.ts          # tRPC root router (aggregates all)
│       │   │   ├── trpc.ts          # tRPC context + auth session
│       │   │   ├── db.ts            # Shared Prisma client singleton
│       │   │   ├── services/        # Business logic services
│       │   │   │   └── lexicalGrouper.ts  # N-gram keyword clustering
│       │   │   └── routers/
│       │   │       ├── ai.ts        # AI provider config (stub)
│       │   │       ├── autopilot.ts # Autopilot config + queue
│       │   │       ├── billing.ts   # (not yet created)
│       │   │       ├── content.ts   # Save/list content items
│       │   │       ├── contentPlan.ts  # ← Content planner CRUD + sharing
│       │   │       ├── dashboard.ts # Overview stats
│       │   │       ├── projects.ts  # Project CRUD + onboarding
│       │   │       ├── publishing.ts  # (not yet created)
│       │   │       └── semanticCore.ts  # Keyword clustering + categories
│       │   ├── lib/
│       │   │   ├── auth.ts          # better-auth config
│       │   │   └── project-context.tsx  # Active project global state
│       │   └── trpc/
│       │       └── client.tsx       # tRPC React client + TanStack Query
├── packages/
│   ├── db/
│   │   └── prisma/
│   │       ├── schema.prisma        # Single source of truth for DB
│   │       └── migrations/          # Prisma migration history
│   ├── shared/                      # Shared types/utils (planned)
│   └── ui/                          # Shared UI component lib (planned)
├── services/                        # Future: separate microservices
├── docs/
│   ├── architecture.md              # ← THIS FILE
│   └── marketing.md                 # Marketing copy & feature list
└── docker-compose.yml               # PostgreSQL + Redis + MinIO
```

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript | App Router, Turbopack |
| **Styling** | Vanilla CSS + custom design system | `globals.css` with tokens |
| **API** | tRPC v11 + TanStack Query | Type-safe end-to-end |
| **Auth** | better-auth | Sessions, OAuth, email verify |
| **Database** | PostgreSQL via Prisma ORM | Single schema, full migrations |
| **Cache / Queue** | Redis (via `ioredis`) | Planned: BullMQ for jobs |
| **Storage** | MinIO (S3-compatible) | Media uploads |
| **AI** | OpenRouter (multi-model) | Configurable per task |
| **Email** | nodemailer + SMTP | Invite emails (pending impl) |
| **Package Manager** | npm workspaces + Turborepo | Monorepo build |

---

## Database Schema (Module Map)

```
User ──┬── Session / Account / Verification  (auth)
       ├── TokenBalance / TokenTransaction    (billing)
       ├── UserAIPreferences                  (ai config)
       └── Project ──┬── CompanyProfile       (onboarding)
                     ├── DataSource           (website, social)
                     ├── SitemapPage          (parsed sitemap)
                     ├── SemanticCore ──┬── LexicalGroup ── Query
                     │                 ├── Query (also top-level)
                     │                 └── Category
                     ├── ContentPlan ──┬── ContentItem ──── ContentMedia
                     │                └── ContentPlanShare  (team access)
                     └── AutopilotConfig

Global:
  AIProviderConfig    (superadmin)
  SeoToolModule       (plugin registry for text.ru, pixeltools, etc.)
  PublisherConnector  (WordPress, Tilda, Bitrix per project)
```

---

## Module Status

| Module | DB | API (tRPC) | UI | Notes |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | Sign-in/up, sessions |
| Projects | ✅ | ✅ | ✅ | Onboarding wizard |
| Semantic Core | ✅ | 🟡 | 🟡 | Steps 1-2 ✅; step 3 AI = mock; step 4 categories unassigned |
| Content Planner | ✅ | ✅ | ✅ | Table, CRUD, team sharing, keyword panel |
| Content Planner — CSV Import | ✅ | ❌ | ❌ | Schema ready, not built |
| Content Planner — AI Generate | ✅ | ❌ | 🔴 stub | Button disabled |
| Content Planner — SEO Check | ✅ (SeoToolModule) | ❌ | ❌ | Pixeltools/text.ru API not wired |
| Content Planner — Spam Score | — | ❌ | 🔴 stub | Button disabled |
| Autopilot Config | ✅ | ✅ | 🟡 | Config saves; queue is mock |
| Autopilot Queue | ✅ | 🟡 | 🔴 mock | `getQueue` exists, UI uses MOCK_QUEUE |
| WordPress Publish | ✅ (PublisherConnector) | ❌ | ❌ | Connector model only |
| Telegram Approval | ✅ (AutopilotConfig) | ❌ | ❌ | Config form only |
| Billing | ✅ | ❌ | 🔴 static | Hardcoded "200 tokens" |
| Analytics | — | ❌ | 🔴 shell | Page exists, no data |
| Settings | — | ❌ | 🔴 shell | Page exists, no functionality |
| Email (invites) | ✅ | 🟡 | ✅ | Logs to console, not sent |

---

## Data Flow: Content Planner (Current)

```
User → Content Planner page
         │
         ├─ getByProject (tRPC) ──► ContentPlan.items (Prisma)
         ├─ getKeywordsByProject ──► SemanticCore.queries (Prisma)
         ├─ createItem ────────────► ContentItem.create
         ├─ updateItem ────────────► ContentItem.update
         ├─ deleteItem ────────────► ContentItem.delete
         ├─ inviteTeamMember ──────► ContentPlanShare.create + log to console
         └─ getSharedPlan (public) ► ContentPlanShare.accessToken lookup
```

## Data Flow: Content Planner (Planned)

```
User → Content Planner page
         │
         ├─ importCsv ─────────────► Parse CSV → ContentItem.createMany
         │
         ├─ generateContent (AI) ──► Build prompt from ContentItem fields
         │                           → OpenRouter API call (streaming)
         │                           → Save to ContentItem.markdownBody
         │                           → Deduct tokens from TokenBalance
         │
         ├─ checkSeoReadiness ─────► Send text to:
         │   (per ContentItem)        ├── text.ru API → uniqueness %
         │                            ├── Pixeltools API → spam score, SEO score
         │                            └── Save to ContentItem.seoScore / seoAnalysis
         │
         └─ inviteTeamMember ──────► ContentPlanShare.create
                                      → nodemailer → real email with link + temp password
```

---

## SEO Tool Integration Architecture

The `SeoToolModule` model acts as a **plugin registry**. Each tool is a module with:
- `slug`: unique identifier (`"textru"`, `"pixeltools"`)
- `apiKeyField`: env var name storing the API key
- `inputFormat` / `outputFormat`: schema of what it needs and returns

**Planned flow for a check:**
```
ContentItem → seoTools.runCheck({ itemId, tools: ["textru", "pixeltools"] })
                → For each enabled tool:
                    Load config from SeoToolModule + env key
                    → Call tool API
                    → Normalize result to common schema
                    → Merge into ContentItem.seoAnalysis (JSON)
                    → Update ContentItem.seoScore, uniqueness
```

**Tool APIs:**
- **text.ru** — uniqueness checking, keyword density
- **Pixeltools** — spam analysis, SEO readiness score
- *(future)* Advego, Copyscape, Surfer SEO

---

## Authentication Flow

```
Browser → /api/auth/* (better-auth handlers)
             └── Session token in cookie
                   └── tRPC context reads session
                         └── ctx.user available in all protectedProcedures
```

## Team Sharing Flow (Content Plan)

```
Admin → Invite modal → inviteTeamMember tRPC
           ├── Creates ContentPlanShare { email, accessToken, tempPassword, status: PENDING }
           ├── Logs invite URL + temp password (dev) / sends email (prod)
           └── Returns inviteUrl

Invitee → /content-plan/shared/{accessToken}
           ├── getSharedPlan (public tRPC) → validates token, returns plan
           ├── acceptShare → status: ACTIVE, tempPassword: null
           └── Read-only table view
```

---

## Key Environment Variables

| Variable | Purpose | Used In |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | Prisma |
| `REDIS_URL` | Redis connection | Cache / BullMQ |
| `AUTH_SECRET` | better-auth signing key | Auth |
| `OPENROUTER_API_KEY` | AI calls | semanticCore, contentPlan (planned) |
| `TEXTRU_API_KEY` | Uniqueness checking | seoTools (planned) |
| `PIXELTOOLS_API_KEY` | Spam/SEO score API | seoTools (planned) |
| `SMTP_HOST/PORT/USER/PASS` | Email sending | contentPlan invites (planned) |
| `TELEGRAM_BOT_TOKEN` | Autopilot approvals | autopilot (planned) |
| `NEXT_PUBLIC_APP_URL` | Invite URLs, callbacks | contentPlan, auth |

---

## Naming & Code Conventions

- **tRPC routers**: one file per domain in `src/server/routers/`
- **Pages**: Next.js App Router, co-located with their route (`page.tsx`)
- **DB**: always use the shared `prisma` singleton from `src/server/db.ts` — never create `new PrismaClient()`
- **Auth guard**: use `protectedProcedure` for all user-facing endpoints, `publicProcedure` only for shared plan access
- **Tokens**: deduct from `TokenBalance` in the same DB transaction as the AI call result save
- **Migrations**: always run `npx prisma migrate dev` after schema changes, never edit migration files manually

---

## Content Planner — Column Reference (Excel → DB)

| Excel Column | DB Field | Type | Notes |
|---|---|---|---|
| URL страницы | `url` | String? | Target page URL |
| Раздел | `section` | String? | Site section/category |
| Тип страницы | `pageType` | String? | homepage, blog_post, etc. |
| Приоритет | `priority` | Int (1-5) | 1=highest, red |
| Статус | `status` | ContentStatus enum | 12 statuses |
| Title | `metaTitle` | String? | SEO title |
| Длина title | `titleLength` | Int? | Auto-computed |
| Meta Description | `metaDesc` | Text? | SEO description |
| Длина meta desc | `metaDescLength` | Int? | Auto-computed |
| H1 | `h1` | String? | Page heading |
| Целевой объём | `targetWordCount` | Int? | Target word count |
| H2 (1-4) | `h2Headings` | String[] | Pipe-separated in UI |
| Ключевые слова | `targetKeywords` | String[] | Comma-separated in UI |
| Schema | `schemaType` | String? | Schema.org type |
| Внутренние ссылки | `internalLinks` | Text? | Comma-separated URLs |
| Примечания | `notes` | Text? | Free-form notes |
| Body | `markdownBody` | Text? | AI-generated content |
| SEO Score | `seoScore` | Int? | 0-100 from SEO tools |
| Uniqueness | `uniqueness` | Float? | 0-100% from text.ru |
| SEO Analysis | `seoAnalysis` | Json? | Full tool output |

---

*This file is maintained by the AI assistant. Update it whenever:*  
*• A new tRPC router is created*  
*• A new page/route is added*  
*• The Prisma schema changes*  
*• A new external API integration is added*
