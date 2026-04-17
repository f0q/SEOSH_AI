/**
 * @module @seosh/ai-provider
 * @description Multi-provider AI abstraction for SEOSH.AI
 * 
 * Supports:
 *   - OpenRouter (default) — access to 100+ models
 *   - OpenAI — GPT-4o, DALL-E 3
 *   - Anthropic — Claude 3.5/4
 *   - Ollama — local self-hosted models
 * 
 * Provider is configured at superadmin level.
 * Model selection is available at user level.
 * 
 * Architecture:
 *   AIProviderManager → creates → AIProvider (interface)
 *   Each provider implements: complete(), stream(), listModels()
 */

export { AIProviderManager } from './provider-manager';
export { OpenRouterProvider } from './providers/openrouter';
export { OpenAIProvider } from './providers/openai';
export { AnthropicProvider } from './providers/anthropic';
export { OllamaProvider } from './providers/ollama';
export type { AIProvider, AIProviderConfig } from './types';
