// Idempotent demo-project seed. Runs from /api/demo/login after the demo user
// is provisioned. If a project named DEMO_PROJECT_NAME already exists for the
// demo user, we skip — re-running is cheap and safe.

import { prisma } from "@/server/db";

const DEMO_PROJECT_NAME = "SEOSH Demo — ЭкоОбувь";

export async function ensureDemoProject(userId: string) {
  const existing = await prisma.project.findFirst({
    where: { userId, name: DEMO_PROJECT_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const project = await prisma.project.create({
    data: {
      userId,
      name: DEMO_PROJECT_NAME,
      url: "https://ecoshoes.example.ru",
      status: "ACTIVE",
      companyProfile: {
        create: {
          companyName: "ЭкоОбувь",
          industry: "E-commerce / Спорттовары",
          description:
            "Интернет-магазин беговых кроссовок из переработанных материалов. Доставка по РФ и СНГ, собственная розничная сеть в Москве и Санкт-Петербурге.",
          usp: "Кроссовки из 100% переработанного пластика, бесплатный возврат 60 дней, экспертная подгонка по плантограмме.",
          geography: "Россия, Москва и Санкт-Петербург (розница) + доставка по РФ/СНГ",
          productsServices: [
            { name: "Беговые кроссовки EcoRun Pro", description: "Универсальные кроссовки для асфальта, 280 г, дроп 8 мм", priceRange: "8 900 — 12 500 ₽" },
            { name: "Трейловые кроссовки TrailMax", description: "Агрессивный протектор, защита от камней, 320 г", priceRange: "11 500 — 14 900 ₽" },
            { name: "Стельки PlantoFit", description: "Индивидуальные стельки по 3D-сканированию стопы", priceRange: "2 900 — 4 500 ₽" },
          ],
          targetAudience: {
            segments: [
              "Бегуны-любители 25–45 лет, тренирующиеся 2–4 раза в неделю",
              "Участники городских забегов и марафонов (10K, 21K, 42K)",
              "ЗОЖ-аудитория, ищущая экологичные товары",
            ],
            painPoints: [
              "Не знают, какой дроп и тип кроссовок подходят под их пронацию",
              "Боятся купить онлайн неподходящий размер",
              "Хотят поддерживать экологичные бренды, но не находят их в РФ",
            ],
            cjm: {
              awareness: "Подписка на блог о беге, Telegram-каналы про забеги",
              consideration: "Сравнение моделей, чтение обзоров, плантограмма",
              decision: "Заказ с примеркой, доставка 1–3 дня",
            },
          },
          competitors: [
            { url: "https://lamoda.ru", name: "Lamoda — спорт", notes: "Широкий выбор, но без экспертизы по бегу" },
            { url: "https://sportmaster.ru", name: "Спортмастер", notes: "Розница и онлайн, средний ценовой сегмент" },
            { url: "https://runlab.ru", name: "RunLab", notes: "Сильная экспертиза, есть плантограмма" },
          ],
          existingChannels: {
            website: "https://ecoshoes.example.ru",
            socials: ["https://t.me/ecoshoes_demo", "https://vk.com/ecoshoes_demo"],
            other: ["Email-рассылка 12k подписчиков"],
          },
          siteStructure: [
            { label: "Главная", url: "/" },
            { label: "Каталог", url: "/catalog" },
            { label: "Блог", url: "/blog" },
            { label: "О бренде", url: "/about" },
            { label: "Доставка и оплата", url: "/delivery" },
            { label: "Контакты", url: "/contacts" },
          ],
          rssFeeds: ["https://runlab.ru/blog/rss", "https://nogibogi.com/feed/"],
        },
      },
      autopilotConfig: {
        create: {
          enabled: false,
          scheduleFreq: "2w",
          autoApprove: false,
        },
      },
    },
    select: { id: true },
  });

  // ── Semantic Core ────────────────────────────────────────────────────────
  const semanticCore = await prisma.semanticCore.create({
    data: {
      userId,
      projectId: project.id,
      siteUrl: "https://ecoshoes.example.ru",
      status: "completed",
    },
    select: { id: true },
  });

  const categoryDefs = [
    { name: "Выбор кроссовок", keywords: ["как выбрать беговые кроссовки", "беговые кроссовки для асфальта", "беговые кроссовки для начинающих", "беговые кроссовки с дропом 8 мм", "беговые кроссовки для марафона"] },
    { name: "Бренды и обзоры", keywords: ["обзор беговых кроссовок 2026", "лучшие беговые кроссовки рейтинг", "экологичные беговые кроссовки", "беговые кроссовки из переработанного пластика"] },
    { name: "Тренировки и забеги", keywords: ["как подготовиться к 10к", "план подготовки к марафону для начинающих", "темповая тренировка для бегуна", "восстановление после марафона"] },
    { name: "Стопа и здоровье", keywords: ["плантограмма что это", "пронация стопы у бегуна", "почему болят колени после бега", "индивидуальные стельки для бега"] },
  ];

  for (const cat of categoryDefs) {
    const category = await prisma.category.create({
      data: { name: cat.name, approved: true, semanticCoreId: semanticCore.id },
      select: { id: true },
    });
    for (const kw of cat.keywords) {
      await prisma.query.create({
        data: {
          text: kw,
          normalizedText: kw.toLowerCase().replace(/[^а-яёa-z0-9 ]/gi, "").trim(),
          semanticCoreId: semanticCore.id,
          categoryId: category.id,
          usageCount: 0,
        },
      });
    }
  }

  // ── Content Plan ─────────────────────────────────────────────────────────
  const contentPlan = await prisma.contentPlan.create({
    data: {
      projectId: project.id,
      name: "Контент-план: Q1 2026",
      description: "Базовый план для запуска блога и SEO-страниц каталога.",
    },
    select: { id: true },
  });

  const items: Array<Parameters<typeof prisma.contentItem.create>[0]["data"]> = [
    {
      contentPlanId: contentPlan.id,
      url: "kak-vybrat-begovye-krossovki",
      section: "Блог",
      blogCategory: "Выбор кроссовок",
      pageType: "article",
      priority: 1,
      status: "PUBLISHED",
      metaTitle: "Как выбрать беговые кроссовки: гид для новичков (2026)",
      metaDesc: "Разбираемся в пронации, дропе и амортизации. Чек-лист из 7 шагов для покупки первых беговых кроссовок и таблица соответствия типа бегуна и модели.",
      h1: "Как выбрать беговые кроссовки: гид для новичков",
      targetWordCount: 1800,
      h2Headings: ["Шаг 1: определите тип пронации", "Шаг 2: выберите дроп", "Шаг 3: подберите амортизацию", "Шаг 4: примерка и тест"],
      targetKeywords: ["как выбрать беговые кроссовки", "беговые кроссовки для начинающих", "пронация стопы у бегуна"],
      tags: ["гид", "новичкам", "бег"],
      schemaType: "Article",
      internalLinks: "/catalog/, /blog/plantogramma-chto-eto/",
      notes: "Опубликовано, ждём трафик с поисковиков.",
      title: "Как выбрать беговые кроссовки: гид для новичков (2026)",
      seoScore: 87,
      uniqueness: 92,
      sortOrder: 1,
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      publishedUrl: "https://ecoshoes.example.ru/blog/kak-vybrat-begovye-krossovki",
      markdownBody: "# Как выбрать беговые кроссовки: гид для новичков\n\nНовичку легко запутаться в десятках моделей и характеристик. В этом гиде — четыре шага, которые помогут подобрать первые беговые кроссовки без типичных ошибок.\n\n## Шаг 1: определите тип пронации\n\nПронация — это естественный завал стопы внутрь при беге. Существует три типа: нейтральная, гиперпронация и супинация. Проще всего определить тип на плантограмме у специалиста — занимает 5 минут.\n\n## Шаг 2: выберите дроп\n\nДроп — это разница высоты пятки и носка кроссовка. Для новичков подойдёт средний дроп 8–10 мм: он снимает нагрузку с икр и ахилла.\n\n## Шаг 3: подберите амортизацию\n\nЧем больше вес бегуна и длиннее тренировки — тем больше амортизации нужно. Для дистанций 5–10 км достаточно средней, для марафонов — максимальной.\n\n## Шаг 4: примерка и тест\n\nПримеряйте кроссовки вечером (стопа отекает за день), оставляйте 5–7 мм запаса у большого пальца. Если возможно — сделайте короткий пробег по магазину.",
      seoAnalysis: {
        uniqueness: 92, spamScore: 18, waterScore: 14, naturalness: 88, eeat: 82, readability: 91,
        recommendations: ["Добавить экспертную цитату от тренера для усиления E-E-A-T", "Вставить таблицу соответствия пронации и моделей"],
        contentModifiedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        expertAnalyzedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        aiAnalyzedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    {
      contentPlanId: contentPlan.id,
      url: "luchshie-begovye-krossovki-2026",
      section: "Блог",
      blogCategory: "Бренды и обзоры",
      pageType: "article",
      priority: 1,
      status: "OPTIMIZED",
      metaTitle: "Лучшие беговые кроссовки 2026 года: рейтинг от экспертов",
      metaDesc: "Топ-10 моделей беговых кроссовок 2026 года по результатам тестов. Сравнение веса, дропа, амортизации и цены. Победители в 5 категориях.",
      h1: "Рейтинг беговых кроссовок 2026 года",
      targetWordCount: 2500,
      h2Headings: ["Методика теста", "Топ для асфальта", "Топ для трейла", "Топ по цене/качеству", "Итоги"],
      targetKeywords: ["лучшие беговые кроссовки рейтинг", "обзор беговых кроссовок 2026"],
      tags: ["рейтинг", "обзор"],
      schemaType: "ItemList",
      internalLinks: "/blog/kak-vybrat-begovye-krossovki/, /catalog/run/",
      notes: "Оптимизировано после анализа — пересчитан SEO-балл.",
      title: "Лучшие беговые кроссовки 2026 года: рейтинг от экспертов",
      seoScore: 76,
      uniqueness: 84,
      sortOrder: 2,
      markdownBody: "# Рейтинг беговых кроссовок 2026 года\n\nМы протестировали 24 модели беговых кроссовок в течение 6 месяцев. В рейтинг попали 10 лучших, которые мы рекомендуем для разных задач и бюджетов.\n\n## Методика теста\n\nКаждая модель прошла минимум 200 км пробега на разных покрытиях: асфальт, грунт, лёгкий трейл. Оценивали амортизацию, износ протектора, удобство шнуровки и фиксацию пятки.\n\n## Топ для асфальта\n\n1. **EcoRun Pro** — лучший баланс веса и амортизации.\n2. **Asics Novablast** — отличный отскок, мягкая пенка.\n3. **Hoka Mach 6** — для скоростных тренировок.\n\n## Топ для трейла\n\n1. **TrailMax Eco** — агрессивный протектор + защита.\n2. **Salomon Sense Ride 5** — баланс на технике.",
      seoAnalysis: {
        uniqueness: 84, spamScore: 22, waterScore: 19, naturalness: 79, eeat: 74, readability: 86,
        recommendations: ["Добавить таблицу со сравнением 10 моделей", "Усилить раздел методики реальными цифрами"],
        contentModifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expertAnalyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        aiAnalyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    {
      contentPlanId: contentPlan.id,
      url: "ekologichnye-begovye-krossovki",
      section: "Блог",
      blogCategory: "Бренды и обзоры",
      pageType: "article",
      priority: 2,
      status: "REVIEW",
      metaTitle: "Экологичные беговые кроссовки: материалы и сертификаты",
      metaDesc: "Из чего делают экокроссовки и насколько это влияет на характеристики. Сравнение переработанного пластика, биопен и сертификации.",
      h1: "Экологичные беговые кроссовки: разбор материалов",
      targetWordCount: 1500,
      h2Headings: ["Переработанный пластик", "Биопены", "Сертификации"],
      targetKeywords: ["экологичные беговые кроссовки", "беговые кроссовки из переработанного пластика"],
      tags: ["эко", "материалы"],
      schemaType: "Article",
      internalLinks: "/about/sustainability/",
      notes: "Финальная вычитка редактором.",
      title: "Экологичные беговые кроссовки: материалы и сертификаты",
      seoScore: 72,
      sortOrder: 3,
      markdownBody: "# Экологичные беговые кроссовки\n\nЗа последние 5 лет крупные бренды начали активно использовать переработанные материалы. Разберёмся, где это реальная инновация, а где гринвошинг.",
    },
    {
      contentPlanId: contentPlan.id,
      url: "podgotovka-k-marafonu",
      section: "Блог",
      blogCategory: "Тренировки и забеги",
      pageType: "article",
      priority: 1,
      status: "GENERATED",
      metaTitle: "План подготовки к марафону для начинающих: 16 недель",
      metaDesc: "Готовый план тренировок для первого марафона за 16 недель. Расписание длинных, темповых и восстановительных пробежек по неделям.",
      h1: "Подготовка к первому марафону за 16 недель",
      targetWordCount: 2200,
      h2Headings: ["С чего начать", "Базовый блок (нед. 1–6)", "Развивающий блок (нед. 7–12)", "Тейпер (нед. 13–16)"],
      targetKeywords: ["план подготовки к марафону для начинающих", "как подготовиться к 10к"],
      tags: ["план", "марафон"],
      schemaType: "Article",
      internalLinks: "/blog/kak-vybrat-begovye-krossovki/",
      notes: "Контент сгенерирован, ждёт экспертного ревью.",
      title: "План подготовки к марафону для начинающих: 16 недель",
      sortOrder: 4,
      markdownBody: "# Подготовка к первому марафону за 16 недель\n\nЕсли вы уже уверенно пробегаете 10 км, 16 недель достаточно для безопасной подготовки к первому марафону.",
    },
    {
      contentPlanId: contentPlan.id,
      url: "plantogramma-chto-eto",
      section: "Блог",
      blogCategory: "Стопа и здоровье",
      pageType: "article",
      priority: 2,
      status: "GENERATED",
      metaTitle: "Что такое плантограмма и зачем она бегуну",
      metaDesc: "Плантограмма за 5 минут определяет тип пронации и помогает подобрать правильные беговые кроссовки. Где сделать и как читать результат.",
      h1: "Плантограмма: ключ к правильным кроссовкам",
      targetWordCount: 1400,
      h2Headings: ["Что такое плантограмма", "Как читать результат", "Где сделать"],
      targetKeywords: ["плантограмма что это", "пронация стопы у бегуна"],
      tags: ["здоровье", "стопа"],
      schemaType: "Article",
      internalLinks: "/services/plantogramma/",
      notes: "Готов к публикации после согласования с врачом-консультантом.",
      title: "Что такое плантограмма и зачем она бегуну",
      sortOrder: 5,
    },
    {
      contentPlanId: contentPlan.id,
      url: "catalog/run",
      section: "Каталог",
      blogCategory: "Выбор кроссовок",
      pageType: "category",
      priority: 1,
      status: "IN_PROGRESS",
      metaTitle: "Беговые кроссовки — каталог ЭкоОбувь",
      metaDesc: "Беговые кроссовки из переработанных материалов: модели для асфальта, трейла и марафона. Доставка 1–3 дня по РФ.",
      h1: "Беговые кроссовки",
      targetWordCount: 800,
      h2Headings: ["Популярные модели", "По типу покрытия", "По уровню подготовки"],
      targetKeywords: ["беговые кроссовки для асфальта", "беговые кроссовки с дропом 8 мм"],
      tags: ["каталог"],
      schemaType: "CollectionPage",
      internalLinks: "/blog/kak-vybrat-begovye-krossovki/",
      notes: "Готовим SEO-текст для категории.",
      title: "Беговые кроссовки — каталог",
      sortOrder: 6,
    },
    {
      contentPlanId: contentPlan.id,
      url: "catalog/trail",
      section: "Каталог",
      blogCategory: "Выбор кроссовок",
      pageType: "category",
      priority: 2,
      status: "DRAFT",
      metaTitle: "Трейловые кроссовки — каталог",
      metaDesc: "",
      h1: "Трейловые кроссовки",
      targetWordCount: 800,
      h2Headings: [],
      targetKeywords: ["трейловые кроссовки"],
      tags: ["каталог", "трейл"],
      schemaType: "CollectionPage",
      notes: "Заготовка карточки категории.",
      title: "Трейловые кроссовки — каталог",
      sortOrder: 7,
    },
    {
      contentPlanId: contentPlan.id,
      url: "blog/vosstanovlenie-posle-marafona",
      section: "Блог",
      blogCategory: "Тренировки и забеги",
      pageType: "article",
      priority: 3,
      status: "DRAFT",
      metaTitle: "Восстановление после марафона: 7 дней",
      metaDesc: "",
      h1: "Восстановление после марафона",
      targetWordCount: 1200,
      h2Headings: ["День 1: после финиша", "Дни 2–3: пассивный отдых", "Дни 4–7: лёгкий бег"],
      targetKeywords: ["восстановление после марафона"],
      tags: ["восстановление"],
      schemaType: "Article",
      notes: "В очереди на генерацию.",
      title: "Восстановление после марафона: 7 дней",
      sortOrder: 8,
    },
    {
      contentPlanId: contentPlan.id,
      url: "blog/individualnye-stelki",
      section: "Блог",
      blogCategory: "Стопа и здоровье",
      pageType: "article",
      priority: 3,
      status: "DRAFT",
      metaTitle: "Индивидуальные стельки для бега: нужны ли вам",
      metaDesc: "",
      h1: "Индивидуальные стельки: когда они действительно нужны",
      targetWordCount: 1300,
      h2Headings: ["Кому нужны стельки", "Как делают индивидуальные стельки", "Стоимость и срок службы"],
      targetKeywords: ["индивидуальные стельки для бега"],
      tags: ["стопа", "здоровье"],
      schemaType: "Article",
      notes: "Тема согласована с автором.",
      title: "Индивидуальные стельки для бега",
      sortOrder: 9,
    },
    {
      contentPlanId: contentPlan.id,
      url: "blog/pochemu-bolyat-koleni",
      section: "Блог",
      blogCategory: "Стопа и здоровье",
      pageType: "article",
      priority: 2,
      status: "DRAFT",
      metaTitle: "Почему болят колени после бега: 5 причин",
      metaDesc: "",
      h1: "Болят колени после бега: причины и что делать",
      targetWordCount: 1500,
      h2Headings: ["Слишком резкий рост нагрузки", "Неправильная техника", "Износ кроссовок", "Травмы менисков", "Когда идти к врачу"],
      targetKeywords: ["почему болят колени после бега"],
      tags: ["здоровье", "травмы"],
      schemaType: "Article",
      notes: "Согласовать с врачом-консультантом ortop.",
      title: "Почему болят колени после бега",
      sortOrder: 10,
    },
  ];

  for (const data of items) {
    await prisma.contentItem.create({ data });
  }

  return project.id;
}
