"use client";

/**
 * @component Header
 * @description Top header bar with search, language switcher, and user menu.
 */

import {
  Search,
  Bell,
  Globe,
  User,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-16 border-b border-surface-800/50 bg-surface-950/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchFocused ? "w-96" : "w-72"}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search projects, keywords..."
            className="input-field pl-10 py-2 text-sm"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-surface-500 bg-surface-800 border border-surface-700 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button className="btn-ghost gap-1.5 text-sm" id="language-switcher">
            <Globe className="w-4 h-4" />
            <span>EN</span>
          </button>

          {/* Notifications */}
          <button className="btn-ghost relative p-2" id="notifications-btn">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          </button>

          {/* User menu */}
          <button className="flex items-center gap-2 btn-ghost pl-2 pr-3" id="user-menu-btn">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-surface-200">Guest</p>
              <p className="text-xs text-surface-500">Free Plan</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
