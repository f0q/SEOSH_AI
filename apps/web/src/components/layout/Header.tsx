"use client";

/**
 * @component Header
 * @description Top header bar with search, language switcher, notifications, and user menu.
 * All dropdowns are fully functional with click-outside-to-close behaviour.
 */

import {
  Search,
  Bell,
  Globe,
  User,
  ChevronDown,
  LogOut,
  Settings,
  CreditCard,
  Check,
  X,
  Info,
  Zap,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "@/lib/auth-client";

// ── helper: close dropdown when clicking outside ──────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "RU", label: "Русский" },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, icon: Zap, color: "text-brand-400", title: "Autopilot ready", body: "Your project config is 80% complete.", time: "2m ago", read: false },
  { id: 2, icon: Info, color: "text-blue-400", title: "Semantic core saved", body: "123 keywords clustered successfully.", time: "1h ago", read: false },
  { id: 3, icon: Check, color: "text-emerald-400", title: "Project created", body: "Your new project was set up.", time: "3h ago", read: true },
];

export default function Header() {
  const router = useRouter();
  const { data: session } = useSession();

  const [searchFocused, setSearchFocused] = useState(false);
  const [lang, setLang] = useState("EN");

  // Dropdown open states
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // Refs for click-outside
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(langRef, () => setLangOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = session?.user?.name || "Guest";
  const userEmail = session?.user?.email || "";

  return (
    <header className="h-16 border-b border-surface-800/50 bg-surface-950/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">

        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchFocused ? "w-96" : "w-72"}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search projects, keywords..."
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

          {/* ── Language switcher ── */}
          <div ref={langRef} className="relative">
            <button
              id="language-switcher"
              onClick={() => { setLangOpen((o) => !o); setNotifOpen(false); setUserOpen(false); }}
              className="btn-ghost gap-1.5 text-sm"
            >
              <Globe className="w-4 h-4" />
              <span>{lang}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 dropdown-panel p-1 animate-slide-up z-50">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-surface-800/60 transition-colors"
                  >
                    <span className="text-surface-200">{l.label}</span>
                    {lang === l.code && <Check className="w-3.5 h-3.5 text-brand-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              id="notifications-btn"
              onClick={() => { setNotifOpen((o) => !o); setLangOpen(false); setUserOpen(false); }}
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
                  <span className="text-sm font-semibold text-surface-100">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-surface-800/30">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-800/30 ${!n.read ? "bg-brand-500/5" : ""}`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 ${n.color}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200">{n.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5 truncate">{n.body}</p>
                      </div>
                      <span className="text-[10px] text-surface-600 flex-shrink-0 mt-0.5">{n.time}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-surface-800/50 text-center">
                  <button
                    onClick={() => { setNotifOpen(false); router.push("/"); }}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    View all on dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── User menu ── */}
          <div ref={userRef} className="relative">
            <button
              id="user-menu-btn"
              onClick={() => { setUserOpen((o) => !o); setLangOpen(false); setNotifOpen(false); }}
              className="flex items-center gap-2 btn-ghost pl-2 pr-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-surface-200 max-w-[120px] truncate">{userName}</p>
                <p className="text-xs text-surface-500">Free Plan</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-surface-500 transition-transform ${userOpen ? "rotate-180" : ""}`} />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 dropdown-panel p-1 animate-slide-up z-50">
                {/* User info */}
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
                  Settings
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setUserOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-surface-500" />
                  Billing
                </Link>

                <div className="border-t border-surface-800/50 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/8 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
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
