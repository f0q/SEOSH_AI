# SEO Keyword Classifier

Интеллектуальный SaaS-инструмент для автоматической классификации поисковых запросов по категориям с помощью ИИ. Анализирует ключевые слова, группирует их, генерирует тематические категории и сопоставляет каждый запрос с наиболее подходящей страницей сайта.

## 🚀 Возможности

- **Парсинг Sitemap** — автоматическое извлечение страниц из XML-карты сайта с получением title и h1 каждой страницы
- **Лексическая группировка** — умная предварительная группировка запросов по семантическому ядру (центроидный алгоритм без транзитивных цепочек)
- **ИИ-генерация категорий** — ИИ анализирует репрезентативные запросы и предлагает структуру категорий
- **ИИ-слияние категорий** — возможность итеративного сжатия списка категорий с помощью ИИ
- **Точная классификация** — High-Accuracy режим с нумерованными категориями для исключения ошибок мэтчинга
- **Подбор страниц** — автоматический подбор наиболее релевантной страницы сайта для каждого запроса
- **Редактирование результатов** — инлайн-переименование категорий и ручной выбор страницы из Sitemap-дерева
- **Экспорт в CSV** — выгрузка всех результатов в формате CSV (UTF-8 с BOM для Excel)
- **Авторизация** — регистрация/авторизация через Better Auth
- **Токеновая экономика** — система токенов для ограничения использования ИИ

## 🏗 Архитектура

```
┌────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend     │────▷│   Backend    │────▷│  PostgreSQL  │
│   React+Vite   │     │  Express+TS  │     │   (Prisma)   │
│   Port: 5173   │     │  Port: 3000  │     │  Port: 5432  │
└────────────────┘     └──────┬───────┘     └──────────────┘
                              │
                              ▽
                       ┌──────────────┐
                       │  OpenRouter  │
                       │  (ИИ API)    │
                       └──────────────┘
```

### Технологии

| Слой | Технологии |
|------|-----------|
| Frontend | React 18, TypeScript, Vite, Lucide Icons |
| Backend | Node.js, Express, TypeScript, tsx (hot-reload) |
| Database | PostgreSQL 15, Prisma ORM |
| Auth | Better Auth (email/password) |
| AI | OpenRouter API (Gemini 2.0 Flash по умолчанию) |
| Infra | Docker Compose |

## 📦 Установка и запуск

### Предварительные требования

