"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Sparkles, Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg(t("errors.mismatch"));
      return;
    }
    if (password.length < 8) {
      setErrorMsg(t("errors.tooShort"));
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: password,
          token,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message || t("errors.expired"));
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("errors.generic"));
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <div className="glass-card p-8 text-center">
        <h2 className="text-xl font-semibold text-surface-100 mb-2">{t("invalidLinkTitle")}</h2>
        <p className="text-sm text-surface-400 mb-6">
          {t("invalidLinkBody")}
        </p>
        <Link href="/forgot-password" className="btn-primary">
          {t("requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      {status === "success" ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-2">{t("successTitle")}</h2>
          <p className="text-sm text-surface-400 mb-4">
            {t("successBody")}
          </p>
          <p className="text-xs text-surface-500">{t("redirecting")}</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold text-surface-100 mb-1">{t("title")}</h2>
            <p className="text-sm text-surface-400">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-300 mb-1.5">
                {t("newPassword")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("newPasswordPlaceholder")}
                  required
                  minLength={8}
                  className="input-field w-full pr-10"
                  disabled={status === "loading"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-surface-300 mb-1.5">
                {t("confirmPassword")}
              </label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPlaceholder")}
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
              disabled={status === "loading" || !password || !confirmPassword}
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
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={
          <div className="glass-card p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
