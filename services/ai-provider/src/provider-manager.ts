/**
 * @module AIProviderManager
 * @description Factory and manager for AI providers.
 * 
 * The superadmin configures which providers are available globally.
 * Users can then select which model to use for each task type.
 * 
 * Usage:
 *   const manager = new AIProviderManager();
 *   manager.registerProvider('openrouter', new OpenRouterProvider({ apiKey: '...' }));
 *   const provider = manager.getProvider('openrouter');
 *   const response = await provider.complete({ ... });
 */

import type { AIProvider, AIProviderConfig } from './types';
import type { AIProviderType, AICompletionRequest, AICompletionResponse } from '@seosh/shared/types';

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string | null = null;

  /**
   * Register a provider instance.
   * @param name - Provider identifier (e.g., 'openrouter', 'openai')
   * @param provider - Provider instance implementing AIProvider interface
   * @param isDefault - Whether this is the default provider
   */
  registerProvider(name: string, provider: AIProvider, isDefault: boolean = false): void {
    this.providers.set(name, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  /**
   * Get a specific provider by name.
   * @throws Error if provider not found
   */
  getProvider(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(
        `AI provider "${name}" not found. Available: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }
    return provider;
  }

  /**
   * Get the default provider.
   * @throws Error if no default provider configured
   */
  getDefault(): AIProvider {
    if (!this.defaultProvider) {
      throw new Error('No default AI provider configured');
    }
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Convenience method: complete using a specific model string.
   * Model format: "provider/model-name" (e.g., "openrouter/google/gemini-2.0-flash-001")
   * or just "model-name" to use default provider.
   */
  async complete(
    request: AICompletionRequest,
    providerName?: string
  ): Promise<AICompletionResponse> {
    const provider = providerName 
      ? this.getProvider(providerName) 
      : this.getDefault();
    return provider.complete(request);
  }

  /**
   * Stream a completion using a specific provider.
   */
  async *stream(
    request: AICompletionRequest,
    providerName?: string
  ): AsyncGenerator<string, void, unknown> {
    const provider = providerName 
      ? this.getProvider(providerName) 
      : this.getDefault();
    yield* provider.stream(request);
  }

  /**
   * List all registered providers and their status.
   */
  async listProviders(): Promise<Array<{ name: string; healthy: boolean }>> {
    const results = [];
    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.healthCheck();
        results.push({ name, healthy });
      } catch {
        results.push({ name, healthy: false });
      }
    }
    return results;
  }

  /**
   * Get available provider names.
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
