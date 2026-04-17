/**
 * @module OpenAIProvider
 * @description AI provider implementation for OpenAI (GPT-4o, DALL-E 3, etc.)
 */

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig } from '../types';
import type { AICompletionRequest, AICompletionResponse, AIModel } from '@seosh/shared/types';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 60_000,
    });
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
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
      if (content) yield content;
    }
  }

  async listModels(): Promise<AIModel[]> {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', purpose: ['content', 'analyze'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', purpose: ['categorize', 'content', 'analyze'] },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', purpose: ['content', 'analyze'] },
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return !!response.choices[0];
    } catch {
      return false;
    }
  }
}
