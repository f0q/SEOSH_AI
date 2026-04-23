"use client";

/**
 * @component Sidebar
 * @description Main navigation sidebar.
 * - Prominent project switcher right below logo (the "main character")
 * - Autopilot section at bottom with readiness bar tied to the active project
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Brain,
  FileText,
  BarChart3,
  Bot,
  Settings,
  Coins,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Zap,
  Settings2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { useProject } from "@/lib/project-context";

// ── click-outside helper ──────────────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/project-settings", icon: Settings2, label: "Project Settings" },
  { href: "/semantic-core", icon: Brain, label: "Semantic Core" },
  { href: "/content", icon: FileText, label: "Content" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

const bottomItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/billing", icon: Coins, label: "Billing" },
];

// ── Project Switcher ──────────────────────────────────────────────────────────
function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { activeProject, projects, setActiveProjectId } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  if (collapsed) {
    return (
      <div className="px-3 py-2 border-b border-surface-800/50">
        <div
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-brand-500/20 flex items-center justify-center cursor-pointer hover:border-brand-500/40 transition-all"
          title={activeProject?.name ?? "No project"}
          onClick={() => setOpen((o) => !o)}
        >
          <FolderKanban className="w-4 h-4 text-brand-400" />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="px-3 py-3 border-b border-surface-800/50 relative">
      <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-1.5 px-1">Active Project</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-brand-500/8 border border-brand-500/15 hover:border-brand-500/30 hover:bg-brand-500/12 transition-all group"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/30">
          <FolderKanban className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-surface-100 truncate leading-tight">
            {activeProject?.name ?? "No project yet"}
          </p>
          {activeProject?.url && (
            <p className="text-[10px] text-surface-500 truncate leading-tight mt-0.5">
              {activeProject.url.replace(/^https?:\/\//, "")}
            </p>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 dropdown-panel p-1 z-50 animate-slide-up">
          {projects.length === 0 ? (
            <p className="text-xs text-surface-500 px-3 py-2">No projects yet</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProjectId(p.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800/60 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500/30 to-accent-500/30 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-3 h-3 text-brand-400" />
                </div>
                <span className="text-sm text-surface-200 flex-1 truncate">{p.name}</span>
                {activeProject?.id === p.id && (
                  <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
          <div className="border-t border-surface-800/50 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); router.push("/projects/new"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-800/60 transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-sm text-surface-400">New project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Readiness Bar ─────────────────────────────────────────────────────────────
function ReadinessBar({ collapsed }: { collapsed: boolean }) {
  const { activeProject } = useProject();
  const { data: overview } = trpc.dashboard.getOverview.useQuery();

  const score = (() => {
    if (!overview || !activeProject) return 0;
    let s = 0;
    if (activeProject) s += 33;                      // Project exists
    if (overview.stats.semanticCores > 0) s += 33;   // Has semantic core
    // Future: +34 for company profile completeness
    return Math.min(s, 100);
  })();

  const color =
    score < 34 ? "from-red-500 to-orange-500"
    : score < 67 ? "from-orange-500 to-amber-400"
    : "from-brand-500 to-accent-500";

  const label =
    score === 0 ? "Start by creating a project"
    : score < 67 ? "Add a semantic core"
    : score < 100 ? "Fill company details"
    : "Ready to launch!";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <Zap className={`w-4 h-4 ${score >= 67 ? "text-brand-400" : "text-surface-500"}`} />
        <div className="w-1 h-8 bg-surface-800 rounded-full overflow-hidden">
          <div
            className={`w-full bg-gradient-to-b ${color} rounded-full transition-all duration-700`}
            style={{ height: `${score}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <Link href="/autopilot" className="glass-card p-3 mb-1 block hover:border-brand-500/25 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-medium text-surface-300">Autopilot Readiness</span>
        </div>
        <span className="text-xs font-semibold text-surface-300">{score}%</span>
      </div>
      <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-surface-500 leading-tight">{label}</p>
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px]" : "w-[260px]"}
        bg-surface-900/80 backdrop-blur-xl border-r border-surface-800/50`}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-surface-800/50 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight animate-fade-in">
              <span className="text-surface-100">SEO</span>
              <span className="gradient-text">SH</span>
              <span className="text-surface-400 text-sm">.AI</span>
            </h1>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost p-1.5 rounded-lg"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Active Project Switcher (the main character) ── */}
      <ProjectSwitcher collapsed={collapsed} />

      {/* ── Main Nav ── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "nav-item-active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="px-3 pb-4 space-y-1 flex-shrink-0">
        {/* Autopilot — highlighted */}
        <Link
          href="/autopilot"
          className={`nav-item ${pathname.startsWith("/autopilot") ? "nav-item-active" : ""} ${collapsed ? "justify-center px-2" : ""} border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 mb-2`}
          title={collapsed ? "Autopilot" : undefined}
        >
          <Bot className="w-5 h-5 flex-shrink-0 text-brand-400" />
          {!collapsed && <span className="animate-fade-in text-brand-300 font-medium">Autopilot</span>}
        </Link>

        {/* Readiness bar */}
        <ReadinessBar collapsed={collapsed} />

        {/* Token balance */}
        {!collapsed && (
          <div className="glass-card p-3 animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-surface-400">Tokens</span>
              <span className="badge badge-brand text-xs">Free</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-400" />
              <span className="text-lg font-bold text-surface-100">200</span>
            </div>
            <div className="mt-2 h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full w-full" />
            </div>
          </div>
        )}

        {/* Settings / Billing */}
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "nav-item-active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
