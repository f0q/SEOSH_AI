# SEOSH.AI — Agent Guide

SaaS, автоматизирующий полный SEO-workflow для русскоязычного рынка: **Keywords → Semantic Core → Content Plan → AI Generate → SEO Check → Publish → Analytics**. Прод — `https://seosh.aijam.pro`.

Полная документация живёт в [docs/](docs/) — этот файл оптимизирован под Claude/агентов и описывает только то, что нужно знать сразу.

- [docs/architecture.md](docs/architecture.md) — архитектура, диаграммы, потоки данных
- [docs/GLOBAL_PLAN.md](docs/GLOBAL_PLAN.md) — roadmap, спринты, приоритеты
- [docs/BILLING.md](docs/BILLING.md) — биллинг (YooKassa, пакеты, BillingProvider абстракция)
- [docs/marketing.md](docs/marketing.md) — лендинг, copy, маркетинг

Если делаешь крупные архитектурные изменения — **обновляй живые доки в `docs/`**, а не этот файл.

---

## Стек

- **Next.js 16.2.4** App Router + React 19 + `output: "standalone"` → Docker-runner без `pnpm`/`prisma` CLI
- **tRPC 11** (`apps/web/src/server/`) с superjson, organized by domain
- **Prisma 6** + Postgres 16 + Redis 7 + MinIO (S3-compatible)
- **better-auth 1.6** (session-cookie) с админскими полями `role`, `isDemo`
- **next-intl 4.9** — cookie-based locale **без URL-префикса**, ru/en
- **OpenRouter** для AI генерации
- **Turborepo monorepo** (npm workspaces)

> `apps/web/AGENTS.md` напоминает: Next.js 16 ломал API — читай `node_modules/next/dist/docs/` перед нетривиальным кодом, не полагайся на тренинг.

---

## Прод-деплой

VPS:
- Хост: `193.180.213.254` (Ubuntu 24, user `jamal7`)
- Путь: `/opt/seosh-ai` (root-owned, нужен sudo)
- Домен: `https://seosh.aijam.pro` (Caddy auto-SSL → app:3000)
- Compose: `docker-compose.prod.yml` + `.env.production`
- 5 контейнеров: `seosh-ai-{caddy,app,db,redis,minio}-1`

Команды деплоя (после `git pull` в `/opt/seosh-ai`):

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml build app
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
```

**Важно: `--env-file .env.production` обязателен**, иначе compose ругается на `POSTGRES_PASSWORD`. Без него получишь варнинги при каждой команде.

### Gotcha: миграции в standalone-образе

`output: "standalone"` означает, что `package.json` и `prisma` CLI **отсутствуют в runtime-контейнере** — `prisma migrate deploy` падает с ENOENT. Сейчас обходим вручную через `psql`:

```bash
# 1. Закатать DDL напрямую:
sudo docker exec -i seosh-ai-db-1 psql -U seosh -d seosh_ai < packages/db/prisma/migrations/XXXX_name/migration.sql

# 2. Зарегистрировать в _prisma_migrations, чтобы Prisma не пыталась её перезалить:
sudo docker exec seosh-ai-db-1 psql -U seosh -d seosh_ai -c "
  INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
  VALUES (gen_random_uuid()::text, 'applied-manually-via-psql', NOW(), 'XXXX_name', NOW(), 1)
  ON CONFLICT DO NOTHING;
"
```

TODO в roadmap: починить auto-migrate, чтобы это делалось в entrypoint runtime-stage'а.

---

## Локальная разработка

```bash
# 1. Поднять зависимости (postgres :5433, redis :6379, minio :9000/:9001)
docker compose up -d

# 2. Установить deps
npm install

# 3. Сгенерировать prisma client + накатить миграции
npm run db:generate
npm run db:migrate

