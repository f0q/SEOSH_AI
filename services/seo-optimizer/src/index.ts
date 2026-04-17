/**
 * @module @seosh/seo-optimizer
 * @description Modular SEO analysis service.
 * 
 * Architecture:
 *   SeoOptimizer → loads → SeoToolPlugin[]
 *   Each plugin implements a unified interface for analysis.
 * 
 * Built-in plugins:
 *   - Text.ru — uniqueness, wateriness, spam
 *   - Pixel Tools — keyword density, SEO score
 * 
 * Plugin interface (add/remove):
 *   - slug: unique identifier
 *   - name: display name
 *   - analyze(text, keywords): SeoAnalysisResult
 *   - inputFormat: what data is needed
 *   - outputFormat: what data is returned
 */

import type { SeoAnalysisRequest, SeoAnalysisResult, SeoToolModuleDefinition } from '@seosh/shared/types';

/** Plugin interface — all SEO analysis modules must implement this */
export interface SeoToolPlugin {
  readonly slug: string;
  readonly definition: SeoToolModuleDefinition;
  
  /** Check if the plugin is properly configured (API key present, etc.) */
  isConfigured(): boolean;
  
  /** Run analysis on the given content */
  analyze(request: SeoAnalysisRequest): Promise<SeoAnalysisResult>;
}

/** Registry of all available SEO tool plugins */
export class SeoOptimizerService {
  private plugins: Map<string, SeoToolPlugin> = new Map();

  /** Register a new SEO analysis plugin */
  register(plugin: SeoToolPlugin): void {
    this.plugins.set(plugin.slug, plugin);
  }

  /** Remove a plugin */
  unregister(slug: string): void {
    this.plugins.delete(slug);
  }

  /** Get all registered plugins */
  list(): SeoToolPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Get only configured (ready-to-use) plugins */
  listActive(): SeoToolPlugin[] {
    return this.list().filter(p => p.isConfigured());
  }

  /** Run analysis using a specific plugin */
  async analyze(slug: string, request: SeoAnalysisRequest): Promise<SeoAnalysisResult> {
    const plugin = this.plugins.get(slug);
    if (!plugin) throw new Error(`SEO tool plugin "${slug}" not found`);
    if (!plugin.isConfigured()) throw new Error(`SEO tool "${slug}" is not configured. Check API key.`);
    return plugin.analyze(request);
  }

  /** Run analysis using ALL active plugins and combine results */
  async analyzeAll(request: SeoAnalysisRequest): Promise<SeoAnalysisResult[]> {
    const active = this.listActive();
    return Promise.all(active.map(p => p.analyze(request)));
  }
}

// ─── Built-in Plugin Definitions (for registration in DB) ───────────────

export const TEXTRU_DEFINITION: SeoToolModuleDefinition = {
  slug: 'textru',
  name: 'Text.ru',
  description: 'Uniqueness check, SEO analysis, wateriness and spam detection',
  apiKeyEnvVar: 'TEXTRU_API_KEY',
  inputFormat: {
    required: ['text'],
    optional: ['keywords'],
  },
  outputFormat: {
    fields: [
      { name: 'uniqueness', type: 'number', description: 'Text uniqueness percentage (0-100)' },
      { name: 'wateriness', type: 'number', description: 'Water content percentage' },
      { name: 'spaminess', type: 'number', description: 'Spam percentage' },
    ],
  },
};

export const PIXELTOOLS_DEFINITION: SeoToolModuleDefinition = {
  slug: 'pixeltools',
  name: 'Pixel Tools',
  description: 'SEO score, keyword density analysis, title/description checks',
  apiKeyEnvVar: 'PIXELTOOLS_API_KEY',
  inputFormat: {
    required: ['text', 'keywords'],
    optional: ['url', 'language'],
  },
  outputFormat: {
    fields: [
      { name: 'seoScore', type: 'number', description: 'Overall SEO score (0-100)' },
      { name: 'keywordDensity', type: 'json', description: 'Keyword density per keyword' },
      { name: 'recommendations', type: 'json', description: 'List of SEO recommendations' },
    ],
  },
};
