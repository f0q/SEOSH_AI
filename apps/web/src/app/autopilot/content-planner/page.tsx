"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { useProject } from "@/lib/project-context";
import { PAGE_TYPES, getDefaultSchema, getDefaultWordCount } from "@seosh/shared/seo";
import {
  LayoutList, Plus, Trash2, ChevronLeft, Users, Mail,
  Sparkles, ShieldCheck, Lightbulb, X, Check, Loader2,
  ExternalLink, Copy, CheckCheck, Tag, Search, ChevronDown, Wand2, AlertCircle,
  Upload, FileSpreadsheet, FileText as FileTextIcon,
} from "lucide-react";
import { IdeationModal } from "@/components/content-planner/IdeationModal";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "DRAFT",       label: "Not Started",  color: "text-surface-400",  bg: "bg-surface-700/40 border-surface-600/30" },
  { value: "IN_PROGRESS", label: "In Progress",  color: "text-amber-400",    bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "REVIEW",      label: "Review",       color: "text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "GENERATED",   label: "Generated",    color: "text-indigo-400",   bg: "bg-indigo-500/10 border-indigo-500/20" },
  { value: "OPTIMIZED",   label: "Optimized",    color: "text-teal-400",     bg: "bg-teal-500/10 border-teal-500/20" },
  { value: "PUBLISHED",   label: "Published",    color: "text-emerald-400",  bg: "bg-emerald-500/10 border-emerald-500/20" },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

const PAGE_TYPE_OPTIONS = PAGE_TYPES.map((pt) => pt.slug);

const SCHEMA_OPTIONS = Array.from(
  new Set(PAGE_TYPES.map((pt) => pt.defaultSchema))
);

// ─── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  placeholder = "—",
  className = "",
  multiline = false,
  warning = false,
  warningText = "",
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  warning?: boolean;
  warningText?: string;
  list?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
      autoFocus: true,
      className: `w-full bg-surface-800 border border-brand-500/50 rounded px-2 py-1 text-xs text-surface-100 outline-none focus:border-brand-400 ${className}`,
    };
    return multiline
      ? <textarea {...sharedProps} rows={3} />
      : <input {...sharedProps} list={list} />;
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`block cursor-text min-h-[20px] text-xs hover:text-surface-100 transition-colors ${value ? "text-surface-200" : "text-surface-600 italic"} ${className}`}
      title={value || placeholder}
    >
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="truncate">{value || placeholder}</span>
        {warning && (
          <span className="shrink-0 flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" title={warningText}>
            <AlertCircle className="w-3 h-3" />
          </span>
        )}
      </div>
    </span>
  );
}

// ─── Status badge selector ────────────────────────────────────────────────────

function StatusSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_OPTIONS.find((s) => s.value === value) ?? STATUS_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${cfg.bg} ${cfg.color}`}
      >
        {cfg.label}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-800 border border-surface-700/40 rounded-xl shadow-xl min-w-[140px] overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium border-b border-surface-700/20 last:border-0 hover:bg-surface-700/30 transition-colors ${opt.color}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const invite = trpc.contentPlan.inviteTeamMember.useMutation({
    onSuccess: (data) => {
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-card p-6 w-full max-w-md space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-surface-100">Invite Team Member</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-surface-500">
          Enter the email address. The invitee will receive a link and temporary password to access the content plan.
        </p>

        {!inviteUrl ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input-field text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && invite.mutate({ projectId, email })}
              />
              <button
                onClick={() => invite.mutate({ projectId, email })}
                disabled={!email || invite.isPending}
                className="btn-primary gap-2"
              >
                {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send
              </button>
            </div>
            {invite.error && (
              <p className="text-xs text-red-400">{invite.error.message}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400">Invite created! Share this link with <strong>{email}</strong>:</p>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="input-field text-xs flex-1 font-mono"
              />
              <button onClick={handleCopy} className="btn-secondary gap-2 flex-shrink-0">
                {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-surface-500">
              In dev mode the temporary password is printed in the server console. In production, it will be emailed automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function CsvImportModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; total: number; mappedColumns: string[] } | null>(null);

  const importCsv = trpc.contentPlan.importCsv.useMutation({
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
  });

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      alert("Please upload a .csv, .tsv, or .txt file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText(e.target?.result as string ?? "");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const previewLines = csvText ? csvText.split(/\r?\n/).filter(Boolean).slice(0, 6) : [];
  const headerCols = previewLines.length > 0 ? previewLines[0].split(/[,;]/).length : 0;
  const dataRows = previewLines.length > 1 ? previewLines.length - 1 : 0;
  const totalDataRows = csvText ? csvText.split(/\r?\n/).filter(Boolean).length - 1 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-card p-6 w-full max-w-xl space-y-4 mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-surface-100">Import CSV</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          // ── Success state ──
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Import Complete!</span>
              </div>
              <div className="space-y-1 text-xs text-surface-400">
                <p>✓ <strong className="text-surface-200">{result.created}</strong> rows imported</p>
                {result.skipped > 0 && <p>⊘ {result.skipped} empty rows skipped</p>}
                <p>Mapped columns: {result.mappedColumns.join(", ")}</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          // ── Upload state ──
          <>
            <p className="text-xs text-surface-500">
              Upload a CSV file with columns like: Title, URL, Section, Page Type, Keywords, H1, H2, etc.
              Supports both <strong>English</strong> and <strong>Russian</strong> column headers.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver
                  ? "border-brand-400 bg-brand-500/10"
                  : csvText
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-surface-700/40 hover:border-surface-600/50 hover:bg-surface-800/20"
              }`}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv,.tsv,.txt";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
            >
              {csvText ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-surface-200">{fileName}</p>
                    <p className="text-xs text-surface-500">{headerCols} columns · {totalDataRows} data rows</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCsvText(""); setFileName(""); }}
                    className="ml-2 p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                  <p className="text-sm text-surface-400 mb-1">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-surface-600">Supports .csv, .tsv, .txt</p>
                </>
              )}
            </div>

            {/* Preview */}
            {previewLines.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-surface-400">Preview (first {Math.min(5, dataRows)} rows):</p>
                <div className="overflow-x-auto rounded-lg border border-surface-700/30 bg-surface-800/20">
                  <table className="text-[10px] w-full">
                    <thead>
                      <tr className="bg-surface-800/40">
                        {previewLines[0].split(/[,;]/).map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left text-surface-400 font-medium whitespace-nowrap border-b border-surface-700/30">
                            {h.replace(/"/g, "").trim() || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewLines.slice(1, 6).map((line, ri) => (
                        <tr key={ri} className="border-b border-surface-700/20 last:border-0">
                          {line.split(/[,;]/).map((cell, ci) => (
                            <td key={ci} className="px-2 py-1 text-surface-300 whitespace-nowrap max-w-[150px] truncate">
                              {cell.replace(/"/g, "").trim() || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalDataRows > 5 && (
                  <p className="text-[10px] text-surface-600 text-center">...and {totalDataRows - 5} more rows</p>
                )}
              </div>
            )}

            {/* Error */}
            {importCsv.error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {importCsv.error.message}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button
                onClick={() => importCsv.mutate({ projectId, csvText })}
                disabled={!csvText || importCsv.isPending}
                className="btn-primary gap-2"
              >
                {importCsv.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import {totalDataRows} rows</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Keyword Coverage Stats Bar ───────────────────────────────────────────────

function KeywordStatsBar({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const { data: stats, refetch: refetchStats } = trpc.contentPlan.getKeywordUsageStats.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: latestCore } = trpc.semanticCore.getLatest.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const syncMut = trpc.semanticCore.syncKeywordUsage.useMutation({
    onSuccess: () => {
      refetchStats();
      utils.contentPlan.getByProject.invalidate({ projectId });
    },
  });

  if (!stats || stats.total === 0) return null;

  const coveragePct = Math.round((stats.used / stats.total) * 100);

  return (
    <div className="glass-card px-5 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span className="text-sm font-medium text-surface-200">Keyword Coverage</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-surface-400">
            <span className="font-bold text-surface-200">{stats.total}</span> total
          </span>
          <span className="text-emerald-400">
            <span className="font-bold">{stats.used}</span> covered
          </span>
          <span className="text-surface-400">
            <span className="font-bold text-surface-200">{stats.unused}</span> available
          </span>
          {stats.overUsed > 0 && (
            <span className="text-amber-400">
              <span className="font-bold">{stats.overUsed}</span> over-used
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[120px] max-w-[180px]">
            <div className="h-2 rounded-full bg-surface-800/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  coveragePct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                  coveragePct >= 40 ? 'bg-gradient-to-r from-brand-500 to-cyan-500' :
                  'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="text-[10px] text-surface-500 mt-1 text-right">{coveragePct}%</p>
          </div>
          {latestCore && (
            <button
              onClick={() => syncMut.mutate({ semanticCoreId: latestCore.id })}
              disabled={syncMut.isPending}
              className="btn-ghost gap-1.5 text-xs px-2.5 py-1.5 flex-shrink-0"
              title="Scan content plan and update keyword usage counts"
            >
              {syncMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {syncMut.isPending ? "Syncing…" : "Sync"}
            </button>
          )}
        </div>
      </div>
      {syncMut.isSuccess && (
        <p className="text-xs text-emerald-400 mt-2">
          ✓ Scanned {syncMut.data.synced} keywords — {syncMut.data.matched} matched to content items
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPlannerPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const [showInvite, setShowInvite] = useState(false);
  const [showIdeation, setShowIdeation] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<string | null>(null);
  const [kwSearch, setKwSearch] = useState("");
  const [kwOpen, setKwOpen] = useState(true);
  const utils = trpc.useUtils();

  const projectId = activeProject?.id ?? "";

  const { data, isLoading } = trpc.contentPlan.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );


  const { data: latestCore } = trpc.semanticCore.getLatest.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: projectData } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const siteStructure = Array.isArray((projectData?.companyProfile as any)?.siteStructure) ? (projectData!.companyProfile as any).siteStructure : [];
  const sectionOptions = siteStructure.map((s: any) => ({
    label: s.label,
    urlPrefix: s.url || `/${s.label.toLowerCase().replace(/\s+/g, '-')}`,
  }));
  
  const getSectionUrlPrefix = (sectionLabel?: string | null) => {
    if (!sectionLabel) return "";
    const sec = sectionOptions.find((s: any) => s.label === sectionLabel);
    if (!sec) return "";
    return sec.urlPrefix.endsWith('/') ? sec.urlPrefix : sec.urlPrefix + '/';
  };

  const createItem = trpc.contentPlan.createItem.useMutation({
    onSuccess: () => {
      setRowError(null);
      utils.contentPlan.getByProject.invalidate({ projectId });
    },
    onError: (err) => setRowError(err.message),
  });

  const updateItem = trpc.contentPlan.updateItem.useMutation({
    onSuccess: () => utils.contentPlan.getByProject.invalidate({ projectId }),
  });

  const deleteItem = trpc.contentPlan.deleteItem.useMutation({
    onSuccess: () => utils.contentPlan.getByProject.invalidate({ projectId }),
  });

  const { data: shares = [] } = trpc.contentPlan.listShares.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: kwData } = trpc.contentPlan.getKeywordsByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const allKeywords = kwData?.keywords ?? [];
  const filteredKeywords = kwSearch
    ? allKeywords.filter((k) => k.toLowerCase().includes(kwSearch.toLowerCase()))
    : allKeywords;

  const revokeShare = trpc.contentPlan.revokeShare.useMutation({
    onSuccess: () => utils.contentPlan.listShares.invalidate({ projectId }),
  });

  const items = data?.items ?? [];

  // Compute duplicate titles for warnings
  const duplicateTitles = new Set<string>();
  const seenTitles = new Set<string>();
  items.forEach(item => {
    if (item.metaTitle) {
      const title = item.metaTitle.trim();
      const lower = title.toLowerCase();
      // Ignore empty titles or default placeholders like "Row 1", "Row 42"
      if (title.length > 0 && !/^row\s+\d+$/i.test(lower)) {
        if (seenTitles.has(lower)) {
          duplicateTitles.add(lower);
        }
        seenTitles.add(lower);
      }
    }
  });

  const handleUpdate = useCallback(
    (id: string, field: string, value: unknown) => {
      updateItem.mutate({ id, data: { [field]: value } as Parameters<typeof updateItem.mutate>[0]["data"] });

      // Auto-fill schema + word count when page type changes
      if (field === "pageType" && typeof value === "string" && value) {
        const schema = getDefaultSchema(value);
        const wordCount = getDefaultWordCount(value);
        updateItem.mutate({ id, data: { schemaType: schema, targetWordCount: wordCount } as any });
      }
    },
    [updateItem]
  );

  const addRow = () => {
    if (!projectId) return;
    setRowError(null);
    createItem.mutate({
      projectId,
      data: { url: "", section: "", pageType: "blog_post", priority: 1 },
    });
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeShares = shares.filter((s) => s.status !== "REVOKED");

  if (!activeProject) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-surface-500 text-sm">
          Please select a project first.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/autopilot")}
              className="btn-ghost p-2 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LayoutList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-50">Content Planner</h1>
              <p className="text-xs text-surface-500 mt-0.5">{activeProject.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCsvImport(true)}
              className="btn-ghost gap-2 text-sm"
              title="Import content rows from CSV file"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              Import CSV
            </button>

            <div className="w-px h-6 bg-surface-700/50 mx-2" />

            <button
              onClick={() => setShowIdeation(true)}
              className="btn-primary gap-2 text-sm"
            >
              <Wand2 className="w-4 h-4" />
              Start Planning Content
            </button>

            <button
              onClick={() => setShowInvite(true)}
              className="btn-secondary gap-2 text-sm"
            >
              <Users className="w-4 h-4" />
              Invite
              {activeShares.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center">
                  {activeShares.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {rowError && (
          <div className="glass-card px-4 py-3 border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <span className="text-xs text-red-400 flex-1">{rowError}</span>
            <button onClick={() => setRowError(null)} className="text-surface-500 hover:text-surface-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Keyword Coverage Stats ─────────────────────────────────────── */}
        <KeywordStatsBar projectId={projectId} />

        {/* ── Team shares strip ──────────────────────────────────────────── */}
        {activeShares.length > 0 && (
          <div className="glass-card px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-surface-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Shared with:
            </span>
            {activeShares.map((share) => (
              <div key={share.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                share.status === "ACTIVE"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}>
                <span>{share.email}</span>
                <span className="opacity-60">({share.status === "ACTIVE" ? "active" : "pending"})</span>
                <button
                  onClick={() => revokeShare.mutate({ shareId: share.id })}
                  className="ml-1 hover:text-red-400 transition-colors"
                  title="Revoke access"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="glass-card overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-surface-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading content plan...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <LayoutList className="w-8 h-8 text-surface-600" />
              <p className="text-surface-500 text-sm">No pages yet. Click "Add Row" to start.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" style={{ minWidth: "1400px" }}>
              <thead>
                <tr className="border-b border-surface-700/30">
                  {[
                    { label: "", w: "w-8" },
                    { label: "#", w: "w-8" },
                    { label: "URL", w: "w-52" },
                    { label: "Section", w: "w-28" },
                    { label: "Page Type", w: "w-36" },
                    { label: "Pri", w: "w-12" },
                    { label: "Status", w: "w-32" },
                    { label: "Title", w: "w-56" },
                    { label: "Len", w: "w-12" },
                    { label: "Meta Desc", w: "w-56" },
                    { label: "Len", w: "w-12" },
                    { label: "H1", w: "w-48" },
                    { label: "Target Words", w: "w-24" },
                    { label: "H2 Headings (1–4)", w: "w-52" },
                    { label: "Keywords", w: "w-48" },
                    { label: "Tags", w: "w-40" },
                    { label: "Schema", w: "w-32" },
                    { label: "Internal Links", w: "w-48" },
                    { label: "Notes", w: "w-40" },
                    { label: "", w: "w-8" },
                  ].map((col, i) => (
                    <th
                      key={i}
                      className={`px-3 py-2.5 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap ${col.w}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/20">
                {items.map((item, rowIdx) => (
                  <tr
                    key={item.id}
                    className={`group hover:bg-surface-800/20 transition-colors ${
                      selectedRows.has(item.id) ? "bg-indigo-500/5" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(item.id)}
                        onChange={() => toggleRow(item.id)}
                        className="rounded border-surface-600 bg-surface-800 accent-indigo-500"
                      />
                    </td>

                    {/* Row number */}
                    <td className="px-3 py-2 text-xs text-surface-600">{rowIdx + 1}</td>

                    {/* URL */}
                    <td className="px-3 py-2 min-w-[200px]">
                      <div className="flex items-center">
                        {getSectionUrlPrefix(item.section) && (
                          <span className="text-surface-500 text-[10px] whitespace-nowrap bg-surface-800/40 px-1.5 py-1 rounded-l border border-r-0 border-surface-700/50 flex items-center">
                            {getSectionUrlPrefix(item.section)}
                          </span>
                        )}
                        <EditableCell
                          value={item.url ?? ""}
                          onChange={(v) => handleUpdate(item.id, "url", v)}
                          placeholder="slug-or-url"
                          className={`flex-1 ${getSectionUrlPrefix(item.section) ? "rounded-l-none" : ""}`}
                        />
                        {item.url && (
                          <a href={getSectionUrlPrefix(item.section) + item.url} target="_blank" rel="noopener noreferrer"
                            className="text-surface-600 hover:text-brand-400 transition-colors flex-shrink-0 ml-1">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Section */}
                    <td className="px-3 py-2">
                      <div className="relative">
                        <EditableCell
                          value={item.section ?? ""}
                          onChange={(v) => handleUpdate(item.id, "section", v)}
                          placeholder="Section"
                          list={`sections-list-${item.id}`}
                        />
                        <datalist id={`sections-list-${item.id}`}>
                          {sectionOptions.map((s: any) => (
                            <option key={s.label} value={s.label} />
                          ))}
                        </datalist>
                      </div>
                    </td>

                    {/* Page Type */}
                    <td className="px-3 py-2">
                      <select
                        value={item.pageType ?? ""}
                        onChange={(e) => handleUpdate(item.id, "pageType", e.target.value)}
                        className="bg-transparent text-xs text-surface-300 border-0 outline-none cursor-pointer hover:text-surface-100 w-full"
                      >
                        <option value="">—</option>
                        {PAGE_TYPES.map((pt) => (
                          <option key={pt.slug} value={pt.slug} className="bg-surface-800">
                            {pt.slug} ({pt.labelRu})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2">
                      <select
                        value={item.priority}
                        onChange={(e) => handleUpdate(item.id, "priority", Number(e.target.value))}
                        className="bg-transparent text-xs font-bold border-0 outline-none cursor-pointer w-full"
                        style={{
                          color: item.priority === 1 ? "#f87171" : item.priority === 2 ? "#fb923c" : item.priority === 3 ? "#facc15" : item.priority === 4 ? "#4ade80" : "#60a5fa",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n} className="bg-surface-800 text-surface-200">{n}</option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <StatusSelector
                        value={item.status ?? "DRAFT"}
                        onChange={(v) => handleUpdate(item.id, "status", v)}
                      />
                    </td>

                    {/* Title */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.metaTitle ?? ""}
                        onChange={(v) => handleUpdate(item.id, "metaTitle", v)}
                        placeholder="Page title..."
                        warning={item.metaTitle ? duplicateTitles.has(item.metaTitle.toLowerCase()) : false}
                        warningText="A similar title already exists in your plan"
                      />
                    </td>

                    {/* Title length */}
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-mono ${
                        !item.metaTitle ? "text-surface-600"
                          : item.metaTitle.length > 70 ? "text-red-400"
                          : item.metaTitle.length >= 50 ? "text-emerald-400"
                          : "text-amber-400"
                      }`}>
                        {item.metaTitle?.length ?? "—"}
                      </span>
                    </td>

                    {/* Meta Desc */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.metaDesc ?? ""}
                        onChange={(v) => handleUpdate(item.id, "metaDesc", v)}
                        placeholder="Meta description..."
                        multiline
                      />
                    </td>

                    {/* Meta Desc length */}
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-mono ${
                        !item.metaDesc ? "text-surface-600"
                          : item.metaDesc.length > 160 ? "text-red-400"
                          : item.metaDesc.length >= 120 ? "text-emerald-400"
                          : "text-amber-400"
                      }`}>
                        {item.metaDesc?.length ?? "—"}
                      </span>
                    </td>

                    {/* H1 */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.h1 ?? ""}
                        onChange={(v) => handleUpdate(item.id, "h1", v)}
                        placeholder="H1 heading..."
                      />
                    </td>

                    {/* Target word count */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.targetWordCount?.toString() ?? ""}
                        onChange={(v) => handleUpdate(item.id, "targetWordCount", v ? Number(v) : null)}
                        placeholder="—"
                      />
                    </td>

                    {/* H2 headings */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={(item.h2Headings ?? []).join(" | ")}
                        onChange={(v) =>
                          handleUpdate(item.id, "h2Headings",
                            v.split("|").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="H2-1 | H2-2 | H2-3 | H2-4"
                        multiline
                      />
                    </td>

                    {/* Keywords */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={(item.targetKeywords ?? []).join(", ")}
                        onChange={(v) =>
                          handleUpdate(item.id, "targetKeywords",
                            v.split(",").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="keyword 1, keyword 2"
                        multiline
                      />
                    </td>

                    {/* Tags */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={(item.tags ?? []).join(", ")}
                        onChange={(v) =>
                          handleUpdate(item.id, "tags",
                            v.split(",").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="tag 1, tag 2"
                        multiline
                      />
                    </td>

                    {/* Schema */}
                    <td className="px-3 py-2">
                      <select
                        value={item.schemaType ?? ""}
                        onChange={(e) => handleUpdate(item.id, "schemaType", e.target.value)}
                        className="bg-transparent text-xs text-surface-300 border-0 outline-none cursor-pointer hover:text-surface-100 w-full"
                      >
                        <option value="">—</option>
                        {SCHEMA_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-surface-800">{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* Internal links */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.internalLinks ?? ""}
                        onChange={(v) => handleUpdate(item.id, "internalLinks", v)}
                        placeholder="/page1/, /page2/"
                        multiline
                      />
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-2">
                      <EditableCell
                        value={item.notes ?? ""}
                        onChange={(v) => handleUpdate(item.id, "notes", v)}
                        placeholder="Notes..."
                        multiline
                      />
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteItem.mutate({ id: item.id })}
                        className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer info ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-surface-600 px-1">
          <span>{items.length} page{items.length !== 1 ? "s" : ""} planned</span>
          <span>
            {selectedRows.size > 0 && (
              <span className="text-indigo-400">{selectedRows.size} selected · </span>
            )}
            Click any cell to edit · H2 headings separated by <code className="bg-surface-800 px-1 rounded">|</code> · Keywords separated by <code className="bg-surface-800 px-1 rounded">,</code>
          </span>
        </div>

        {/* ── Keywords panel (from Semantic Core) ───────────────────────── */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setKwOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-800/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-surface-200">Semantic Core Keywords</span>
              {allKeywords.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400">
                  {allKeywords.length}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-surface-500 transition-transform ${kwOpen ? "rotate-180" : ""}`} />
          </button>

          {kwOpen && (
            <div className="border-t border-surface-700/30 p-4 space-y-3">
              {allKeywords.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">
                  No keywords found. Run the{" "}
                  <button
                    onClick={() => router.push("/semantic-core")}
                    className="text-cyan-400 hover:underline"
                  >
                    Semantic Core
                  </button>{" "}
                  wizard and link it to this project first.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                    <input
                      value={kwSearch}
                      onChange={(e) => setKwSearch(e.target.value)}
                      placeholder={`Search ${allKeywords.length} keywords...`}
                      className="input-field !py-2 !pl-9 !text-xs w-full max-w-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {filteredKeywords.slice(0, 200).map((kw, idx) => (
                      <span
                        key={`${kw}-${idx}`}
                        title={kw}
                        className="px-2 py-1 rounded-lg bg-surface-800/60 border border-surface-700/30 text-xs text-surface-300 hover:border-cyan-500/40 hover:text-cyan-300 cursor-default transition-colors truncate max-w-[180px]"
                      >
                        {kw}
                      </span>
                    ))}
                    {filteredKeywords.length > 200 && (
                      <span className="text-xs text-surface-500 self-center">
                        +{filteredKeywords.length - 200} more
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-600">
                    Keywords from your project&apos;s semantic core — use as reference when filling the{" "}
                    <strong className="text-surface-400">Keywords</strong> column above.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal
          projectId={activeProject.id}
          onClose={() => setShowInvite(false)}
        />
      )}
      {/* Ideation Modal */}
      {showIdeation && (
        <IdeationModal
          projectId={projectId}
          onClose={() => setShowIdeation(false)}
          onAddItems={() => utils.contentPlan.getByProject.invalidate({ projectId })}
        />
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          projectId={projectId}
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => utils.contentPlan.getByProject.invalidate({ projectId })}
        />
      )}

    </DashboardLayout>
  );
}