# 4. Запустить dev-сервер (порт 3000)
npm run dev
```

`apps/web/.env.local` нужен с минимумом: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ENCRYPTION_SECRET`, `OPENROUTER_API_KEY`, `NEXT_PUBLIC_APP_URL`. Шаблон смотри в `.env.example` (если нет — собери из `apps/web/src/lib/auth.ts` и `apps/web/src/server/lib/encryption.ts`).

---

## Структура

```
apps/
  web/                  ← всё, что важно
    src/
      app/              ← Next.js routes (App Router)
      components/       ← React-компоненты по доменам
      server/
        trpc.ts         ← procedure builders (см. ниже)
        root.ts         ← appRouter — composition root
        db.ts           ← prisma singleton (не создавай PrismaClient руками!)
        routers/        ← 13 доменных tRPC-роутеров
        services/       ← бизнес-логика (autopilot, publisher, billing, AI)
        lib/            ← encryption и т.п.
      lib/              ← клиентские утилиты + auth
      i18n/             ← next-intl request config
    instrumentation.ts  ← Next.js boot hook (запускает autopilot worker)
  telegram-bot/         ← placeholder, не реализован

packages/
  db/                   ← Prisma schema + миграции (единственный workspace с Prisma)
  shared/               ← общие типы + i18n каталоги (en.json, ru.json)
  ui/                   ← переиспользуемые UI-компоненты

services/               ← ⚠️ ПОЧТИ ВСЕ ПУСТЫЕ СКЕЛЕТЫ.
                          Реальная логика живёт в apps/web/src/server/services/.
                          Эти папки оставлены под будущее выделение в микросервисы.

docs/                   ← живые доки (см. ссылки в начале)
```

---

## tRPC: процедуры и роутеры

В `apps/web/src/server/trpc.ts` определено **5 procedure builders**:

| Builder | Auth | Demo mutations | Когда использовать |
|---|---|---|---|
| `publicProcedure` | нет | n/a | публичные ручки (waitlist signup, share-link receive) |
| `protectedProcedure` | требуется | **блокируются** | дефолт для всего юзер-фейсинга |
| `authedProcedure` | требуется | **разрешены** | только безобидные prefs (locale, theme) |
| `adminProcedure` | ADMIN или SUPERADMIN | n/a | админка |
| `superadminProcedure` | SUPERADMIN | n/a | глобальный конфиг (AI провайдеры и т.п.) |

Демо-юзер (`isDemo=true`) **не может мутировать** через `protectedProcedure` — это ловится middleware `enforceNonDemoForMutations`. Если хочешь, чтобы демо-юзер мог что-то менять — используй `authedProcedure`, но только для UI-prefs.

13 доменных роутеров в [apps/web/src/server/routers/](apps/web/src/server/routers/), собираются в [apps/web/src/server/root.ts](apps/web/src/server/root.ts):
`projects`, `ai`, `semanticCore`, `autopilot`, `content`, `contentPlan`, `dashboard`, `settings`, `admin`, `team`, `billing`, `publisher`, `waitlist`.

---

## Ключевые сервисы

### Autopilot ([services/autopilot/](apps/web/src/server/services/autopilot/))

- **`tick.ts`** — 3 passes: telegramNotify → autoApprove → publishDue. Защищён Postgres advisory lock (`pg_try_advisory_lock`), чтобы при scale-out тикал только один процесс.
- **`schedule.ts`** — `computeNextScheduledAt(projectId, freq)` для `1d|3w|1w|2w`.
- **`telegram.ts`** — прямой fetch к Telegram Bot API (без зависимостей). Webhook поднимается в `setTelegramConfig`, секрет хранится в `autopilotConfig.tgWebhookSecret` (unique).
- Воркер запускается через `apps/web/src/instrumentation.ts` (`setInterval` каждые 60s, первый тик через 30s, `globalThis` guard для dev hot-reload).

### Publisher ([services/publisher/](apps/web/src/server/services/publisher/))

`publishContentItem({ contentItemId, connectorId, status })` → выбирает провайдера из `registry.ts`. Реализован WordPress (REST API). Конфиги в `publisherConnector.config` (JSON), пароли через `encrypt()`.

