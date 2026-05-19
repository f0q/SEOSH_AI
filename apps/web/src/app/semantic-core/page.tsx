"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { Brain, Plus, Globe, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useProject } from "@/lib/project-context";

export default function SemanticCoreDashboard() {
  const t = useTranslations("semanticCore");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const { activeProject } = useProject();

  const { data: cores, isLoading } = trpc.semanticCore.getMany.useQuery(
    { projectId: activeProject?.id },
    { enabled: !!activeProject }
  );
  const deleteMutation = trpc.semanticCore.delete.useMutation();

  const handleDelete = async (coreId: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteMutation.mutateAsync({ semanticCoreId: coreId });
      utils.semanticCore.getMany.invalidate();
      utils.dashboard.getOverview.invalidate();
    } catch (e) {
      console.error(e);
    }
  };

  // "Semantic Core" / "Семантическое ядро" — split for the gradient highlight.
  // EN: last word is "Core". RU: last word is "ядро".
  const titleText = t("title");
  const highlight = t("titleHighlight");
  const titleHead = titleText.endsWith(highlight)
    ? titleText.slice(0, titleText.length - highlight.length)
    : titleText + " ";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-50">
              {titleHead}<span className="gradient-text-brand">{highlight}</span>
            </h1>
            <p className="text-surface-400 mt-1.5 text-base">
              {t("subtitleLong")}
            </p>
          </div>
          {cores && cores.length > 0 ? (
            <Link href={`/semantic-core/${cores[0].id}`} className="btn-primary">
              <Brain className="w-4 h-4 fill-white" />
              {t("editCore")}
            </Link>
          ) : activeProject ? (
            <Link href="/semantic-core/new" className="btn-primary">
              <Plus className="w-4 h-4 fill-white" />
              {t("newCore")}
            </Link>
          ) : null}
        </div>

        {/* Dashboard Content */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                <p className="text-surface-400">{t("loading")}</p>
              </div>
            </div>
          ) : !cores || cores.length === 0 ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-medium text-surface-100 mb-2">{t("noCoresTitle")}</h3>
              <p className="text-surface-400 max-w-sm mb-6">
                {!activeProject ? t("noProjectHint") : t("noCoresHint")}
              </p>
              {activeProject && (
                <Link href="/semantic-core/new" className="btn-primary">
                  <Plus className="w-4 h-4 fill-white" />
                  {t("createFirst")}
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-800/50">
                    <th className="p-4 pl-6 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      {t("columns.target")}
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      {t("columns.keywords")}
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      {t("columns.categories")}
                    </th>
                    <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      {t("columns.date")}
                    </th>
                    <th className="p-4 pr-6 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/30">
                  {cores.map((core: any) => (
                    <tr
                      key={core.id}
                      className="group hover:bg-surface-800/20 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <Link href={`/semantic-core/${core.id}`} className="block">
                          <div className="font-medium text-surface-200 group-hover:text-brand-400 transition-colors flex items-center gap-2">
                            <Globe className="w-4 h-4 text-surface-500 flex-shrink-0" />
                            {activeProject?.name || t("unknownProject")}
                          </div>
                          <div className="text-xs text-surface-500 mt-1">
                            ID: {core.id.split('-')[0]}…
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-surface-300 font-medium">{core._count.queries}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-surface-300">{core._count.categories}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-sm text-surface-400 truncate">
                          {new Date(core.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleDelete(core.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title={t("deleteTitle")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
