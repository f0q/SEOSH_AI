"use client";

/**
 * @component Header
 * @description Top header bar with search, language switcher, notifications, and user menu.
 */

import {
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Settings,
  CreditCard,
  Check,
  Info,
  Zap,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { signOut, useSession } from "@/lib/auth-client";
import LocaleSwitcher from "./LocaleSwitcher";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

const NOTIF_DEFS = [
  { id: 1, icon: Zap, color: "text-brand-400", key: "autopilotReady", time: { unit: "minutesAgo", n: 2 }, read: false },
  { id: 2, icon: Info, color: "text-blue-400", key: "semanticCoreSaved", time: { unit: "hoursAgo", n: 1 }, read: false },
  { id: 3, icon: Check, color: "text-emerald-400", key: "projectCreated", time: { unit: "hoursAgo", n: 3 }, read: true },
] as const;

export default function Header() {
  const router = useRouter();
  const t = useTranslations("header");
  const { data: session, isPending: sessionLoading } = useSession();
  const isDemo = Boolean((session?.user as { isDemo?: boolean } | undefined)?.isDemo);

  const [searchFocused, setSearchFocused] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [reads, setReads] = useState<Record<number, boolean>>(
    Object.fromEntries(NOTIF_DEFS.map((n) => [n.id, n.read]))
  );

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const unreadCount = NOTIF_DEFS.filter((n) => !reads[n.id]).length;
  const markAllRead = () => setReads(Object.fromEntries(NOTIF_DEFS.map((n) => [n.id, true])));

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = sessionLoading ? "" : (session?.user?.name || t("guest"));
  const userEmail = session?.user?.email || "";

  return (
    <header className="h-16 border-b border-surface-800/50 bg-surface-950/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">

        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchFocused ? "w-96" : "w-72"}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="input-field !pl-10 py-2 text-sm"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-surface-500 bg-surface-800 border border-surface-700 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          {/* ── Notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((o) => !o); setUserOpen(false); }}
              className="btn-ghost relative p-2"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 dropdown-panel animate-slide-up z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
                  <span className="text-sm font-semibold text-surface-100">{t("notifications.title")}</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                      {t("notifications.markAllRead")}
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-surface-800/30">
                  {NOTIF_DEFS.map((n) => {
                    const Icon = n.icon;
                    const read = reads[n.id];
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-800/30 ${!read ? "bg-brand-500/5" : ""}`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 ${n.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-200">
                            {t(`notifications.items.${n.key}.title`)}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5 truncate">
                            {t(`notifications.items.${n.key}.body`)}
                          </p>
                        </div>
                        <span className="text-[10px] text-surface-600 flex-shrink-0 mt-0.5">
                          {t(`notifications.time.${n.time.unit}`, { n: n.time.n })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-surface-800/50 text-center">
                  <button
                    onClick={() => { setNotifOpen(false); router.push("/"); }}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    {t("notifications.viewAll")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── User menu ── */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => { setUserOpen((o) => !o); setNotifOpen(false); }}
              className="flex items-center gap-2 btn-ghost pl-2 pr-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-surface-200 max-w-[120px] truncate">{userName}</p>
                <p className="text-xs text-surface-500">{isDemo ? t("demoMode") : t("freePlan")}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-surface-500 transition-transform ${userOpen ? "rotate-180" : ""}`} />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 dropdown-panel p-1 animate-slide-up z-50">
                <div className="px-3 py-2.5 border-b border-surface-800/50 mb-1">
                  <p className="text-sm font-medium text-surface-100 truncate">{userName}</p>
                  <p className="text-xs text-surface-500 truncate">{userEmail}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setUserOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
                >
                  <Settings className="w-4 h-4 text-surface-500" />
                  {t("settings")}
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setUserOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-surface-500" />
                  {t("billing")}
                </Link>

                <div className="border-t border-surface-800/50 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/8 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("signOut")}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
