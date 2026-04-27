"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Settings, Key, Eye, EyeOff, Loader2, Check, Trash2, AlertCircle, Shield } from "lucide-react";
import { trpc } from "@/trpc/client";

// Provider definitions for UI
const API_KEY_PROVIDERS = [
  {
    id: "textru" as const,
    name: "Text.ru",
    description: "Russian-focused uniqueness & spam check. Used for Expert Analysis in Content Editor.",
    docsUrl: "https://text.ru/api-check",
    placeholder: "Enter your Text.ru API key",
  },
  // Future providers can be added here:
  // { id: "copyscape", name: "Copyscape", ... },
  // { id: "pixeltools", name: "PixelTools", ... },
];

function ApiKeyRow({ provider, status, onSave, onRemove }: {
  provider: typeof API_KEY_PROVIDERS[number];
  status: { configured: boolean; masked: string | null } | undefined;
  onSave: (provider: string, key: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const configured = status?.configured ?? false;

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      await onSave(provider.id, keyValue.trim());
      setKeyValue("");
      setIsEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(provider.id);
      setKeyValue("");
      setIsEditing(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            configured ? 'bg-emerald-500/10' : 'bg-surface-700/50'
          }`}>
            <Key className={`w-5 h-5 ${configured ? 'text-emerald-400' : 'text-surface-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-surface-100">{provider.name}</h3>
            <p className="text-xs text-surface-400">{provider.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {configured && !isEditing && (
            <span className="text-xs text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-mono">
              {status?.masked}
            </span>
          )}
          {configured && !isEditing && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <Check className="w-3 h-3" /> Active
            </span>
          )}
          {!configured && !isEditing && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Not configured
            </span>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
          >
            {configured ? "Update Key" : "Add Key"}
          </button>
          {configured && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Remove
            </button>
          )}
          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-surface-500 hover:text-surface-300 transition-colors ml-auto"
            >
              Get API Key →
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={provider.placeholder}
              className="w-full px-3 py-2 pr-9 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 font-mono"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !keyValue.trim()}
            className="text-xs px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5 font-medium"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
          <button
            onClick={() => { setIsEditing(false); setKeyValue(""); }}
            className="text-xs px-3 py-2 rounded-lg text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const statusQuery = trpc.settings.getApiKeyStatus.useQuery();
  const saveMut = trpc.settings.saveApiKey.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });
  const removeMut = trpc.settings.removeApiKey.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });

  const handleSave = async (provider: string, apiKey: string) => {
    await saveMut.mutateAsync({ provider: provider as any, apiKey });
  };

  const handleRemove = async (provider: string) => {
    await removeMut.mutateAsync({ provider: provider as any });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <Settings className="w-7 h-7 text-brand-400" />
            Settings
          </h1>
          <p className="text-surface-400 mt-1">Configure your SEOSH.AI experience</p>
        </div>

        {/* API Keys Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-surface-100">API Keys</h2>
          </div>
          <p className="text-sm text-surface-400 mb-4">
            Connect external SEO analysis providers by adding your API keys. Keys are encrypted and stored securely.
          </p>

          <div className="space-y-3">
            {API_KEY_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider.id}
                provider={provider}
                status={statusQuery.data?.[provider.id]}
                onSave={handleSave}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Security note */}
          <div className="mt-4 p-3 rounded-lg bg-surface-800/30 border border-surface-700/30">
            <p className="text-[11px] text-surface-500 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Your API keys are encrypted with AES-256-GCM before storage. They are never displayed in full or transmitted in API responses.</span>
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
