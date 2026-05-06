"use client";

/**
 * @context ProjectContext
 * @description Global active project state.
 * - Persists the selected project ID in localStorage
 * - Auto-selects the first project on first load
 * - Provides { activeProject, setActiveProjectId } everywhere in the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { trpc } from "@/trpc/client";

interface Project {
  id: string;
  name: string;
  url?: string | null;
  status: string;
  createdAt: Date;
  memberRole?: string | null; // set if user is a team member (not owner)
}

interface ProjectContextValue {
  activeProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  isTeamMember: boolean; // true if active project is one where user is a member (not owner)
  setActiveProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProject: null,
  projects: [],
  isLoading: true,
  isTeamMember: false,
  setActiveProjectId: () => {},
});

const LS_KEY = "seosh_active_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery();
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);

  // On first load: restore from localStorage, or default to first project
  useEffect(() => {
    if (isLoading || projects.length === 0) return;
    const saved = localStorage.getItem(LS_KEY);
    const validSaved = saved && projects.find((p) => p.id === saved);
    if (validSaved) {
      setActiveProjectIdState(saved);
    } else {
      // Auto-select the most recent project
      setActiveProjectIdState(projects[0].id);
      localStorage.setItem(LS_KEY, projects[0].id);
    }
  }, [isLoading, projects]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  const activeProject = activeProjectId
    ? (projects.find((p) => p.id === activeProjectId) ?? null)
    : null;

  // Check if user is a team member (not owner) for the active project
  const isTeamMember = !!activeProject?.memberRole;

  return (
    <ProjectContext.Provider value={{ activeProject, projects, isLoading, isTeamMember, setActiveProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
