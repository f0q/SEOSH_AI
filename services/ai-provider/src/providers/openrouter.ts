/**
 * @module OpenRouterProvider
 * @description AI provider implementation for OpenRouter (https://openrouter.ai).
 * OpenRouter provides access to 100+ models via a unified API.
 * This is the default provider for SEOSH.AI.
 * 
 * Compatible with OpenAI SDK since OpenRouter uses the same API format.
 */

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig } from '../types';
import type { AICompletionRequest, AICompletionResponse, AIModel } from '@seosh/shared/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://seosh.ai',
        'X-Title': 'SEOSH.AI',
      },
      timeout: config.timeout || 60_000,
    });
    this.defaultModel = config.defaultModel || 'google/gemini-2.0-flash-001';
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const response = await this.client.chat.completions.create({
      model: request.model || this.defaultModel,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content || '',
      model: response.model,
      tokensUsed: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
    };
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<string, void, unknown> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const stream = await this.client.chat.completions.create({
      model: request.model || this.defaultModel,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async listModels(): Promise<AIModel[]> {
    // OpenRouter provides a models endpoint
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
      });
      const data = await response.json() as { data: Array<{ id: string; name: string }> };
      return (data.data || []).slice(0, 50).map((m) => ({
        id: m.id,
        name: m.name || m.id,
        provider: 'openrouter' as const,
        purpose: ['categorize', 'content', 'analyze'] as const,
      }));
    } catch {
      // Return commonly used models as fallback
      return [
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter', purpose: ['categorize', 'content', 'analyze'] },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', purpose: ['content', 'analyze'] },
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', purpose: ['content', 'analyze'] },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter', purpose: ['categorize', 'content'] },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'openrouter', purpose: ['categorize', 'content'] },
      ];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return !!response.choices[0];
    } catch {
      return false;
    }
  }
}
