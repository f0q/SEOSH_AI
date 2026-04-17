import DashboardLayout from "@/components/layout/DashboardLayout";
import { Settings, Globe, Brain, Shield, Bell } from "lucide-react";

export const metadata = { title: "Settings" };

const settingSections = [
  {
    title: "AI Models",
    description: "Choose AI models for content generation, categorization, and analysis",
    icon: Brain,
    color: "text-brand-400",
    bg: "bg-brand-500/10",
  },
  {
    title: "Language",
    description: "Change the interface language (English, Russian)",
    icon: Globe,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    title: "Notifications",
    description: "Configure email and Telegram notifications",
    icon: Bell,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    title: "Security",
    description: "Change password, manage sessions, and API keys",
    icon: Shield,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50">Settings</h1>
          <p className="text-surface-400 mt-1">Configure your SEOSH.AI experience</p>
        </div>
        <div className="space-y-3">
          {settingSections.map((section) => (
            <button
              key={section.title}
              className="glass-card glass-card-hover p-5 w-full text-left flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className={`w-11 h-11 rounded-xl ${section.bg} flex items-center justify-center`}>
                <section.icon className={`w-5 h-5 ${section.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-surface-100">{section.title}</h3>
                <p className="text-sm text-surface-400">{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
