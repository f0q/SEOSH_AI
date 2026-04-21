"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Plus,
  Brain,
  FileText,
  BarChart3,
  Zap,
  ArrowRight,
  TrendingUp,
  Target,
  Rocket,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/trpc/client";

// ─── Quick Action Cards ─────────────────────────────────────────────────

const quickActions = [
  {
    title: "Autopilot",
    description: "Enable automatic content generation",
    icon: Zap,
    href: "/autopilot",
    gradient: "from-orange-500 to-rose-500",
    shadow: "shadow-orange-500/20",
  },
  {
    title: "Semantic Core",
    description: "Analyze and cluster your keywords with AI",
    icon: Brain,
    href: "/semantic-core",
    gradient: "from-cyan-500 to-blue-500",
    shadow: "shadow-cyan-500/20",
  },
  {
    title: "Create Content",
    description: "Generate SEO-optimized articles with AI",
    icon: FileText,
    href: "/content/new",
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/20",
  },
  {
    title: "New Project",
    description: "Set up a new website for SEO optimization",
    icon: Plus,
    href: "/projects/new",
    gradient: "from-brand-500 to-accent-500",
    shadow: "shadow-brand-500/20",
  },
];

// ─── Stats Cards ────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";

// ─── Recent Activity ────────────────────────────────────────────────────

const recentActivity: Array<{
  action: string;
  project: string;
  time: string;
  icon: React.ElementType;
}> = [];

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.dashboard.getOverview.useQuery();

  const statsProps = [
    { label: "Projects", value: data?.stats.projects ?? 0, change: null, icon: Target },
    { label: "Keywords / Cores", value: data?.stats.semanticCores ?? 0, change: null, icon: Brain },
    { label: "Content Pieces", value: data?.stats.contentPieces ?? 0, change: null, icon: FileText },
    { label: "Published", value: data?.stats.published ?? 0, change: null, icon: Rocket },
  ];

  // Determine Getting Started Checklist mapping
  const steps = [
    { step: "Create your first project", done: (data?.stats.projects ?? 0) > 0 },
    { step: "Build semantic core", done: (data?.stats.semanticCores ?? 0) > 0 },
    { step: "Generate first content", done: (data?.stats.contentPieces ?? 0) > 0 },
  ];
  const completedStepsCount = steps.filter(s => s.done).length;

  const handleSmartStart = () => {
    if (data?.nextStep?.href) {
      router.push(data.nextStep.href);
    } else {
      router.push("/projects/new");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-50">
              Welcome to <span className="gradient-text-brand">SEOSH.AI</span>
            </h1>
            <p className="text-surface-400 mt-1.5 text-base">
              Your all-in-one SEO automation platform. Let's grow your search traffic.
            </p>
          </div>
          <button 
            onClick={handleSmartStart}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
            Smart Start
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsProps.map((stat) => (
            <div
              key={stat.label}
              className="glass-card glass-card-hover p-5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-surface-400">{stat.label}</span>
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <stat.icon className="w-4.5 h-4.5 text-brand-400" />
                </div>
              </div>
              {isLoading ? (
                <div className="h-9 w-16 bg-surface-800 animate-pulse rounded-md" />
              ) : (
                <p className="text-3xl font-bold text-surface-50">{stat.value}</p>
              )}
              {stat.change && (
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">{stat.change}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="glass-card glass-card-hover p-5 group transition-all duration-300 hover:-translate-y-0.5"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} mb-4 group-hover:scale-105 transition-transform`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-surface-100 mb-1">{action.title}</h3>
                <p className="text-sm text-surface-400 mb-3">{action.description}</p>
                <div className="flex items-center gap-1 text-sm text-brand-400 group-hover:gap-2 transition-all">
                  <span>Get started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Row: Recent Activity + Getting Started */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 glass-card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-surface-500" />
                </div>
                <p className="text-surface-400 mb-1">No activity yet</p>
                <p className="text-sm text-surface-500">
                  Create your first project to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-800/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 truncate">{item.action}</p>
                      <p className="text-xs text-surface-500">{item.project}</p>
                    </div>
                    <span className="text-xs text-surface-500 flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Getting Started Checklist */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Getting Started</h2>
            <div className="space-y-3">
              {steps.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    item.done
                      ? "bg-emerald-500/5 border border-emerald-500/10"
                      : "bg-surface-800/20 border border-surface-800/30"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      item.done
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-surface-600"
                    }`}
                  >
                    {item.done && (
                      <span className="text-emerald-400 text-xs">✓</span>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      item.done ? "text-surface-300 line-through" : "text-surface-200"
                    }`}
                  >
                    {item.step}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-surface-800/50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-surface-400">Progress</span>
                <span className="text-brand-400 font-medium">{completedStepsCount}/{steps.length}</span>
              </div>
              <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
                  style={{ width: `${(completedStepsCount / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