### Billing ([services/billing/](apps/web/src/server/services/billing/))

Абстракция `BillingProvider`. Реализован YooKassa. См. [docs/BILLING.md](docs/BILLING.md).

### Encryption ([server/lib/encryption.ts](apps/web/src/server/lib/encryption.ts))

AES-256-GCM. Требует `ENCRYPTION_SECRET` (32+ символа) в env. Используй для **любых** секретов, которые сохраняешь в БД (Telegram токены, WordPress passwords, API keys).

---

## База данных

- Schema: [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)
- Миграции: [packages/db/prisma/migrations/](packages/db/prisma/migrations/)
- Prisma client используется ТОЛЬКО через singleton из [apps/web/src/server/db.ts](apps/web/src/server/db.ts). **Не создавай `new PrismaClient()`** — будет утечка коннекций.

Основные модели: `User`, `Project`, `CompanyProfile`, `SemanticCore` + `Query`/`Category`/`LexicalGroup`, `ContentPlan` + `ContentItem`, `AutopilotConfig`, `PublisherConnector`, `BillingPackage`/`BillingTransaction`, `ProjectMember`, `Waitlist`.

---

## i18n

- Каталоги: [packages/shared/i18n/en.json](packages/shared/i18n/en.json), [packages/shared/i18n/ru.json](packages/shared/i18n/ru.json)
- Cookie-based locale (нет `/ru/...` префикса в URL)
- Используй `useTranslations("namespace")` в клиенте, `getTranslations` на сервере
- Для HTML внутри строк — `t.rich("key", { strong: chunks => <strong>{chunks}</strong> })`
- ICU plural: `{count, plural, one {...} few {...} many {...} other {...}}` (русский требует few/many)

---

## Auth (better-auth)

- Setup: [apps/web/src/lib/auth.ts](apps/web/src/lib/auth.ts)
- Сессия через cookie, проверяется в `createTRPCContext`
- Кастомные поля юзера: `role` (USER|ADMIN|SUPERADMIN), `isDemo` (boolean)
- Демо-режим: POST на `/api/demo/login` создаёт/логинит демо-юзера и (через `ensureDemoProject`) сидит ему предзаполненный проект — см. [apps/web/src/server/demo-seed.ts](apps/web/src/server/demo-seed.ts)

---

## Конвенции

- **Не дублируй `PrismaClient`** — используй `prisma` из `@/server/db`
- **Не сохраняй секреты plain-text** — всегда `encrypt()` перед записью в БД
- **Тяжёлые мутации** в onboarding/api routes оборачивай в try/catch, чтобы не блокировать основной флоу
- **Файлы кода ссылай в формате** `[file.ts:42](path/to/file.ts#L42)` — это кликабельно в VSCode
- **Перед деструктивными действиями на проде** (drop column, force-push) — спроси юзера
- **WP password в этом проекте уже утёк** в чате — если увидишь его — попроси юзера сменить
- При работе с Next.js 16 API — читай `apps/web/node_modules/next/dist/docs/`, не доверяй тренингу
- Старайся **не плодить файлы в `services/*`** на верхнем уровне — это всё ещё пустые скелеты, и логика должна жить в `apps/web/src/server/services/`

---

## Команды-шпаргалка

```bash
# Dev
npm run dev                        # запустить Next.js
npm run db:studio                  # Prisma Studio
docker compose up -d               # поднять db+redis+minio локально

# Prisma
npm run db:generate                # перегенерить client
npm run db:migrate                 # создать+накатить миграцию (dev only)
npm run db:push                    # пушнуть schema без миграции (быстрый prototype)

# Prod (на VPS, из /opt/seosh-ai)
sudo docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
sudo docker compose --env-file .env.production -f docker-compose.prod.yml build app
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
sudo docker exec -it seosh-ai-db-1 psql -U seosh -d seosh_ai
```

---

@apps/web/AGENTS.md
