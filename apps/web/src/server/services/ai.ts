// ─── Shared OpenRouter Call ───────────────────────────────────────────────────

/**
 * Result from an OpenRouter API call.
 * Includes the response text and the USD cost from OpenRouter's usage field.
 */
export interface AICallResult {
  text: string;
  costUsd: number; // Actual USD cost charged by OpenRouter
}

export async function callOpenRouter(
  config: { apiKey: string; model: string; baseUrl: string },
  prompt: string,
  jsonMode: boolean = false
): Promise<string> {
  const result = await callOpenRouterWithCost(config, prompt, jsonMode);
  return result.text;
}

/**
 * Call OpenRouter and return both the response text and the USD cost.
 * Used when we need to track token spending.
 */
export async function callOpenRouterWithCost(
  config: { apiKey: string; model: string; baseUrl: string },
  prompt: string,
  jsonMode: boolean = false
): Promise<AICallResult> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://seosh.ai",
      "X-Title": "SEOSH.AI Content Planner",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: jsonMode ? 4000 : 2000,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    }),
  });
  
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }
  
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const costUsd = data.usage?.cost ?? 0;

  return { text, costUsd };
}

export async function callOpenRouterChat(
  config: { apiKey: string; model: string; baseUrl: string },
  messages: { role: string; content: string }[],
): Promise<string> {
  const result = await callOpenRouterChatWithCost(config, messages);
  return result.text;
}

/**
 * Chat-style call with cost tracking.
 */
export async function callOpenRouterChatWithCost(
  config: { apiKey: string; model: string; baseUrl: string },
  messages: { role: string; content: string }[],
): Promise<AICallResult> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://seosh.ai",
      "X-Title": "SEOSH.AI Content Planner",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }
  
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const costUsd = data.usage?.cost ?? 0;

  return { text, costUsd };
}

// ─── Helper to get AI config from env ───────────────────────────────────────
export function getAIConfig(modelOverride?: string) {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: modelOverride || process.env.OPENROUTER_MODEL_CLASSIFY || "google/gemini-2.0-flash-001",
    baseUrl: "https://openrouter.ai/api/v1",
  };
}
