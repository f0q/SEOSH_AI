/**
 * @module OllamaProvider
 * @description AI provider for Ollama (local self-hosted models).
 * Uses OpenAI-compatible API that Ollama exposes.
 * 
 * This is primarily for the open-source version where users
 * want to run models locally without API costs.
 */

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig } from '../types';
import type { AICompletionRequest, AICompletionResponse, AIModel } from '@seosh/shared/types';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434/v1';

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private client: OpenAI;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || DEFAULT_OLLAMA_URL;
    this.client = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't need a real key
      baseURL: this.baseUrl,
      timeout: config.timeout || 120_000, // Longer timeout for local models
    });
    this.defaultModel = config.defaultModel || 'llama3.1';
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
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async listModels(): Promise<AIModel[]> {
    try {
      // Ollama exposes /api/tags to list locally available models
      const ollamaApiUrl = this.baseUrl.replace('/v1', '');
      const response = await fetch(`${ollamaApiUrl}/api/tags`);
      const data = await response.json() as { models: Array<{ name: string }> };
      return (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        provider: 'ollama' as const,
        purpose: ['categorize', 'content', 'analyze'] as const,
      }));
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const ollamaApiUrl = this.baseUrl.replace('/v1', '');
      const response = await fetch(ollamaApiUrl);
      return response.ok;
    } catch {
      return false;
    }
  }
}
