"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Download, RefreshCw, Loader2, Check, Copy } from "lucide-react";
import { trpc } from "@/trpc/client";

export default function LlmsTxtSection({ projectId }: { projectId: string }) {
  const t = useTranslations("projectSettings.llmsTxt");
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = trpc.projects.getLlmsTxt.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const regenerate = trpc.projects.regenerateLlmsTxt.useMutation({
    onSuccess: () => {
      utils.projects.getLlmsTxt.invalidate({ projectId });
    },
  });

  const handleCopy = async () => {
    if (!data?.text) return;
    await navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadUrl = `/api/projects/${projectId}/llms.txt`;
  const updatedAt = data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-surface-800/50 bg-surface-800/20 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-400" />
          {t("title")}
        </h2>
        {updatedAt && (
          <span className="text-[11px] text-surface-500">{t("updated", { when: updatedAt })}</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-surface-400 leading-relaxed">
          {t("description")}
        </p>

        <div className="flex flex-wrap gap-2">
          <a
            href={downloadUrl}
            download="llms.txt"
            className="btn-primary gap-2 text-sm"
            aria-disabled={!data?.text || undefined}
            onClick={e => {
              if (!data?.text) e.preventDefault();
            }}
          >
            <Download className="w-4 h-4" />
            {t("download")}
          </a>

          <button
            type="button"
            onClick={() => regenerate.mutate({ projectId })}
            disabled={regenerate.isPending}
            className="btn-secondary gap-2 text-sm"
          >
            {regenerate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {data?.text ? t("regenerate") : t("generate")}
          </button>

          {data?.text && (
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary gap-2 text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? t("copied") : t("copy")}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
          </div>
        ) : data?.text ? (
          <pre className="bg-surface-900/70 border border-surface-800/50 rounded-md p-3 text-[12px] leading-relaxed text-surface-300 max-h-72 overflow-auto whitespace-pre-wrap font-mono">
            {data.text}
          </pre>
        ) : (
          <div className="bg-surface-900/40 border border-dashed border-surface-800/50 rounded-md p-4 text-sm text-surface-500 text-center">
            {t("empty")}
          </div>
        )}

        <div className="text-xs text-surface-500 leading-relaxed border-t border-surface-800/50 pt-3">
          {t("howto")}
        </div>
      </div>
    </div>
  );
}
