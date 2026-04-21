import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

export interface Session {
  id: string;
  url: string;
  createdAt: string;
}

export interface SessionSummary extends Session {
  queryCount: number;
  categoryCount: number;
  pageCount: number;
}

export interface SitemapPage {
  id: string;
  url: string;
  title: string | null;
  h1: string | null;
}

export interface QueryGroup {
  id: string;
  representative: string;
  queryCount: number;
  queries: { id: string; text: string }[];
}

export interface CategoryItem {
  id: string;
  name: string;
  approved: boolean;
}

export interface ResultRow {
  id: string;
  query: string;
  category: string;
  group: string;
  isRepresentative: boolean;
  page: string;
  pageManual: boolean;
}

// Sessions
export const listSessions = () =>
  api.get<SessionSummary[]>('/sessions').then((r) => r.data);

export const createSession = (url: string) =>
  api.post<Session>('/sessions', { url }).then((r) => r.data);

export const getSession = (id: string) =>
  api.get<Session>(`/sessions/${id}`).then((r) => r.data);

export const deleteSession = (id: string) =>
  api.delete(`/sessions/${id}`).then((r) => r.data);

// Sitemap
export const parseSitemap = (sessionId: string, url: string) =>
  api.post<{ count: number; pages: SitemapPage[] }>('/sitemap/parse', { sessionId, url }).then((r) => r.data);

export const getSitemapPages = (sessionId: string) =>
  api.get<SitemapPage[]>(`/sitemap/${sessionId}`).then((r) => r.data);

export const generateStructure = (sessionId: string, refresh: boolean = false) =>
  api.post<any>('/sitemap/structure', { sessionId, refresh }).then((r) => r.data);

// Queries
export const uploadQueries = (sessionId: string, queries: string[]) =>
  api.post<{
    totalQueries: number;
    totalGroups: number;
    representativeCount: number;
    groups: QueryGroup[];
  }>('/queries/upload', { sessionId, queries }).then((r) => r.data);

export const deleteQuery = (queryId: string) =>
  api.delete<{ success: boolean }>(`/queries/${queryId}`).then((r) => r.data);

export const updateQueryText = (queryId: string, text: string) =>
  api.patch<{ success: boolean }>(`/queries/${queryId}/text`, { text }).then((r) => r.data);

export interface AddCategoryResult {
  success: boolean;
  categoryId: string;
  moved: number;
  moves: { query: string; from: string; to: string }[];
}

export const addCategoryWithScan = (sessionId: string, categoryName: string, scanExisting: boolean) =>
  api.post<AddCategoryResult>('/categorize/add-category', { sessionId, categoryName, scanExisting }, { timeout: 180000 }).then((r) => r.data);

// Categorization
export const generateCategories = (sessionId: string) =>
  api.post<{ categories: CategoryItem[] }>('/categorize/generate', { sessionId }).then((r) => r.data);

export const approveCategories = (sessionId: string, categories: string[]) =>
  api.post<{ categories: CategoryItem[] }>('/categorize/approve', { sessionId, categories }).then((r) => r.data);

export const mergeCategoriesAI = (categories: string[]) =>
  api.post<{ categories: string[] }>('/categorize/merge', { categories }).then((r) => r.data);

export const runCategorization = (sessionId: string) =>
  api.post<{ success: boolean; categorizedCount: number; totalQueries: number }>('/categorize/run', { sessionId }).then((r) => r.data);

export const getResults = (sessionId: string) =>
  api.get<{ results: ResultRow[]; summary: Record<string, number> }>(`/categorize/results/${sessionId}`).then((r) => r.data);

export const renameCategory = (sessionId: string, oldName: string, newName: string) =>
  api.patch<{ success: boolean }>('/categorize/rename-category', { sessionId, oldName, newName }).then((r) => r.data);

export const updateQueryPage = (queryId: string, pageUrl: string | null) =>
  api.patch<{ success: boolean }>('/categorize/update-page', { queryId, pageUrl }).then((r) => r.data);

export const updateQueryCategory = (queryId: string, sessionId: string, categoryName: string) =>
  api.patch<{ success: boolean }>('/categorize/update-query-category', { queryId, sessionId, categoryName }).then((r) => r.data);

export interface RefineResult {
  moved: number;
  total: number;
  moves: { query: string; from: string; to: string }[];
}

export const refineCategoryAI = (sessionId: string, categoryName: string) =>
  api.post<RefineResult>('/categorize/refine', { sessionId, categoryName }, { timeout: 180000 }).then((r) => r.data);

export const getExportUrl = (sessionId: string) =>
  `/api/categorize/export/${sessionId}`;

export const generateLlmsTxt = (sessionId: string) =>
  api.post<{ content: string }>('/categorize/generate-llms', { sessionId }, { timeout: 180000 }).then((r) => r.data);

export const generateRecommendations = (sessionId: string) =>
  api.post<{ content: string }>('/categorize/generate-recommendations', { sessionId }, { timeout: 180000 }).then((r) => r.data);

export default api;
