# SEOSH.AI — Global Plan & Session History

> **Living document** — Single source of truth for project status, roadmap, and session history.  
> Created: 2026-04-23 · Last Updated: 2026-04-24

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Module Status](#current-module-status)
3. [Open Issues & Bugs](#open-issues--bugs)
4. [Tech Debt](#tech-debt)
5. [Roadmap — What To Build Next](#roadmap)
6. [Semantic Core → Content Planner Integration Spec](#semantic-core--content-planner-integration-spec)
7. [Session History (Phases 1–8)](#session-history)
8. [Key File Reference](#key-file-reference)

---

## Project Overview

SEOSH.AI is a monorepo SaaS platform that automates the full SEO workflow:  
**Keywords → Semantic Core → Content Plan → AI Generate → SEO Check → Publish → Analytics**

**Tech Stack:** Next.js 16, React 19, TypeScript, tRPC v11, PostgreSQL (Prisma), Redis, MinIO, better-auth, OpenRouter (multi-model AI), Turborepo monorepo.

**Full architecture details:** See `docs/architecture.md`

---

## Current Module Status

| Module | DB | API (tRPC) | UI | Status |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | **Done** |
| Projects + Onboarding | ✅ | ✅ | ✅ | **Done** — wizard, edit, project context, site structure step |
| Project Settings | ✅ | ✅ | ✅ | **Done** — read-only settings, competitors, RSS feeds, semantic core link, site structure tree, danger zone |
| Semantic Core — Wizard Steps 1-2 | ✅ | ✅ | ✅ | **Done** — upload, N-gram grouping |
| Semantic Core — Step 3 AI Classify | ✅ | ✅ | ✅ | **Done** — generateCategories + categorizeQueriesBatch via OpenRouter |
| Semantic Core — Step 4 Results | ✅ | ✅ | ✅ | **Done** — shows results, has "Generate Plan" |
| Semantic Core → Content Plan Bridge | ✅ | ✅ | ✅ | **Done** — `generateFromSemanticCore` |
| Semantic Core — Dashboard & Detail View | ✅ | ✅ | ✅ | **Done** — list, detail, category colors, filtering |
| Semantic Core — Merging | ✅ | 🟡 | 🔴 | **Backend done, UI buggy** |
| Content Planner — Table CRUD | ✅ | ✅ | ✅ | **Done** — full table, sharing, keyword panel, tags column, duplicate warnings |
| Content Planner — Ideation Modal | ✅ | ✅ | ✅ | **Done** — topic, RSS, neural network, propose, flesh out, duplicate check, tags |
| Content Planner — AI Context | ✅ | ✅ | 🟡 | **Partial** — project categories/tags injected into AI prompts; needs page types, schema types, domain-based URLs |
| Content Planner — CSV Import | ✅ | ✅ | ✅ | **Done** — drag-drop modal, EN+RU headers, preview |
| Content Manager — List View | ✅ | ✅ | ✅ | **Done** — `/content` with status filters, search, card grid |
| Content Editor — `/content/[id]` | ✅ | ✅ | ✅ | **Done** — markdown editor, preview/edit tabs, Generate/Analyze/Optimize/Save buttons, SEO analysis sidebar |
| Content Generation (AI) | ✅ | ✅ | ✅ | **Done** — `generateContent`, `regenerateContent` mutations + UI |
| Content SEO Analysis | ✅ | ✅ | ✅ | **Done** — `analyzeContent` mutation + SEO sidebar (uniqueness, naturalness, E-E-A-T, readability, spam, water scores + recommendations) |
| Autopilot Config | ✅ | ✅ | 🟡 | **Partial** — config saves, queue is mock |
| Autopilot Queue | ✅ | 🟡 | 🔴 | **Mock** — `getQueue` exists, UI uses MOCK_QUEUE |
| WordPress Publishing | ✅ | ❌ | ❌ | **Not built** — model only |
| Telegram Bot | ✅ | ❌ | ❌ | **Not built** — config form only |
| Billing | ✅ | ❌ | 🔴 | **Shell** — hardcoded "200 tokens" |
| Analytics | — | ❌ | 🔴 | **Shell** — page exists, no data |
| Settings | — | ❌ | 🔴 | **Shell** — page exists, no functionality |
| Email (invites) | ✅ | 🟡 | ✅ | **Stub** — logs to console |
| Dashboard | ✅ | ✅ | 🟡 | **Partial** — real counts, no charts |
| Site Structure (Onboarding) | ✅ | ✅ | ✅ | **Done** — AI structure generation step in onboarding wizard, tree view in project settings |
| SEO Analysis Service | ✅ | ✅ | ✅ | **Done** — `seoAnalysis.ts` service with uniqueness, naturalness, E-E-A-T, readability, spam, water scores |

---

## Open Issues & Bugs

### Critical (Blocking user flow)

| # | Issue | Status | Notes |
|---|---|---|---|
| 1 | Content Ideation — AI invents page types/schemas instead of selecting from project data | ❌ Open | `proposeIdeas` prompt was updated to include `pageType` and `schemaType` but the UI (IdeationModal) doesn't display or pass these fields properly |
| 2 | Content Ideation — "Flesh out" button still named "Generate SEO" | ❌ Open | User wants "Flesh out" or similar. Button was renamed but user wasn't satisfied |
| 3 | Content Ideation — AI-generated URLs should use target domain/category/slug, not /autopilot/ | ❌ Open | Backend was updated to pass `domain` but UI doesn't use it |
| 4 | Content Ideation — Deep SEO Generation block should appear ABOVE the ideas list | ❌ Open | Currently appears below the list |
| 5 | AI Model Selector — clicking still doesn't open dropdown reliably | 🟡 Partial | Portal was replaced with fixed positioning; scroll listener removed. May need further testing |

### Important (UX/Polish)

| # | Issue | Status | Notes |
|---|---|---|---|
| 6 | AI "Suggest with AI" button on **target audience** doesn't work | ❌ Open | Needs AI endpoint |
| 7 | Semantic Core merging — **1 main core chosen by user** | ❌ Open | Backend exists, UI buggy |
| 8 | Site Architecture tree view (editable) | 🟡 Partial | Read-only view exists in project settings; onboarding step generates mock structure |
| 9 | Sidebar nav items scroll below fold on short viewports | ❌ Open | UX improvement needed |

### Fixed (History)

| # | Issue | Fixed In |
|---|---|---|
| ✅ | Semantic Core Step 3 AI was a mock | Phase 2 |
| ✅ | Header dropdowns not opening | Onboarding session |
| ✅ | Account panel too transparent | Onboarding session |
| ✅ | URL validation errors | Onboarding session |
| ✅ | Projects page was static | Onboarding session |
| ✅ | No active project concept | Onboarding session |
| ✅ | AI Model Selector dropdown clipped | Phase 6-7 |
| ✅ | AI ideation was "flying blind" (no project context) | Phase 7 |
| ✅ | Category colors inconsistent | Phase 2 |
| ✅ | Manual duplicate title warnings missing | Phase 6 |

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
| `StepSiteStructure` uses mock data | Generates fake pages | Wire to real sitemap parser or AI-generated structure |
| Content editor markdown rendering is regex-based | Fragile HTML output | Consider using `react-markdown` or `marked` |
| `seoAnalysis.ts` uses heuristic scoring (not real plagiarism check) | Misleading uniqueness scores | Integrate text.ru or Copyscape API for real checks |

---

## Roadmap

### 🔴 TIER 1 — Core User Flow (Must work for first real use)

#### ~~1.1 · Semantic Core — Make Step 3 AI Actually Work~~ ✅ DONE
Fully wired to OpenRouter. Export CSV works.

#### ~~1.2 · Content Planner — CSV Import~~ ✅ DONE
Full CSV import with drag-and-drop, preview, flexible header mapping.

#### ~~1.3 · Content Generation ("Create with AI")~~ ✅ DONE
`generateContent`, `analyzeContent`, `regenerateContent` mutations implemented. Content editor at `/content/[id]` with Generate/Analyze/Optimize/Save buttons and SEO analysis sidebar.

#### 1.4 · Team Invite — Real Email
**Current:** Logs to console.

**Build:**
- `nodemailer` + SMTP env vars → branded HTML email
- `bcrypt` hash temp password

**Files:** `contentPlan.ts`, new `lib/email.ts`  
**Effort:** ~1h

#### 1.5 · Content Ideation — Fix AI Context (IN PROGRESS)
**Current:** AI invents page types and schemas. URLs don't use project domain. Deep SEO block is misplaced.

**Build:**
- Fix `proposeIdeas` to return `section`, `pageType`, `schemaType`, `url` from project data
- Fix `fleshOutIdeas` to generate only missing fields (metaDesc, h1, h2s, keywords, tags)
- Update IdeationModal UI to display richer idea cards
- Move Deep SEO Generation block above the ideas list
- Rename button to "Flesh out SEO" or similar
- Fix AI Model Selector click reliability

**Files:** `contentPlan.ts`, `IdeationModal.tsx`, `AIModelSelector.tsx`  
**Effort:** ~3h

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

#### 2.6 · Site Structure — Real Sitemap Parsing
- Wire `StepSiteStructure` to real sitemap parser instead of mock pages
- AI analysis of competitor structures
- Editable tree with drag-and-drop reordering
- **Effort:** ~4h

---

### 🟢 TIER 3 — Polish & Growth

- **3.1** Dashboard — Real activity feed & 30-day charts
- **3.2** Spam Score / SEO Analysis — text.ru, Copyscape for real uniqueness checks
- **3.3** Blog Topics Suggestion — AI suggests from semantic core keywords
- **3.4** Analytics Page — Google Search Console integration
- **3.5** Settings Page — Profile, AI prefs, notifications, danger zone
- **3.6** Content Plan Shared Access — Password-check gate
- **3.7** Site Architecture Tree View — Full editable tree with drag-and-drop

---

### Recommended Execution Order

```
Phase A (immediate):
  1.5  → Fix Content Ideation AI Context   (~3h)   ← in progress, resume here
  1.4  → Real Email Invites               (~1h)

Phase B (next):
  2.6  → Site Structure Real Parsing       (~4h)
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
| 8 | Other agent session | Site Structure + Content Editor | `StepSiteStructure` onboarding step, project settings page, content manager list, content editor with generate/analyze/optimize, SEO analysis service, RSS feed management, cleaned up SEO_classify directory, `docs/GLOBAL_PLAN.md` created |
| — | Onboarding export | UI Fixes | Header dropdowns, project context, project switcher, autopilot readiness bar, URL validation, projects page real data |

---

## Key File Reference

### Documentation
- `docs/architecture.md` — System architecture (living doc)
- `docs/marketing.md` — Marketing copy & features
- `docs/GLOBAL_PLAN.md` — **This file**
- `.agents/rules/architecture-md.md` — Rule: update architecture.md on global changes
- `.agents/rules/global-plan.md` — Rule: always check GLOBAL_PLAN.md

### Reference Data
- `_temp/index.html` — Client SEO plan for fackturaf.com
- `_temp/content_plan_fackturaf.xlsx` — Real Excel content plan reference
- `_temp/nav_guide.html` — Navigation guide reference
- `_temp/templates_viewer.html` — Templates reference

### Key Source Files
- `apps/web/src/server/routers/semanticCore.ts` — Semantic Core router (40KB)
- `apps/web/src/server/routers/contentPlan.ts` — Content Planner router (52KB, incl. ideation, generation, analysis)
- `apps/web/src/server/routers/projects.ts` — Projects router (8.7KB, incl. RSS feeds, project upsert)
- `apps/web/src/server/services/ai.ts` — Centralized AI service
- `apps/web/src/server/services/seoAnalysis.ts` — SEO analysis service (heuristic scoring)
- `apps/web/src/components/semantic-core/SemanticCoreWizard.tsx` — 4-step wizard
- `apps/web/src/components/content-planner/IdeationModal.tsx` — Content ideation (27KB)
- `apps/web/src/components/onboarding/StepSiteStructure.tsx` — Site structure onboarding step
- `apps/web/src/components/ui/AIModelSelector.tsx` — Reusable AI model picker
- `apps/web/src/app/content/[id]/page.tsx` — Content editor page
- `apps/web/src/app/project-settings/page.tsx` — Project settings page
- `apps/web/src/lib/project-context.tsx` — Active project global state
- `packages/shared/seo/pageTypes.ts` — Page type taxonomy
- `packages/db/prisma/schema.prisma` — Database schema

---

*This file is version-controlled in the project repo. Update it whenever phases are completed or new issues are discovered.*
