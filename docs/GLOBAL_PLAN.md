# SEOSH.AI — Global Plan & Session History

> **Living document** — Single source of truth for project status, roadmap, and session history.  
> Created: 2026-04-23 · Compiled from all recovered session files + conversation artifacts.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [What Has Been Built (Complete History)](#what-has-been-built)
3. [Current Module Status](#current-module-status)
4. [Open Issues & Bugs](#open-issues--bugs)
5. [Tech Debt](#tech-debt)
6. [Roadmap — What To Build Next](#roadmap)
7. [Semantic Core → Content Planner Integration Spec](#semantic-core--content-planner-integration-spec)
8. [Session History (Phases 1–7)](#session-history)
9. [Key File Reference](#key-file-reference)

---

## 🔬 Verified Application State (2026-04-23)

> Browser-tested every page. This is the **ground truth** — use this to identify discrepancies with the plan.

### Sidebar Navigation (Expanded)
- ✅ **SEOSH.AI** logo
- ✅ **Active Project** switcher — shows "Test SEO Company" + domain, dropdown works
- ✅ **Dashboard** — link works
- ✅ **Projects** — link works
- ✅ **Autopilot** — link works
- ✅ **Autopilot Readiness** — 33% bar (red), says "Add a semantic core"
- ✅ **Tokens** — shows "200" with "Free" badge
- ✅ **Settings** — link works
- ✅ **Billing** — link works
- ✅ **Semantic Core, Content, Analytics** — present in nav (lines 47-49 of Sidebar.tsx). They scroll below the fold on short viewports due to large bottom section (Autopilot + Readiness + Tokens + Settings + Billing). Not a bug, but UX can be improved.

### Header
- ✅ Search bar — present
- ✅ Language switcher (EN/RU) — dropdown works
- ✅ Notification bell — dropdown works
- ✅ User avatar/menu — dropdown works (sign out, etc.)

### Page-by-Page Test Results

| Page | URL | Status | What Shows |
|---|---|---|---|
| **Dashboard** | `/` | ✅ Working | Welcome message, stats cards (Projects: 1, Keywords: 0, Cores: 0, Content: 0), "Smart Start" button |
| **Projects** | `/projects` | ✅ Working | Project card grid with "Test SEO Company" (status: Onboarding), "New Project" button |
| **Onboarding Wizard** | `/projects` (new) | ✅ Working | 5-step wizard: Data Sources → Company → (3 more). "My Own Domain" vs competitor toggle. "Analyze Site" button works |
| **Semantic Core List** | `/semantic-core` | ✅ Working | Empty state: "No Semantic Cores Yet", "Create First Core" button |
| **Semantic Core Wizard** | `/semantic-core/new` | ✅ Working | Multi-step wizard. Step 1: "Sitemap Analysis" with Your Website (optional) + Competitor Websites (required) + project dropdown |
| **Content Manager** | `/content` | ✅ Working | Content Planner card link + empty state "No content yet" + "Create First Article" button |
| **Autopilot Config** | `/autopilot` | ✅ Working | Status: "Paused". Publishing Schedule (Daily/Weekly), Auto-Approve toggle, WordPress integration section |
| **Content Planner** | `/autopilot/content-planner` | ✅ Working | Shows "0 pages planned", "Create with AI" (Coming soon), "Spam Check" (Coming soon), **"Start Planning Content"** button works |
| **Ideation Modal** | (inside Content Planner) | ✅ Working | "Content Ideation & Planning" modal opens. Has tabs: Topic Analysis, Competitor RSS, Neural Network. Model selector (Gemini 2.0 Flash), topic input, "Random from Core" button, "Propose Ideas" button |
| **Billing** | `/billing` | 🟡 Shell | "Billing & Tokens" header, Balance: 200 tokens, Free Plan, Token Usage Guide — all **hardcoded/static** |
| **Settings** | `/settings` | 🟡 Shell | Sections: AI Models, Language, Notifications, Security — **no functional settings**, just cards |
| **Analytics** | `/analytics` | 🟡 Shell | "Analytics coming soon" placeholder |

### Key Discrepancies Found vs GLOBAL_PLAN

1. **Sidebar nav items scroll below fold** — Semantic Core, Content, Analytics ARE present as text links but get pushed below visible area on short viewports by the large bottom section. UX improvement needed.
2. **"Create with AI" and "Spam Check"** — Both show "Coming soon" labels (confirming they're not built yet, matching the plan)
3. **Ideation Modal is fully functional** — Confirms Phase 4-7 work is live. Has tabs (Topic Analysis, Competitor RSS, Neural Network), model selector, propose ideas, etc.
4. **Autopilot config UI exists** — WordPress settings section visible, schedule selectors present, auto-approve toggle works. Queue data appears to be mock.
5. **No Telegram bot section visible** in Autopilot page (plan says config form should exist)

---

## Project Overview

SEOSH.AI is a monorepo SaaS platform that automates the full SEO workflow:  
**Keywords → Semantic Core → Content Plan → AI Generate → SEO Check → Publish → Analytics**

**Tech Stack:** Next.js 15, React 19, TypeScript, tRPC v11, PostgreSQL (Prisma), Redis, MinIO, better-auth, OpenRouter (multi-model AI), Turborepo monorepo.

**Full architecture details:** See `docs/architecture.md`

---

## What Has Been Built

### Phase 1 — Foundation (Session `ef7c1540`)
Everything marked ✅ was completed:

- [x] **Auth system** — Sign-in/up, sessions, email verify (better-auth)
- [x] **Projects CRUD** — Create, list, delete with CompanyProfile onboarding
- [x] **Domain-first onboarding wizard** — "My Domain" vs "Competitor" toggle, AI fill button
- [x] **Semantic Core Dashboard** — List view at `/semantic-core` with project links, keyword counts
- [x] **Semantic Core Detail View** — `/semantic-core/[id]` with categories + keyword grid
- [x] **N-gram NLP Logic** — `lexicalGrouper.ts` for keyword clustering
- [x] **Semantic Core Merging** — Backend done, UI had bugs (deferred)
- [x] **Dashboard Cache Invalidation** — tRPC + router.refresh

### Phase 2 — Visual Polish & Content Plan Integration (Session `f22ead45`, revision 1–3)
- [x] **Category Color Consistency** — `getCatColor` shared utility for Steps 3+4
- [x] **Content Plan bridge** — `generateFromSemanticCore` mutation + UI in Step 4
- [x] **Content Planner table** — CRUD, team sharing, keyword panel, auto-fill from taxonomy

### Phase 3 — Bug Fixes & UI Enhancements (Session `f22ead45`, revision 4–5)
- [x] **Project Editing** — `projects.update` mutation + edit modal
- [x] **Semantic Core Project Assignment** — Filter out already-assigned projects
- [x] **Keyword Filtering by Category** — Click sidebar category → filters table
- [x] **Category naming** — Renamed "AI Categories" → "Categories"
- [x] **Multicolored categories** — `getCatColor` applied to detail view
- [x] **Content Planner button** — Duplicated to `/content` page

### Phase 4 — Interactive Content Ideation (Session `f22ead45`, revision 6–7)
- [x] **Ideation Dashboard modal** — "Start Planning Content" opens a large modal
- [x] **Manual Topic Entry** — Input field + "Propose Ideas" with AI
- [x] **Random Topic from Semantic Core** — Pulls unassigned keyword cluster
- [x] **Competitor RSS Analysis** — Stub UI + AI analysis of pasted feed URLs
- [x] **Neural Network Chat** — Q&A brainstorm interface within the modal
- [x] **Centralized AI service** — `apps/web/src/server/services/ai.ts`
- [x] **Real AI wiring** — `proposeIdeas`, `chat`, `analyzeRss` endpoints connected to OpenRouter

### Phase 5 — Deep SEO Ideation & Polish (Session `f22ead45`, revision 8)
- [x] **UI layout tweaks** — "Random from Core" moved under topic input, "Proposed Structure" renamed to "Content Strategy Ideas"
- [x] **AI Model selectors** — `AIModelSelector` on Propose Ideas, Flesh out SEO, Neural Network, RSS tabs
- [x] **Checkboxes on ideas** — Select which ideas to flesh out or save
- [x] **Duplicate warnings** — Cross-reference against existing Content Plan titles, show `! Duplicate` badge
- [x] **"Flesh out SEO details"** — New `fleshOutIdeas` endpoint: generates url, pageType, metaDesc, h1, h2Headings, targetKeywords
- [x] **Smart saving** — Only ticked items saved, enriched fields piped to DB

### Phase 6 — Tags, Duplicate Warnings, Schema Enhancements (Session `f22ead45`, revision 9)
- [x] **Tags feature** — `tags String[]` added to `ContentItem` schema + migration
- [x] **Manual row duplicate warning** — Typing duplicate title in Content Planner table shows `! Duplicate` in-cell
- [x] **AI Model Selector clipping fix** — Portal-based dropdown, CSS overflow fixes
- [x] **Tags in fleshOutIdeas** — AI generates 3-5 tags per idea, saved to plan
- [x] **Site Architecture tree** — Proposed design (not yet built)

### Phase 7 — AI Context & Final Fixes (Session `f22ead45`, final)
- [x] **AI Generation context** — Both `proposeIdeas` and `fleshOutIdeas` now fetch project's existing categories, tags, page types from DB and inject into AI prompt
- [x] **Model Selector bug** — Ripped out Portal/scroll logic, replaced with CSS `fixed` positioning
- [x] **TypeScript verified** — `npx tsc --noEmit` passing
- [x] **Pushed to GitHub**

### Onboarding Session Fixes (Session export `_session_export/`)
- [x] **Header dropdowns** — Language, Notifications, User menu all working with click-outside-close
- [x] **Account panel opacity** — `.dropdown-panel` CSS class with opaque background
- [x] **URL validation** — `https://` prefix, Zod schema relaxed
- [x] **"Back to Dashboard" label** — Changed to "Back to Semantic Cores"
- [x] **Autopilot Readiness Bar** — In sidebar, 0-100% with color shifts
- [x] **ProjectContext** — Global active project state in `localStorage`
- [x] **Project Switcher** — In sidebar below logo, shows name + domain
- [x] **Projects page** — Now fetches real data, card grid with active project highlight
- [x] **"View all" notifications** — Navigates to dashboard

---

## Current Module Status

| Module | DB | API (tRPC) | UI | Status |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | **Done** |
| Projects + Onboarding | ✅ | ✅ | ✅ | **Done** — wizard, edit, project context |
| Semantic Core — Wizard Steps 1-2 | ✅ | ✅ | ✅ | **Done** — upload, N-gram grouping |
| Semantic Core — Step 3 AI Classify | ✅ | ✅ | ✅ | **Done** — generateCategories + categorizeQueriesBatch fully wired to OpenRouter |
| Semantic Core — Step 4 Results | ✅ | ✅ | ✅ | **Done** — shows results, has "Generate Plan" |
| Semantic Core → Content Plan Bridge | ✅ | ✅ | ✅ | **Done** — `generateFromSemanticCore` |
| Semantic Core — Dashboard & Detail View | ✅ | ✅ | ✅ | **Done** — list, detail, category colors |
| Semantic Core — Merging | ✅ | 🟡 | 🔴 | **Backend done, UI buggy** |
| Content Planner — Table CRUD | ✅ | ✅ | ✅ | **Done** — full table, sharing, keyword panel |
| Content Planner — Ideation Modal | ✅ | ✅ | ✅ | **Done** — topic, RSS, neural network, propose, flesh out, duplicate check, tags |
| Content Planner — AI Context | ✅ | ✅ | ✅ | **Done** — project categories/tags injected into prompts |
| Content Planner — CSV Import | ✅ | ✅ | ✅ | **Done** — drag-drop modal, EN+RU headers, preview |
| Content Planner — AI Content Generation | ✅ | ❌ | 🔴 | **Not built** — button stub only |
| Content Planner — SEO Check | ✅ | ❌ | ❌ | **Not built** — text.ru/Pixeltools not wired |
| Autopilot Config | ✅ | ✅ | 🟡 | **Partial** — config saves, queue is mock |
| Autopilot Queue | ✅ | 🟡 | 🔴 | **Mock** — `getQueue` exists, UI uses MOCK_QUEUE |
| WordPress Publishing | ✅ | ❌ | ❌ | **Not built** — model only |
| Telegram Bot | ✅ | ❌ | ❌ | **Not built** — config form only |
| Billing | ✅ | ❌ | 🔴 | **Shell** — hardcoded "200 tokens" |
| Analytics | — | ❌ | 🔴 | **Shell** — page exists, no data |
| Settings | — | ❌ | 🔴 | **Shell** — page exists, no functionality |
| Email (invites) | ✅ | 🟡 | ✅ | **Stub** — logs to console |
| Dashboard | ✅ | ✅ | 🟡 | **Partial** — real counts, no charts |

---

## Open Issues & Bugs

### Critical (Blocking user flow)

| # | Issue | Status | Notes |
|---|---|---|---|
| ~~1~~ | ~~Semantic Core Step 3 AI is a mock~~ | ✅ Fixed | **RESOLVED** — `generateCategories` + `categorizeQueriesBatch` fully wired to OpenRouter. Only `approveCategories.jobId` is a stub (non-blocking). |
| 2 | AI "Suggest with AI" button on **target audience** doesn't work | ❌ Open | Needs AI endpoint |
| 3 | Semantic Core steps **UX needs redesign** | ❌ Open | User is "not satisfied" — awaiting spec |
| 4 | Content editor needs **project connection** — select project, suggest content from semantic core keywords | ❌ Open | Architecture needed |

### Important (UX/Polish)

| # | Issue | Status | Notes |
|---|---|---|---|
| 5 | AI Model selector needed on **every AI button** — each position should remember selected model | ❌ Open | Partially done (Ideation has it), onboarding doesn't |
| 6 | Semantic Core merging — **1 main core chosen by user** | ❌ Open | Backend exists, UI buggy |
| 7 | Fields design after **"choosing project"** needs fixing | ❌ Open | CSS/layout issue |
| 8 | Site Architecture tree view | ❌ Open | Proposed in Phase 6, not built |

### Fixed (This history)

| # | Issue | Fixed In |
|---|---|---|
| ✅ | Header dropdowns (account, notifications, language) not opening | Onboarding session |
| ✅ | Account panel too transparent | Onboarding session |
| ✅ | URL validation `Invalid URL` error | Onboarding session |
| ✅ | "Back to Dashboard" label wrong | Onboarding session |
| ✅ | Projects page was static (no DB fetch) | Onboarding session |
| ✅ | No active project concept | Onboarding session |
| ✅ | AI Model Selector dropdown getting clipped | Phase 6, Phase 7 |
| ✅ | AI ideation was "flying blind" (no project context) | Phase 7 |
| ✅ | Category colors inconsistent | Phase 2 |

---

## Tech Debt

| Issue | Impact | Fix |
|---|---|---|
| `autopilot.ts` creates its own `PrismaClient` | Memory leak in dev | Replace with shared `prisma` from `db.ts` |
| `tempPassword` stored as plain text in `ContentPlanShare` | Security risk in prod | Add `bcrypt` hash before storing |
| `semanticCore.mergeCores` has TS errors (lines 307–359) | Build warnings | Fix field names (`query` → `text`, `normalized` → `normalizedText`) |
| All `ai.ts` router procedures are TODO stubs | AI features broken | Implement with actual DB reads |
| Autopilot queue uses mock array, not real DB | Misleading UI | Wire to `getQueue` query |
| Section model doesn't exist | Free-text → inconsistencies | Consider project-level `Section` lookup table |
| Page Type taxonomy not in DB | Hardcoded only | Either `PageTypeTemplate` model or keep in `shared/` |
| Schema ↔ Page Type default mapping | Missing auto-fill | Simple lookup on pageType change |
| Title/MetaDesc length validation | No color-coded warnings | Already fields in DB, UI needs badges |

---

## Roadmap

### 🔴 TIER 1 — Core User Flow (Must work for first real use)

#### ~~1.1 · Semantic Core — Make Step 3 AI Actually Work~~ ✅ DONE
**Verified 2026-04-23:** `generateCategories`, `categorizeQueries`, `categorizeQueriesBatch`, `compressCategories`, `refineCategory` — all fully wired to OpenRouter. Export CSV works. Only `approveCategories.jobId` is a stub (cosmetic).


#### ~~1.2 · Content Planner — CSV Import~~ ✅ DONE
**Completed 2026-04-23:** Full CSV import with drag-and-drop modal, file preview, flexible header mapping (EN+RU), semicolon/comma delimiter support. Added `importCsv` tRPC mutation + `CsvImportModal` component with success feedback.


#### 1.3 · Content Generation ("Create with AI")
**Current:** Button disabled.

**Build:**
- Select rows → "Create with AI" → build prompt from row fields
- Stream Markdown into `markdownBody`
- Status: `IN_PROGRESS` → `GENERATING` → `GENERATED`
- Deduct tokens from `TokenBalance`

**Files:** `contentPlan.ts`, `content-planner/page.tsx`, AI service  
**Effort:** ~4h

#### 1.4 · Team Invite — Real Email
**Current:** Logs to console.

**Build:**
- `nodemailer` + SMTP env vars → branded HTML email
- `bcrypt` hash temp password

**Files:** `contentPlan.ts`, new `lib/email.ts`  
**Effort:** ~1h

---

### 🟡 TIER 2 — Platform Completion (Makes it a real SaaS)

#### 2.1 · Autopilot — Wire Up Real Queue
- Read config from DB, save settings back
- Real queue from `getQueue`, approve/reject buttons
- **Effort:** ~3h

#### 2.2 · WordPress Publishing
- Settings: WordPress URL + Application Password
- `publishItem` mutation → POST to `wp-json/wp/v2/posts`
- Update `ContentItem.status = PUBLISHED`
- **Effort:** ~4h

#### 2.3 · Telegram Bot
- Send preview when item ready for review
- Webhook at `/api/telegram/webhook` → inline approve/reject
- **Effort:** ~4h

#### 2.4 · Real Billing Balance
- `billing.getBalance` tRPC query
- Transaction history from `TokenTransaction`
- Server-side token deduction on AI ops
- **Effort:** ~2h

#### 2.5 · Keyword → Page Assignment
- Step 4: clickable "Page" column, `updatePage` mutation
- "Auto-assign" button by keyword overlap
- **Effort:** ~1h

---

### 🟢 TIER 3 — Polish & Growth

- **3.1** Dashboard — Real activity feed & 30-day charts
- **3.2** Spam Score / SEO Analysis — text.ru, readability, inline in table
- **3.3** Blog Topics Suggestion — AI suggests from semantic core keywords
- **3.4** Analytics Page — Google Search Console integration
- **3.5** Settings Page — Profile, AI prefs, notifications, danger zone
- **3.6** Content Plan Shared Access — Password-check gate
- **3.7** Site Architecture Tree View — Visual tree from sections/URLs

---

### Recommended Execution Order

```
Phase A (immediate):
  1.1  → Semantic Core real AI Classify   (~3h)   ← blocks everything
  1.4  → Real Email Invites               (~1h)
  1.3  → Content Generation AI            (~4h)
  1.2  → CSV Import                       (~2h)

Phase B (next):
  2.4  → Real Billing Balance             (~2h)
  2.1  → Autopilot Real Queue             (~3h)
  2.2  → WordPress Connector              (~4h)
  2.5  → Keyword → Page assignment        (~1h)

Phase C (later):
  2.3  → Telegram Bot
  3.x  → Polish items in priority order
```

---

## Semantic Core → Content Planner Integration Spec

### The Three Key Concepts

| Concept | DB Field | Purpose |
|---|---|---|
| **Section** (Раздел) | `ContentItem.section` | _Where_ does this page live in site navigation? |
| **Page Type** (Тип страницы) | `ContentItem.pageType` | _What_ does this page do? What template? |
| **Schema** (Schema.org) | `ContentItem.schemaType` | _What do we tell Google_ via JSON-LD? |

### Page Type Taxonomy

Defined in `packages/shared/seo/pageTypes.ts`:

| Slug | Default Schema | Word Count | Default Priority |
|---|---|---|---|
| `homepage` | `LocalBusiness` | 2500 | 1 |
| `service_listing` | `Service` | 2000 | 2 |
| `service_detail` | `Service` | 3000 | 1 |
| `product_listing` | `ItemList` | 2000 | 2 |
| `product_detail` | `Product` | 2000 | 2 |
| `landing_page` | `Service` | 3000 | 1 |
| `blog_listing` | `Blog` | 500 | 3 |
| `blog_post` | `Article` | 1200 | 4 |
| `promo_listing` | `OfferCatalog` | 500 | 5 |
| `promo_detail` | `Offer` | 1000 | 5 |
| `info_page` | `WebPage` | 1500 | 3 |

### Content Validation Rules

| Field | Rule | Green | Yellow | Red |
|---|---|---|---|---|
| Title length | 50–65 chars ideal | 50-65 | 40-50 or 65-70 | <40 or >70 |
| Meta Desc length | 140–160 chars | 140-160 | 120-140 or 160-180 | <120 or >180 |
| Uniqueness | ≥90% to publish | ≥90 | 80-89 | <80 |
| Spam/keyword density | ≤8% | ≤5 | 5-8 | >8 |
| Naturalness | ≥80% human | ≥85 | 65-84 | <65 |

### Bridge Mutation Design

```
semanticCore.generateContentPlan({ semanticCoreId, projectId })

Steps:
1. Read all categorized queries from semantic core
2. Group queries by assigned page (or by category)
3. For each group:
   a. section from category → section mapping
   b. pageType from category → type mapping
   c. schemaType from pageType → schema lookup
   d. targetWordCount from pageType defaults
   e. priority from page type (services=1, listings=2, info=3, blog=4, promo=5)
   f. targetKeywords = all queries in group
   g. metaTitle, h1 = representative query basis
4. Batch insert ContentItem rows
5. Return: { created, sections, pageTypes }
```

---

## Session History

| Phase | Session ID | Title | Key Deliverables |
|---|---|---|---|
| 1 | `ef7c1540` | Foundation | Auth, Projects, Onboarding Wizard, Semantic Core Dashboard/Detail, N-gram Grouping, Merging backend, Cache invalidation |
| 2 | `f22ead45` rev 1-3 | Content Plan Integration | Category colors, Content Plan bridge mutation, Planner table |
| 3 | `f22ead45` rev 4-5 | Bug Fixes & UI | Project editing, SC project assignment, keyword filtering, category naming/colors, Content Planner button duplication |
| 4 | `f22ead45` rev 6-7 | Interactive Ideation | Ideation modal, manual topic, random from SC, RSS, neural network chat, centralized AI service, real AI wiring |
| 5 | `f22ead45` rev 8 | Deep SEO Ideation | Model selectors, checkboxes, duplicate warnings, "Flesh out SEO" endpoint, smart saving |
| 6 | `f22ead45` rev 9 | Tags & Schema | Tags field + migration, manual duplicate warning, model selector portal fix, site architecture proposal |
| 7 | `f22ead45` final | AI Context Fix | Project context injection into AI prompts, model selector CSS fix, TypeScript verified, pushed to GitHub |
| — | Onboarding export | UI Fixes | Header dropdowns, project context, project switcher, autopilot readiness bar, URL validation, projects page real data |

---

## Key File Reference

### Documentation
- `docs/architecture.md` — System architecture (living doc)
- `docs/marketing.md` — Marketing copy & features
- `docs/GLOBAL_PLAN.md` — **This file**
- `.agents/rules/architecture-md.md` — Rule: update architecture.md on global changes

### Reference Data
- `_temp/index.html` — Client SEO plan for fackturaf.com
- `_temp/content_plan_fackturaf.xlsx` — Real Excel content plan reference
- `_temp/nav_guide.html` — Navigation guide reference
- `_temp/templates_viewer.html` — Templates reference

### Session Files
- `_session_export/Finalizing SEOSH AI Onboarding.md` — Full chat export
- `_lost session files/` — Recovered session artifacts (task/plan/walkthrough revisions, screenshots)

### Key Source Files
- `apps/web/src/server/routers/semanticCore.ts` — Semantic Core router
- `apps/web/src/server/routers/contentPlan.ts` — Content Planner router (incl. ideation)
- `apps/web/src/server/services/ai.ts` — Centralized AI service
- `apps/web/src/components/semantic-core/SemanticCoreWizard.tsx` — 4-step wizard
- `apps/web/src/lib/project-context.tsx` — Active project global state
- `packages/shared/seo/pageTypes.ts` — Page type taxonomy
- `packages/db/prisma/schema.prisma` — Database schema

---

*This file is version-controlled in the project repo. Update it whenever phases are completed or new issues are discovered.*
