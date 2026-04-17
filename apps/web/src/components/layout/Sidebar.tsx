"use client";

/**
 * @component Sidebar
 * @description Main navigation sidebar for the SEOSH.AI dashboard.
 * Features glass morphism design, animated nav items, and token balance display.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Brain,
  FileText,
  BarChart3,
  Settings,
  Coins,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", labelRu: "Панель" },
  { href: "/projects", icon: FolderKanban, label: "Projects", labelRu: "Проекты" },
  { href: "/semantic-core", icon: Brain, label: "Semantic Core", labelRu: "Сем. ядро" },
  { href: "/content", icon: FileText, label: "Content", labelRu: "Контент" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", labelRu: "Аналитика" },
];

const bottomItems = [
  { href: "/settings", icon: Settings, label: "Settings", labelRu: "Настройки" },
  { href: "/billing", icon: Coins, label: "Billing", labelRu: "Баланс" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px]" : "w-[260px]"}
        bg-surface-900/80 backdrop-blur-xl border-r border-surface-800/50`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-surface-800/50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-surface-100">SEO</span>
                <span className="gradient-text">SH</span>
                <span className="text-surface-400 text-sm">.AI</span>
              </h1>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost p-1.5 rounded-lg"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col justify-between h-[calc(100%-4rem)] px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "nav-item-active" : ""} ${
                  collapsed ? "justify-center px-2" : ""
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="animate-fade-in truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="space-y-1">
          {/* Token Balance */}
          {!collapsed && (
            <div className="glass-card p-3 mb-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-surface-400">Tokens</span>
                <span className="badge badge-brand text-xs">Free</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-brand-400" />
                <span className="text-lg font-bold text-surface-100">200</span>
              </div>
              <div className="mt-2 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "nav-item-active" : ""} ${
                  collapsed ? "justify-center px-2" : ""
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
