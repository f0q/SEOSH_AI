"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { trpc } from "@/trpc/client";
import { useSession } from "@/lib/auth-client";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

export default function LocaleSwitcher() {
  const router = useRouter();
  const t = useTranslations("header");
  const current = useLocale() as Locale;
  const { data: session } = useSession();
  const setLocaleMut = trpc.settings.setLocale.useMutation();

  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const choose = (locale: Locale) => {
    if (locale === current) {
      setOpen(false);
      return;
    }
    // Cookie wins in resolveLocale, so this takes effect immediately.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    if (session?.user) {
      // Best-effort persistence; cookie is already set so don't block UI on it.
      setLocaleMut.mutate({ locale });
    }
    setOpen(false);
    startTransition(() => router.refresh());
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost gap-1.5 text-sm"
        aria-label={t("language")}
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase">{current}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 dropdown-panel p-1 animate-slide-up z-50">
          {LOCALES.map((code) => (
            <button
              key={code}
              onClick={() => choose(code)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-surface-800/60 transition-colors"
            >
              <span className="text-surface-200">{t(`languages.${code}`)}</span>
              {current === code && <Check className="w-3.5 h-3.5 text-brand-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
