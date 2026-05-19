import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LEGAL } from "@/lib/legal-info";

const TABS = [
  { href: "/legal/offer", label: "Договор оферты" },
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/payment", label: "Оплата и услуги" },
  { href: "/legal/refund", label: "Обмен и возврат" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      <header className="border-b border-surface-800/50 backdrop-blur-md sticky top-0 z-50 bg-surface-950/80">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">SEOSH.AI</span>
          </Link>
          <Link href="/landing" className="text-sm text-surface-300 hover:text-white transition">
            ← На главную
          </Link>
        </div>
      </header>

      <nav className="border-b border-surface-800/40">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap gap-2 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="px-3 py-1.5 rounded-lg text-surface-300 hover:bg-surface-800/60 hover:text-white transition"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <article className="legal-article">
          {children}
        </article>

        <footer className="mt-16 pt-6 border-t border-surface-800/40 text-xs text-surface-500 space-y-1">
          <p>Редакция от {LEGAL.lastUpdated}</p>
          <p>
            {LEGAL.legalForm} {LEGAL.fullName} · ИНН {LEGAL.inn} ·{" "}
            <a href={`mailto:${LEGAL.email}`} className="text-brand-400">{LEGAL.email}</a> ·{" "}
            <a href={`tel:${LEGAL.phone.replace(/[^+\d]/g, "")}`} className="text-brand-400">{LEGAL.phone}</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
