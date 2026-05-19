"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: "/reset-password",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(`${t("errorPrefix")} ${res.status}: ${data?.message || JSON.stringify(data) || ""}`);
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("networkError"));
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 bg-grid">
      <div className="absolute top-4 right-4 z-10">
        <LocaleSwitcher />
      </div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-surface-100">SEO</span>
              <span className="gradient-text">SH</span>
              <span className="text-surface-400 text-lg">.AI</span>
            </h1>
          </div>
        </div>

        <div className="glass-card p-8">
          {status === "success" ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-surface-100 mb-2">{t("successTitle")}</h2>
              <p className="text-sm text-surface-400 mb-6">
                {t.rich("successBody", {
                  email: () => <strong className="text-surface-200">{email}</strong>,
                })}
              </p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-brand-400" />
                </div>
                <h2 className="text-xl font-semibold text-surface-100 mb-1">{t("title")}</h2>
                <p className="text-sm text-surface-400">
                  {t("subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-surface-300 mb-1.5">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                    className="input-field w-full"
                    disabled={status === "loading"}
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-400">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || !email}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-surface-500 hover:text-surface-300 inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t("backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
