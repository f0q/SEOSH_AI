/**
 * SEO Analysis Provider Abstraction
 * 
 * Supports multiple providers for content analysis.
 * Easy to add new providers by implementing the SeoAnalysisProvider interface.
 */

export interface SeoAnalysisResult {
  uniqueness: number;      // 0-100%
  spamScore: number;       // 0-100% (lower is better)
  naturalness: number;     // 0-100%
  eeat: number;            // 0-100% (Expertise, Experience, Authority, Trust)
  readability: number;     // 0-100%
  keywordDensity: number;  // percentage
  waterScore: number;      // 0-100% ("water" content / filler)
  recommendations: string[];
  provider: string;
  raw?: Record<string, unknown>;
}

export interface SeoAnalysisProvider {
  name: string;
  analyze(text: string, title: string): Promise<SeoAnalysisResult>;
}

// ─── Text.ru Provider ───────────────────────────────────────────────────────
// Uses text.ru API for uniqueness, spam, and naturalness checks
class TextRuProvider implements SeoAnalysisProvider {
  name = "text.ru";
  
  async analyze(text: string, title: string): Promise<SeoAnalysisResult> {
    const apiKey = process.env.TEXTRU_API_KEY;
    if (!apiKey) throw new Error("TEXTRU_API_KEY not configured");

    // Step 1: Submit text for analysis
    const submitRes = await fetch("https://api.text.ru/post", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        text,
        userkey: apiKey,
      }),
    });
    const submitData = await submitRes.json();
    
    if (submitData.error_code) {
      throw new Error(`text.ru error: ${submitData.error_desc}`);
    }
    
    const textUid = submitData.text_uid;
    
    // Step 2: Poll for results (text.ru is async)
    let result: any = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5s between polls
      
      const checkRes = await fetch("https://api.text.ru/post", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          uid: textUid,
          userkey: apiKey,
          jsonvisible: "detail",
        }),
      });
      result = await checkRes.json();
      
      if (result.text_unique !== undefined) break;
      if (result.error_code === 181) continue; // Still processing
      if (result.error_code) throw new Error(`text.ru error: ${result.error_desc}`);
    }
    
    if (!result || result.text_unique === undefined) {
      throw new Error("text.ru analysis timed out");
    }

    return {
      uniqueness: parseFloat(result.text_unique) || 0,
      spamScore: parseFloat(result.spam_percent) || 0,
      naturalness: 100 - (parseFloat(result.spam_percent) || 0),
      eeat: 0, // text.ru doesn't measure E-E-A-T
      readability: 0, // Not provided by text.ru
      keywordDensity: 0,
      waterScore: parseFloat(result.water_percent) || 0,
      recommendations: [],
      provider: "text.ru",
      raw: result,
    };
  }
}

// ─── AI Self-Analysis Provider (Fallback) ───────────────────────────────────
// Uses the project's AI to evaluate content quality
class AiSelfAnalysisProvider implements SeoAnalysisProvider {
  name = "ai-self";
  private callAi: (prompt: string) => Promise<string>;
  
  constructor(callAi: (prompt: string) => Promise<string>) {
    this.callAi = callAi;
  }
  
  async analyze(text: string, title: string): Promise<SeoAnalysisResult> {
    const prompt = `You are an expert SEO content auditor. Analyze the following article for quality metrics.

Title: "${title}"
Content (first 3000 chars):
${text.substring(0, 3000)}

Evaluate and score each metric from 0-100:
- "uniqueness": How original/unique is this content? (100 = completely unique)
- "spamScore": How spammy/keyword-stuffed is it? (0 = not spammy, 100 = very spammy)
- "naturalness": How natural/human does the writing sound? (100 = very natural)
- "eeat": E-E-A-T score (Expertise, Experience, Authority, Trust)
- "readability": How easy is it to read? (100 = very easy)
- "keywordDensity": Estimated keyword density percentage
- "waterScore": Percentage of filler/fluff content (0 = no filler)
- "recommendations": Array of 3-5 specific improvement suggestions

Output strictly valid JSON:
{
  "uniqueness": number,
  "spamScore": number,
  "naturalness": number,
  "eeat": number,
  "readability": number,
  "keywordDensity": number,
  "waterScore": number,
  "recommendations": [string]
}`;

    const response = await this.callAi(prompt);
    const parsed = JSON.parse(response);
    
    return {
      ...parsed,
      provider: "ai-self",
      raw: parsed,
    };
  }
}

// ─── Provider Factory ───────────────────────────────────────────────────────

export function getSeoProvider(
  preferredProvider?: string,
  aiCallFn?: (prompt: string) => Promise<string>
): SeoAnalysisProvider {
  // Try preferred provider first
  if (preferredProvider === "text.ru" && process.env.TEXTRU_API_KEY) {
    return new TextRuProvider();
  }
  
  // Fallback to AI self-analysis
  if (aiCallFn) {
    return new AiSelfAnalysisProvider(aiCallFn);
  }
  
  throw new Error("No SEO analysis provider available. Configure TEXTRU_API_KEY or provide an AI callback.");
}

export const AVAILABLE_PROVIDERS = [
  { id: "text.ru", name: "Text.ru", description: "Russian-focused uniqueness & spam check", requiresKey: "TEXTRU_API_KEY" },
  { id: "ai-self", name: "AI Self-Analysis", description: "Uses project AI for content evaluation (fallback)", requiresKey: null },
  // Future providers:
  // { id: "pixeltools", name: "PixelTools", description: "SEO analysis suite", requiresKey: "PIXELTOOLS_API_KEY" },
  // { id: "content-watch", name: "Content Watch", description: "Plagiarism checker", requiresKey: "CONTENTWATCH_API_KEY" },
];
