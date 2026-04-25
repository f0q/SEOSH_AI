"use client";

import { useProject } from "@/lib/project-context";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { trpc } from "@/trpc/client";
import { Globe, ShieldCheck, Link2, LayoutList, ChevronRight, Layers, FileText, Pencil, Trash2, Brain, Rss, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ProjectSettingsPage() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? "";

  const { data: projectData, isLoading: isLoadingProject } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const { data: latestCore, isLoading: isLoadingCore } = trpc.semanticCore.getLatest.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: allCores } = trpc.semanticCore.getMany.useQuery();
  const linkMutation = trpc.semanticCore.linkToProject.useMutation();
  const deleteProject = trpc.projects.delete.useMutation();
  const router = useRouter();
  const utils = trpc.useUtils();

  const updateRssFeedsMut = trpc.projects.updateRssFeeds.useMutation({
    onSuccess: () => { utils.projects.get.invalidate({ id: projectId }); },
  });

  const [newRssUrl, setNewRssUrl] = useState("");
  const rssFeeds: string[] = (projectData?.companyProfile as any)?.rssFeeds || [];

  const handleLinkCore = async (coreId: string) => {
    try {
      if (!coreId) {
        // Unlink current core if "None" is selected
        if (latestCore) {
          await linkMutation.mutateAsync({ semanticCoreId: latestCore.id, projectId: null });
        }
      } else {
        await linkMutation.mutateAsync({ semanticCoreId: coreId, projectId });
      }
      utils.semanticCore.getLatest.invalidate({ projectId });
      utils.semanticCore.getMany.invalidate();
    } catch (e) {
      console.error("Failed to link core", e);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project and all its data? This cannot be undone.")) return;
    try {
      await deleteProject.mutateAsync({ id: projectId });
      utils.projects.list.invalidate();
      router.push("/projects");
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const isLoading = isLoadingProject || isLoadingCore;
  
  const siteStructure = Array.isArray(projectData?.companyProfile?.siteStructure) 
    ? projectData.companyProfile.siteStructure 
    : [];
  const competitors = Array.isArray(projectData?.companyProfile?.competitors) 
    ? projectData.companyProfile.competitors 
    : [];

  if (!activeProject) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 flex flex-col items-center text-center animate-fade-in">
          <Globe className="w-16 h-16 text-surface-600 mb-4" />
          <h1 className="text-2xl font-bold text-surface-200">No active project</h1>
          <p className="text-surface-500 mt-2">Please select or create a project from the sidebar.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-50">
              Project <span className="gradient-text-brand">Settings</span>
            </h1>
            <p className="text-surface-400 mt-1.5 text-base">
              Read-only view of your project's configuration and established sitemap structure.
            </p>
          </div>
          <Link
            href={`/projects/new?projectId=${projectId}`}
            className="btn-secondary gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Project Setup
          </Link>
        </div>

        {isLoading ? (
          <div className="glass-card p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Project Details & Competitors */}
            <div className="space-y-6 lg:col-span-1">
              
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-800/50 bg-surface-800/20">
                  <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-400" />
                    Project Details
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs text-surface-500 uppercase tracking-wider">Company Name</label>
                    <p className="text-sm font-medium text-surface-200 mt-1">{projectData?.companyProfile?.companyName || projectData?.name}</p>
                  </div>
                  {projectData?.url && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wider">Primary URL</label>
                      <a href={projectData.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-400 mt-1 flex items-center gap-1 hover:underline">
                        {projectData.url} <Link2 className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {projectData?.companyProfile?.description && (
                    <div>
                      <label className="text-xs text-surface-500 uppercase tracking-wider">Description</label>
                      <p className="text-sm text-surface-300 mt-1 leading-relaxed">
                        {projectData.companyProfile.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-800/50 bg-surface-800/20">
                  <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                    <LayoutList className="w-4 h-4 text-accent-400" />
                    Competitors
                  </h2>
                </div>
                <div className="p-4">
                  {competitors.length === 0 ? (
                    <p className="text-sm text-surface-500 italic">No competitors recorded.</p>
                  ) : (
                    <ul className="space-y-3">
                      {competitors.map((comp: any, i: number) => (
                        <li key={i} className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                          <p className="text-sm font-medium text-surface-200 truncate">{comp.label || comp.name || comp.url}</p>
                          <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-surface-500 mt-1 flex items-center gap-1 hover:text-brand-400 transition-colors truncate">
                            {comp.url} <Link2 className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* RSS Feeds */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-800/50 bg-surface-800/20">
                  <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                    <Rss className="w-4 h-4 text-amber-400" />
                    Competitor RSS Feeds
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {rssFeeds.length === 0 ? (
                    <p className="text-sm text-surface-500 italic">No RSS feeds added yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rssFeeds.map((feed: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-800/40 border border-surface-700/50 group">
                          <Rss className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-sm text-surface-300 truncate flex-1">{feed}</span>
                          <button
                            onClick={() => {
                              const updated = rssFeeds.filter((_, idx) => idx !== i);
                              updateRssFeedsMut.mutate({ projectId, rssFeeds: updated });
                            }}
                            className="text-surface-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove feed"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="url"
                      value={newRssUrl}
                      onChange={(e) => setNewRssUrl(e.target.value)}
                      placeholder="https://competitor.com/feed.xml"
                      className="input-field !py-1.5 !text-sm flex-1 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newRssUrl.trim() && projectId) {
                          updateRssFeedsMut.mutate({ projectId, rssFeeds: [...rssFeeds, newRssUrl.trim()] });
                          setNewRssUrl("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newRssUrl.trim() && projectId) {
                          updateRssFeedsMut.mutate({ projectId, rssFeeds: [...rssFeeds, newRssUrl.trim()] });
                          setNewRssUrl("");
                        }
                      }}
                      disabled={!newRssUrl.trim() || !projectId || updateRssFeedsMut.isPending}
                      className="btn-secondary !py-1.5 !px-3 text-xs gap-1 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-800/50 bg-surface-800/20">
                  <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Semantic Core
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {latestCore ? (
                    <>
                      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                            <Brain className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-surface-200 truncate">
                              {latestCore.siteUrl === "merged-cores" ? "Master Core (Merged)" : (latestCore.siteUrl === "unknown" ? (activeProject?.url || activeProject?.name || `Core ${latestCore.id.split('-')[0]}`) : (latestCore.siteUrl || `Core ${latestCore.id.split('-')[0]}`))}
                            </p>
                            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Connected</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/semantic-core/${latestCore.id}`}
                          className="btn-secondary !py-1.5 !px-3 text-xs gap-1 flex-1 justify-center"
                        >
                          <Layers className="w-3.5 h-3.5" /> View Details
                        </Link>
                        <Link
                          href={`/semantic-core/new?coreId=${latestCore.id}`}
                          className="btn-secondary !py-1.5 !px-3 text-xs gap-1 flex-1 justify-center"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Core
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Brain className="w-10 h-10 text-surface-600 mx-auto mb-2" />
                      <p className="text-sm text-surface-400 mb-1">No semantic core linked</p>
                      <p className="text-xs text-surface-500 mb-4">Create or link a semantic core to enable keyword-driven content planning.</p>
                      <div className="flex gap-2 justify-center">
                        <Link
                          href={`/semantic-core/new?projectId=${projectId}`}
                          className="btn-primary !py-1.5 !px-3 text-xs gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create New Core
                        </Link>
                        {allCores && allCores.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => handleLinkCore(e.target.value)}
                            className="input-field !py-1.5 !px-3 !text-xs"
                          >
                            <option value="">Link Existing...</option>
                            {allCores.filter((c: any) => !c.projectId).map((core: any) => (
                              <option key={core.id} value={core.id}>
                                {core.siteUrl === "merged-cores" ? "Master Core (Merged)" : (core.siteUrl || `Core ${core.id.split('-')[0]}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="glass-card overflow-hidden border border-red-500/20">
                <div className="p-4 border-b border-red-500/10 bg-red-500/5">
                  <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-sm text-surface-400 mb-4">
                    Permanently delete this project and all of its associated data, including content plans and settings.
                  </p>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deleteProject.isPending}
                    className="btn-primary !bg-red-500/10 !text-red-400 !border-red-500/20 hover:!bg-red-500/20 hover:!text-red-300 w-full"
                  >
                    {deleteProject.isPending ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Sitemap Structure */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card overflow-hidden h-full">
                <div className="p-4 border-b border-surface-800/50 bg-surface-800/20 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Approved Structure of Website
                  </h2>
                  <div className="text-xs text-surface-500">
                    {siteStructure.length} sections
                  </div>
                </div>
                
                <div className="p-4">
                  {siteStructure.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center">
                      <Layers className="w-12 h-12 text-surface-600 mb-3" />
                      <p className="text-surface-300 font-medium">No sitemap structure found</p>
                      <p className="text-sm text-surface-500 mt-1 max-w-sm">
                        No approved structure has been generated. This is usually created during project setup.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {siteStructure.map((section: any, idx: number) => (
                        <div key={idx} className="rounded-xl border border-surface-700/50 bg-surface-800/20 overflow-hidden">
                          <div className="px-4 py-3 bg-surface-800/40 border-b border-surface-700/50 flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-surface-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-300">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-surface-100 truncate">{section.label}</h3>
                              <p className="text-xs text-surface-500 truncate mt-0.5 flex items-center gap-1.5">
                                <Link2 className="w-3 h-3" />
                                {section.url || `/${section.label.toLowerCase().replace(/\s+/g, '-')}`}
                              </p>
                            </div>
                            {section.pageType && (
                              <div className="px-2 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] uppercase font-bold tracking-wider">
                                {section.pageType}
                              </div>
                            )}
                          </div>
                          
                          {section.children && section.children.length > 0 && (
                            <div className="px-4 py-3 pl-12 space-y-2 relative">
                              {/* Vertical connecting line */}
                              <div className="absolute left-[1.35rem] top-0 bottom-4 w-px bg-surface-700/50" />
                              
                              {section.children.map((child: any, cidx: number) => (
                                <div key={cidx} className="flex items-start gap-3 relative">
                                  {/* Horizontal connecting branch */}
                                  <div className="absolute -left-[2.1rem] top-2.5 w-6 h-px bg-surface-700/50" />
                                  
                                  <FileText className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-200">{child.label}</p>
                                    <p className="text-xs text-surface-500 truncate mt-0.5">
                                      {child.url || `/${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