- Docker и Docker Compose
- API-ключ OpenRouter (https://openrouter.ai)

### 1. Клонирование и настройка

```bash
git clone <repo-url>
cd SEO_classify
```

### 2. Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL=postgresql://seo_user:seo_pass@db:5432/seo_classify

# AI
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-openrouter

# Модели (опционально, по умолчанию Gemini 2.0 Flash)
OPENROUTER_MODEL_CATEGORIES=google/gemini-2.0-flash-001
OPENROUTER_MODEL_CLASSIFY=google/gemini-2.0-flash-001

# Auth
BETTER_AUTH_SECRET=ваша-32-символьная-случайная-строка

# URLs
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### 3. Запуск

```bash
docker compose up -d
```

Приложение будет доступно:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### 4. Миграции БД

При первом запуске миграции применяются автоматически. Для ручного запуска:

```bash
docker compose exec backend npx prisma migrate dev
```

## 🔄 Рабочий процесс (4 шага)

### Шаг 1: Сайт и Sitemap

1. Введите URL сайта (например, `https://example.com`)
2. Система автоматически находит `sitemap.xml`
3. Извлекает все страницы с их title и h1
4. Данные используются для генерации категорий и подбора страниц

### Шаг 2: Загрузка запросов

1. Вставьте список поисковых запросов (по одному на строку)
2. Система группирует их лексически:
   - Удаляет стоп-слова (RU/EN/ES)
   - Применяет простой стеммер
   - Использует **центроидную кластеризацию** (без Union-Find)
   - Каждый запрос сравнивается с представителем кластера (не с каждым членом)
3. Из каждой группы выбирается репрезентативный запрос (самый короткий)

### Шаг 3: Категории ИИ

1. **Генерация** — ИИ анализирует репрезентативные запросы + структуру сайта → предлагает категории
2. **Редактирование** — можно:
   - Переименовать категорию (✏)
   - Удалить категорию (✕)
   - Добавить свою (+)
   - **Объединить похожие (ИИ)** — нажимать можно многократно для итеративного сжатия
   - Перегенерировать полностью
3. **Классификация** — ИИ распределяет запросы по утвержденным категориям
   - Используется High-Accuracy режим (номера вместо названий)
   - SSE для real-time прогресса
   - Батчи по 40 запросов

### Шаг 4: Результаты

Таблица с колонками: **Запрос → Категория → Группа → Страница → ★**

- **Поиск** — полнотекстовый поиск по всем полям
- **Фильтр** — клик по бейджу категории фильтрует таблицу
- **Сортировка** — клик по заголовку столбца
- **Переименование категорий** — наведите на бейдж → ✏ → введите новое имя
- **Выбор страницы** — наведите на ячейку «Страница» → ✏ → выпадающее дерево Sitemap с поиском
- **Экспорт CSV** — скачивание результатов со всеми колонками

Цветовая индикация страниц:
- 🟣 **Фиолетовый** — автоматический подбор
- 🟢 **Зелёный** — ручной выбор (сохранённый в БД)

## 🧠 Алгоритмы

### Лексическая группировка (Centroid-based)

В отличие от Union-Find, который создаёт транзитивные цепочки, наш алгоритм:

1. Нормализует запросы: lowercase → удаление спецсимволов → стоп-слова → стеммер
2. Сортирует по длине (короткие первыми)
3. Каждый запрос сравнивается **только с представителем кластера**
4. Критерии объединения:
   - Подмножество ≥ 2 слов (80%+ покрытие)
   - Jaccard similarity > 0.5 (для коротких фраз)
   - Jaccard > 0.4 (для длинных фраз)
   - Абсолютное совпадение ≥ 3 слов при 50%+ покрытии

### ИИ-классификация (High-Accuracy)

Для исключения ошибок сопоставления:
- Категории передаются пронумерованным списком: `1. Категория А`, `2. Категория Б`
- ИИ возвращает только **номер** категории для каждого запроса
- Бэкенд преобразует номера обратно в названия

### Подбор страниц

Для каждого запроса:
1. Извлекаются слова (length > 2)
2. Для каждой страницы считается пересечение слов {query} ∩ {URL path + title}
3. Нормализуется по длине запроса
4. Выбирается страница с максимальным score (threshold ≥ 0.3)

## 📁 Структура проекта

```
SEO_classify/
├── docker-compose.yml          # Конфигурация контейнеров
├── .env                        # Переменные окружения
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Схема базы данных
│   │   └── migrations/         # SQL-миграции
│   └── src/
│       ├── index.ts            # Entry point (Express)
│       ├── lib/
│       │   ├── auth.ts         # Better Auth config
│       │   ├── prisma.ts       # Prisma client
│       │   └── middleware.ts   # Token economy middleware
│       ├── routes/
│       │   ├── auth.ts         # /api/auth/*
│       │   ├── categorize.ts   # /api/categorize/*
│       │   ├── queries.ts      # /api/queries/*
│       │   ├── sessions.ts     # /api/sessions/*
│       │   └── sitemap.ts      # /api/sitemap/*
│       └── services/
│           ├── csvExporter.ts     # CSV generation
│           ├── lexicalGrouper.ts  # Centroid clustering
│           ├── openrouter.ts      # AI API calls
│           └── sitemapParser.ts   # Sitemap XML parser
│
└── frontend/
    └── src/
        ├── App.tsx               # Root component
        ├── index.css             # Design system
        ├── api/
        │   └── client.ts        # API functions + types
        ├── components/
        │   ├── AuthModal.tsx     # Login/Register modal
        │   ├── PagePicker.tsx    # Sitemap tree page selector
        │   ├── SessionHistory.tsx
        │   ├── StepCategories.tsx
        │   ├── StepQueries.tsx
        │   ├── StepResults.tsx
        │   ├── StepSitemap.tsx
        │   ├── UserMenu.tsx
        │   └── Wizard.tsx        # Main 4-step wizard
        ├── context/
        │   └── AuthContext.tsx
        └── lib/
            └── auth.ts          # Auth client
```

## 🔌 API Reference

### Sessions
| Method | Endpoint | Описание |
|--------|----------|----------|
| `GET` | `/api/sessions` | Список сессий |
| `POST` | `/api/sessions` | Создать сессию |
| `GET` | `/api/sessions/:id` | Получить сессию |
| `DELETE` | `/api/sessions/:id` | Удалить сессию |

### Sitemap
| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/api/sitemap/parse` | Спарсить sitemap.xml |
| `GET` | `/api/sitemap/:sessionId` | Получить страницы |

### Queries
| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/api/queries/upload` | Загрузить + группировать запросы |

### Categorization
| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/api/categorize/generate` | ИИ-генерация категорий |
| `POST` | `/api/categorize/merge` | ИИ-сжатие категорий |
| `POST` | `/api/categorize/approve` | Утвердить категории |
| `POST` | `/api/categorize/run` | Запустить классификацию |
| `GET` | `/api/categorize/progress/:id` | SSE прогресс |
| `GET` | `/api/categorize/results/:id` | Результаты |
| `PATCH` | `/api/categorize/rename-category` | Переименовать категорию |
| `PATCH` | `/api/categorize/update-page` | Изменить страницу запроса |
| `GET` | `/api/categorize/export/:id` | Экспорт CSV |

## 🔧 Модели данных (Prisma)

### Основные модели
- **AppSession** — рабочая сессия (URL сайта + все связанные данные)
- **SitemapPage** — страница из sitemap (url, title, h1)
- **LexicalGroup** — группа запросов с общим представителем
- **Query** — поисковый запрос (text, categoryId, groupId, pageUrl)
- **Category** — категория запросов (name, approved)

### Auth-модели (Better Auth)
- **User** — пользователь (email, plan)
- **Session** — auth-сессия
- **Account** — провайдер авторизации
- **TokenBalance** — баланс токенов
- **TokenTransaction** — транзакции токенов

## 🎨 Дизайн-система

Приложение использует кастомную тёмную тему с glassmorphism-элементами:

- **Surface** цвета: `surface-100` (светлый текст) → `surface-900` (фон)
- **Brand** градиент: `#6366f1` → `#a855f7` (indigo → purple)
- **Glass cards**: `backdrop-blur-sm` + полупрозрачные границы
- **Анимации**: `animate-pulse-glow`, `animate-shimmer`, `animate-fade-in`, `animate-slide-up`

## 📝 Лицензия

MIT
