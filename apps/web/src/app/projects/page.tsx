"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { useProject } from "@/lib/project-context";
import {
  FolderKanban,
  Plus,
  Globe,
  Brain,
  Clock,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ONBOARDING: { label: "Onboarding", className: "badge-warning" },
  ACTIVE:     { label: "Active",     className: "badge-success" },
  PAUSED:     { label: "Paused",     className: "badge" },
  ARCHIVED:   { label: "Archived",   className: "badge" },
};

export default function ProjectsPage() {
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const { activeProject, setActiveProjectId } = useProject();
  
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; url: string } | null>(null);
  
  const updateProjectMut = trpc.projects.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingProject(null);
    },
    onError: (e) => alert(e.message),
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Projects</h1>
            <p className="text-surface-400 mt-1">
              {projects?.length
                ? `${projects.length} project${projects.length > 1 ? "s" : ""}`
                : "Manage your SEO projects"}
            </p>
          </div>
          <Link href="/projects/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="glass-card p-16 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!projects || projects.length === 0) && (
          <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
              <FolderKanban className="w-7 h-7 text-surface-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-200 mb-2">No projects yet</h2>
            <p className="text-sm text-surface-500 mb-6 max-w-md">
              Create your first project to start optimizing your website for search engines.
            </p>
            <Link href="/projects/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Create First Project
            </Link>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const isActive = activeProject?.id === project.id;
              const status = STATUS_STYLES[project.status] ?? { label: project.status, className: "badge" };

              return (
                <div
                  key={project.id}
                  onClick={() => setActiveProjectId(project.id)}
                  className={`glass-card glass-card-hover p-5 cursor-pointer transition-all duration-200 ${
                    isActive ? "border-brand-500/40 shadow-lg shadow-brand-500/10" : ""
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? "bg-gradient-to-br from-brand-500 to-accent-500 shadow-md shadow-brand-500/30"
                          : "bg-surface-800/60"
                      }`}>
                        <FolderKanban className={`w-5 h-5 ${isActive ? "text-white" : "text-surface-400"}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-surface-100 truncate">{project.name}</h3>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-surface-500 hover:text-brand-400 flex items-center gap-1 transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            {project.url.replace(/^https?:\/\//, "")}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject({ id: project.id, name: project.name, url: project.url || "" });
                        }}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit project"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <span className={`badge ${status.className} text-xs`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-surface-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-brand-500/15 flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-xs text-brand-400 font-medium">Active project</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new tile */}
            <Link
              href="/projects/new"
              className="glass-card p-5 border-dashed border-surface-700/50 flex flex-col items-center justify-center gap-3 text-surface-500 hover:text-surface-300 hover:border-brand-500/30 transition-all min-h-[140px]"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-800/40 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">New Project</span>
            </Link>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-surface-50">Edit Project</h2>
              <button
                onClick={() => setEditingProject(null)}
                className="text-surface-500 hover:text-surface-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Website URL</label>
                <input
                  type="url"
                  value={editingProject.url}
                  onChange={(e) => setEditingProject({ ...editingProject, url: e.target.value })}
                  className="input-field w-full"
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setEditingProject(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!editingProject.name.trim()) return alert("Name is required");
                    updateProjectMut.mutate(editingProject);
                  }}
                  disabled={updateProjectMut.isPending}
                  className="btn-primary"
                >
                  {updateProjectMut.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
