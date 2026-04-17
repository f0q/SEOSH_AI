/**
 * @module @seosh/shared/types
 * @description Shared TypeScript types for the SEOSH.AI platform.
 * All cross-module interfaces are defined here to ensure consistency.
 */

// ─── AI Provider Types ──────────────────────────────────────────────────────

export type AIProviderType = 'openrouter' | 'openai' | 'anthropic' | 'ollama';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderType;
  purpose: AIModelPurpose[];
  maxTokens?: number;
  costPer1kTokens?: number;
}

export type AIModelPurpose = 'categorize' | 'content' | 'analyze' | 'image';

export interface AICompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ─── SEO Tool Module Types ──────────────────────────────────────────────────

export interface SeoToolModuleDefinition {
  slug: string;
  name: string;
  description: string;
  /** Environment variable name for the API key */
  apiKeyEnvVar: string;
  /** What data this module needs as input */
  inputFormat: SeoToolInput;
  /** What data this module returns */
  outputFormat: SeoToolOutput;
}

export interface SeoToolInput {
  required: string[]; // e.g. ["text", "keywords"]
  optional: string[]; // e.g. ["url", "language"]
}

export interface SeoToolOutput {
  fields: SeoToolOutputField[];
}

export interface SeoToolOutputField {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'json';
  description: string;
}

export interface SeoAnalysisRequest {
  text: string;
  keywords: string[];
  url?: string;
  language?: string;
}

export interface SeoAnalysisResult {
  moduleSlug: string;
  score?: number; // 0-100
  uniqueness?: number; // 0-100%
  wateriness?: number; // 0-100%
  spaminess?: number; // 0-100%
  recommendations: SeoRecommendation[];
  rawData?: Record<string, unknown>;
}

export interface SeoRecommendation {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  autoFixable: boolean;
}

// ─── Content Types ──────────────────────────────────────────────────────────

export interface ContentGenerationRequest {
  title: string;
  keywords: string[];
  materials: ContentMaterial[];
  pageType: string;
  language: string;
  wordCountTarget?: number;
}

export interface ContentMaterial {
  type: 'text' | 'image' | 'video_link' | 'file';
  content: string; // Text content or URL
  description?: string;
}

// ─── Project / Onboarding Types ─────────────────────────────────────────────

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface CompanyProfileData {
  companyName: string;
  industry?: string;
  description?: string;
  productsServices?: ProductService[];
  targetAudience?: TargetAudience;
  competitors?: Competitor[];
  usp?: string;
  geography?: string;
}

export interface ProductService {
  name: string;
  description: string;
  priceRange?: string;
}

export interface TargetAudience {
  segments: string[];
  painPoints: string[];
  cjm?: Record<string, unknown>;
}

export interface Competitor {
  url: string;
  name: string;
  notes?: string;
}

// ─── Publisher Types ────────────────────────────────────────────────────────

export type ConnectorType = 'wordpress' | 'tilda' | 'bitrix' | 'own_cms' | 'custom_api';

export interface PublishRequest {
  contentItemId: string;
  connectorId: string;
  publishNow: boolean;
  scheduledAt?: Date;
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  error?: string;
}
