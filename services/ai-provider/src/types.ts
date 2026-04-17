/**
 * @module AIProvider Types
 * @description Interface definitions for the AI Provider abstraction layer.
 */

import type { AICompletionRequest, AICompletionResponse, AIModel } from '@seosh/shared/types';

/** Configuration for initializing an AI provider */
export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

/** 
 * Interface that all AI providers must implement.
 * This ensures we can swap providers without changing consumer code.
 */
export interface AIProvider {
  /** Provider identifier */
  readonly name: string;

  /** 
   * Send a completion request and get a full response.
   * Used for classification, analysis, and short content generation.
   */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  /**
   * Send a completion request and stream the response.
   * Used for content generation where the user wants to see progress.
   */
  stream(request: AICompletionRequest): AsyncGenerator<string, void, unknown>;

  /** List available models from this provider */
  listModels(): Promise<AIModel[]>;

  /** Check if the provider is properly configured and reachable */
  healthCheck(): Promise<boolean>;
}
