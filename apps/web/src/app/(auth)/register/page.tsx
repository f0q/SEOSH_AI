"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, CheckCircle2, Eye, ArrowRight, Mail } from "lucide-react";
import { trpc } from "@/trpc/client";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

export default function RegisterPage() {
  const t = useTranslations("register");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const joinMut = trpc.waitlist.join.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    joinMut.mutate({
      email,
      name: name || undefined,
      company: company || undefined,
      message: message || undefined,
      source: "register-page",
    });
  };

  const tryDemo = async () => {
    setDemoError(null);
    setDemoLoading(true);
    try {
      const res = await fetch("/api/demo/login", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      window.location.href = "/projects";
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : t("tryDemoError"));
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 bg-grid">
      <div className="absolute top-4 right-4 z-10">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md animate-fade-in space-y-6">
        {/* Logo */}
        <Link href="/landing" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-surface-50">SEOSH.AI</span>
        </Link>

        {/* Demo button */}
        <button
          onClick={tryDemo}
          disabled={demoLoading}
          className="w-full glass-card p-4 flex items-center gap-3 hover:border-brand-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            {demoLoading ? (
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            ) : (
              <Eye className="w-5 h-5 text-brand-400" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-surface-100">{t("tryDemo")}</p>
            <p className="text-xs text-surface-500">
              {t("tryDemoHint")}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-500 group-hover:text-brand-400 transition-colors flex-shrink-0" />
        </button>
        {demoError && (
          <p className="text-xs text-red-400 -mt-3 text-center">{demoError}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-surface-800/50" />
          <span className="text-xs text-surface-500 uppercase tracking-wider">{tCommon("or")}</span>
          <div className="flex-1 h-px bg-surface-800/50" />
        </div>

        {/* Waitlist form */}
        {submitted ? (
          <div className="glass-card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-50">{t("thanksTitle")}</h2>
              <p className="text-sm text-surface-400 mt-2">
                {t.rich("thanksBody", {
                  email: () => <span className="text-surface-200">{email}</span>,
                })}
              </p>
            </div>
            <Link href="/landing" className="text-sm text-brand-400 hover:text-brand-300 inline-block">
              {t("backHome")}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="glass-card p-6 space-y-4">
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold text-surface-50">{t("waitlistTitle")}</h1>
              <p className="text-xs text-surface-500 mt-1">
                {t("waitlistSubtitle")}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">{t("email")} *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-surface-400 mb-1.5 block">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-surface-400 mb-1.5 block">{t("company")}</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t("companyPlaceholder")}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">{t("messageLabel")}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>

            {joinMut.error && (
              <p className="text-xs text-red-400">{joinMut.error.message}</p>
            )}

            <button
              type="submit"
              disabled={!email || joinMut.isPending}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joinMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("submit")
              )}
            </button>

            <p className="text-[11px] text-surface-500 text-center leading-relaxed">
              {t.rich("privacyNotice", {
                privacy: () => (
                  <Link href="/legal/privacy" className="text-brand-400 hover:underline">
                    {t("privacyLink")}
                  </Link>
                ),
              })}
            </p>
          </form>
        )}

        <div className="text-center text-xs text-surface-500">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">{t("signIn")}</Link>
        </div>
      </div>
    </div>
  );
}
