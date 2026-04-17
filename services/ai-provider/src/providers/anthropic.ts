/**
 * @module AnthropicProvider
 * @description AI provider for Anthropic (Claude models).
 * Uses OpenAI SDK with Anthropic's OpenAI-compatible endpoint.
 */

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig } from '../types';
import type { AICompletionRequest, AICompletionResponse, AIModel } from '@seosh/shared/types';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    // Use Anthropic's OpenAI-compatible endpoint
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.anthropic.com/v1',
      defaultHeaders: { 'anthropic-version': '2023-06-01' },
      timeout: config.timeout || 60_000,
    });
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
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
      max_tokens: request.maxTokens || 4096,
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
      max_tokens: request.maxTokens || 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async listModels(): Promise<AIModel[]> {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', purpose: ['content', 'analyze'] },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', purpose: ['content', 'analyze'] },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', purpose: ['categorize', 'content'] },
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}
