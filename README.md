# SEOSH.AI

> All-in-One SEO Platform — from semantic core to AI-powered content publishing.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Docker & Docker Compose
- API key for AI provider (OpenRouter recommended)

### 1. Clone & Install

```bash
git clone <repo-url>
cd SEOSH_AI
cp .env.example .env
# Edit .env with your API keys
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
# Starts: PostgreSQL, Redis, MinIO
```

### 3. Database Setup

```bash
npm run db:generate
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
# Opens at http://localhost:3000
```

## 🏗 Architecture

```
SEOSH_AI/
├── apps/
│   ├── web/                 # Next.js App Router (frontend + API)
│   └── telegram-bot/        # Telegram bot for autopilot approvals
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── shared/              # Types, i18n (en/ru), utilities
│   └── ui/                  # Design system components
├── services/
│   ├── ai-provider/         # Multi-provider AI (OpenRouter, OpenAI, Anthropic, Ollama)
│   ├── onboarding/          # Business analysis + onboarding
│   ├── semantic-core/       # Keyword clustering (ex SEO_classify)
│   ├── content/             # AI content generation
│   ├── seo-optimizer/       # Modular SEO analysis (Text.ru, Pixel Tools, ...)
│   ├── publisher/           # CMS connectors (WordPress → Tilda → Bitrix)
│   ├── analytics/           # External analytics APIs
│   └── autopilot/           # Automated content pipeline
├── docs/                    # Documentation + marketing
├── docker-compose.yml       # Dev infrastructure
└── turbo.json               # Turborepo config
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Backend | Next.js API Routes, tRPC |
| Database | PostgreSQL 16, Prisma ORM |
| Cache/Queue | Redis 7 |
| Storage | MinIO (S3-compatible) |
| AI | OpenRouter, OpenAI, Anthropic, Ollama |
| Auth | Better Auth |
| Infra | Docker Compose, Turborepo |
| i18n | next-intl (EN, RU) |

## 🔌 AI Providers

SEOSH.AI supports multiple AI providers through a unified interface:

| Provider | Config Level | Use Case |
|----------|-------------|----------|
| OpenRouter | Superadmin | Default — access to 100+ models |
| OpenAI | Superadmin | GPT-4o, DALL-E 3 |
| Anthropic | Superadmin | Claude Sonnet/Haiku |
| Ollama | User (self-hosted) | Local models, no API costs |

**Superadmin** configures available providers. **Users** choose preferred models.

## 📦 Modules

Each module is independently developed and documented:

- **Onboarding** — Business profiling wizard
- **Semantic Core** — Keyword clustering and page mapping
- **Content** — AI generation + SEO optimization
- **Publisher** — CMS connectors (WordPress first)
- **Analytics** — Yandex.Metrika, Google Search Console, etc.
- **Autopilot** — Automated content pipeline + Telegram approval

## 🌍 Localization

- English (default)
- Russian
- Translation files: `packages/shared/i18n/`

## 🔓 Open Source

The open-source version allows:
- Self-hosted deployment
- Custom AI model configuration
- Custom SEO tool modules
- Community contributions

## 📝 License

MIT
