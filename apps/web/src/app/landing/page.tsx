import Link from "next/link";
import { prisma } from "@/server/db";
import {
  Sparkles, Bot, FileText, BarChart3, Layers, Globe, ShieldCheck, ArrowRight, Check, Star,
} from "lucide-react";

export const metadata = {
  title: "SEOSH.AI — автопилот SEO-контента",
  description:
    "Семантическое ядро, контент-план, AI-генерация, SEO-проверка и публикация в WordPress — в одной платформе.",
};

// Render on each request — packages live in the DB and may not be reachable
// at build time (CI without DB). The query is cheap; ISR could be added later
// if traffic warrants it.
export const dynamic = "force-dynamic";

function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString("ru-RU");
}

const FEATURES = [
  {
    icon: Layers,
    title: "Семантическое ядро",
    text: "Загрузите ключи или соберите кластеры — AI разнесёт их по категориям и страницам.",
  },
  {
    icon: FileText,
    title: "Контент-план",
    text: "Сгенерируйте идеи, расширьте SEO-данные, выгрузите Excel или поделитесь по ссылке.",
  },
  {
    icon: Sparkles,
    title: "AI-генерация",
    text: "Тексты с заданным каркасом H1/H2, мета-тегами, ключами и проверкой уникальности.",
  },
  {
    icon: BarChart3,
    title: "SEO-анализ",
    text: "Уникальность, заспамленность, E-E-A-T, читаемость — в реальном времени по Text.ru и AI.",
  },
  {
    icon: Globe,
    title: "Публикация в WordPress",
    text: "Подключите CMS по Application Password — контент уходит в публикацию или черновики автоматически.",
  },
  {
    icon: Bot,
    title: "Автопилот",
    text: "Регулярная публикация по расписанию, очередь с approve/reject и уведомлениями.",
  },
];

const WORKFLOW = [
  "Опишите бизнес в 5-шаговом мастере",
  "Загрузите семантическое ядро или соберите его из конкурентов",
  "Получите контент-план с приоритетами и типами страниц",
  "Сгенерируйте и оптимизируйте тексты под SEO",
  "Опубликуйте в WordPress в один клик — или включите автопилот",
];

export default async function LandingPage() {
  // The landing page must render even if the DB is briefly unreachable —
  // it's the entry point for new visitors. Fall back to an empty list and
  // show a "tariffs being set up" message rather than 500.
  let packages: Awaited<ReturnType<typeof prisma.tokenPackage.findMany>> = [];
  try {
    packages = await prisma.tokenPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    packages = [];
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Header */}
      <header className="border-b border-surface-800/50 backdrop-blur-md sticky top-0 z-50 bg-surface-950/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">SEOSH.AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-surface-300">
            <a href="#features" className="hover:text-white transition">Возможности</a>
            <a href="#workflow" className="hover:text-white transition">Как это работает</a>
            <a href="#pricing" className="hover:text-white transition">Тарифы</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-surface-300 hover:text-white px-3 py-1.5">
              Войти
            </Link>
            <Link
              href="/register"
              className="text-sm bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Начать
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs mb-6">
              <Star className="w-3.5 h-3.5" />
              Полный цикл SEO в одной платформе
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              SEO на автопилоте.<br />
              <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                От ключевых слов до публикации.
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-surface-400 max-w-2xl">
              Соберите семантику, спланируйте контент, сгенерируйте тексты под SEO
              и опубликуйте их в WordPress — за минуты, не недели.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl text-base font-semibold transition shadow-lg shadow-brand-500/30"
              >
                Попробовать бесплатно
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 border border-surface-700 hover:border-surface-500 text-surface-200 px-6 py-3 rounded-xl text-base font-medium transition"
              >
                Тарифы
              </Link>
            </div>
            <p className="mt-4 text-xs text-surface-500">
              Стартовый бонус 2 000 токенов · Кредитная карта не нужна
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24 border-t border-surface-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Что внутри</h2>
          <p className="text-center text-surface-400 mt-3 max-w-2xl mx-auto">
            Шесть модулей закрывают весь SEO-цикл — от семантики до публикации и аналитики.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-surface-800/60 bg-surface-900/40 p-6 hover:border-brand-500/40 transition">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-lg text-surface-100">{f.title}</h3>
                <p className="mt-2 text-sm text-surface-400 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-16 md:py-24 border-t border-surface-800/40 bg-surface-900/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Как это работает</h2>
          <ol className="mt-10 space-y-4">
            {WORKFLOW.map((step, i) => (
              <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-surface-900/40 border border-surface-800/50">
                <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-surface-200 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 border-t border-surface-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Тарифы</h2>
          <p className="text-center text-surface-400 mt-3">
            Платите за токены — без подписок, без скрытых платежей.
          </p>

          {packages.length === 0 ? (
            <p className="text-center text-surface-500 mt-12">
              Тарифы в настройке. Зайдите позже или напишите нам.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-2xl p-7 relative ${
                    pkg.highlighted
                      ? "border-2 border-brand-500 bg-gradient-to-b from-brand-500/10 to-transparent shadow-xl shadow-brand-500/10"
                      : "border border-surface-800/60 bg-surface-900/40"
                  }`}
                >
                  {pkg.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Популярный
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-surface-400 mt-2 min-h-[40px]">{pkg.description}</p>
                  )}
                  <div className="my-6">
                    <p className="text-4xl font-extrabold">
                      {formatRub(pkg.priceRub)}
                      <span className="text-lg font-medium text-surface-400 ml-1">₽</span>
                    </p>
                    <p className="text-sm text-brand-400 font-medium mt-1">
                      {pkg.tokens.toLocaleString("ru-RU")} токенов
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-surface-300 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>≈ {Math.floor(pkg.tokens / 100)} AI-операций (зависит от модели)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>Безлимитные проекты и пользователи</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>Публикация в WordPress</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>Оплата ЮKassa или счёт на юр. лицо</span>
                    </li>
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center w-full py-3 rounded-xl font-semibold transition ${
                      pkg.highlighted
                        ? "bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20"
                        : "bg-surface-800 hover:bg-surface-700 text-surface-100"
                    }`}
                  >
                    Начать с {pkg.name}
                  </Link>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-surface-500 mt-10">
            Цены указаны в рублях. Токены не сгорают и переносятся между периодами.
            Возможен счёт на оплату для юридических лиц.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-surface-800/40">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ShieldCheck className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold">Готовы автоматизировать SEO?</h2>
          <p className="mt-4 text-surface-400 text-lg">
            Зарегистрируйтесь и получите 2 000 токенов в подарок — этого хватит на первый контент-план и пару статей.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl text-base font-semibold transition shadow-lg shadow-brand-500/30"
          >
            Создать аккаунт
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/40 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-surface-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>SEOSH.AI · © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition">Войти</Link>
            <a href="#pricing" className="hover:text-white transition">Тарифы</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
