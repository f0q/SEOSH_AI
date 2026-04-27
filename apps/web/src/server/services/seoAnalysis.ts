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
  spellingErrors?: number; // count of spelling errors
  spellDetail?: Array<{    // Detailed spelling errors from Text.ru
    error_type: string;
    reason: string;
    error_text: string;
    replacements: string[];
    start: number;
    end: number;
  }>;
  seoDetail?: {            // Detailed SEO data from Text.ru
    countWords?: number;
    countChars?: number;
    listKeys?: Array<{ key_title: string; count: number }>;
    listKeysGroup?: Array<{ key_title: string; count: number; sub_keys?: Array<{ key_title: string; count: number }> }>;
    mixedWords?: number[];
  };
  recommendations: string[];
  provider: string;
  isTextRuPending?: boolean; // Flag to indicate if Text.ru is still processing
  textRuError?: string;
  raw?: Record<string, unknown>;
}

export interface SeoAnalysisProvider {
  name: string;
  analyze(text: string, title: string, onBackgroundComplete?: (result: SeoAnalysisResult) => Promise<void>): Promise<SeoAnalysisResult>;
}

// ─── Text.ru Provider ───────────────────────────────────────────────────────
// Uses text.ru API for uniqueness, spam, and naturalness checks
class TextRuProvider implements SeoAnalysisProvider {
  name = "text.ru";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async analyze(text: string, title: string): Promise<SeoAnalysisResult> {
    const apiKey = this.apiKey;

    // Sanitize text: remove zero-width chars, normalize whitespace
    const cleanText = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/\r\n/g, '\n')                 // normalize line endings
      .replace(/\t/g, ' ')                     // tabs to spaces
      .trim();

    console.log(`[Text.ru] Submitting text for analysis (length: ${cleanText.length})...`);
    
    // Step 1: Submit text for analysis (with retries for transient errors)
    // API docs: Content-type: application/json, body: JSON.stringify({userkey, text})
    let submitData: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const submitRes = await fetch("https://api.text.ru/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            userkey: apiKey,
          }),
        });
        submitData = await submitRes.json();
        console.log(`[Text.ru] Submission response (attempt ${attempt}):`, JSON.stringify(submitData));
        
        if (submitData.text_uid) break; // Success
        
        if (submitData.error_code) {
          console.warn(`[Text.ru] Submission error on attempt ${attempt}: code=${submitData.error_code}, desc=${submitData.error_desc}`);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 3000 * attempt));
            continue;
          }
        }
      } catch (fetchErr) {
        console.error(`[Text.ru] Fetch error on attempt ${attempt}:`, (fetchErr as Error).message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        throw fetchErr;
      }
    }
    
    if (!submitData?.text_uid) {
      throw new Error(`text.ru error: ${submitData?.error_desc || 'Failed to submit text after 3 attempts'}`);
    }
    
    const textUid = submitData.text_uid;
    console.log(`[Text.ru] Received text UID: ${textUid}. Starting polling...`);
    
    // Step 2: Poll for results (text.ru is async)
    // API docs: Content-type: application/json, body: JSON.stringify({uid, userkey, jsonvisible})
    let finalResult: any = null;
    let latestSeoCheck: string | null = null;
    let latestSpellCheck: string | null = null;
    let uniqueValue: number = 0;
    let gotUniqueness = false;
    
    for (let i = 0; i < 40; i++) {
      console.log(`[Text.ru] Polling attempt ${i + 1}/40 for UID ${textUid}...`);
      await new Promise(r => setTimeout(r, 5000));
      
      const checkRes = await fetch("https://api.text.ru/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: textUid,
          userkey: apiKey,
          jsonvisible: "detail",
        }),
      });
      const result = await checkRes.json();
      finalResult = result;
      
      // Always capture seo_check and spell_check when available (they come even during 181)
      if (result.seo_check && result.seo_check !== latestSeoCheck) {
        latestSeoCheck = result.seo_check;
        console.log(`[Text.ru] Got seo_check data`);
      }
      if (result.spell_check !== undefined && result.spell_check !== latestSpellCheck) {
        latestSpellCheck = typeof result.spell_check === 'string' ? result.spell_check : JSON.stringify(result.spell_check);
        console.log(`[Text.ru] Got spell_check data`);
      }
      
      // Check if uniqueness is ready
      if (result.unique !== undefined || result.text_unique !== undefined) {
        uniqueValue = parseFloat(result.unique || result.text_unique) || 0;
        gotUniqueness = true;
        console.log(`[Text.ru] Analysis complete! Uniqueness: ${uniqueValue}%`);
        break;
      }
      
      if (result.error_code === 181) {
        console.log(`[Text.ru] Still processing (181)... seo_check available: ${!!latestSeoCheck}, spell_check available: ${!!latestSpellCheck}`);
        continue;
      }
      if (result.error_code) {
        console.error(`[Text.ru] API Error during polling:`, result.error_desc);
        throw new Error(`text.ru error: ${result.error_desc}`);
      }
    }
    
    if (!gotUniqueness) {
      console.warn(`[Text.ru] Uniqueness timed out after 40 attempts, but we may have seo_check/spell_check data.`);
    }

    // Parse seo_check
    let spamScore = 0;
    let waterScore = 0;
    let seoDetail: any = null;
    if (latestSeoCheck) {
      try {
        const seoData = typeof latestSeoCheck === 'string' ? JSON.parse(latestSeoCheck) : latestSeoCheck;
        spamScore = parseFloat(seoData.spam_percent) || 0;
        waterScore = parseFloat(seoData.water_percent) || 0;
        seoDetail = {
          countWords: seoData.count_words,
          countChars: seoData.count_chars_with_space,
          listKeys: seoData.list_keys || [],
          listKeysGroup: seoData.list_keys_group || [],
          mixedWords: seoData.mixed_words || [],
        };
        console.log(`[Text.ru] Parsed seo_check: spam=${spamScore}%, water=${waterScore}%`);
      } catch (err) {
        console.error("[Text.ru] Failed to parse seo_check:", err);
      }
    }

    // Parse spell_check
    let spellingErrors = 0;
    let spellDetail: any[] = [];
    if (latestSpellCheck) {
      try {
        const spellData = typeof latestSpellCheck === 'string' ? JSON.parse(latestSpellCheck) : latestSpellCheck;
        if (Array.isArray(spellData)) {
          spellingErrors = spellData.length;
          spellDetail = spellData; // Save full error details: {error_type, reason, error_text, replacements, start, end}
        }
        console.log(`[Text.ru] Parsed spell_check: ${spellingErrors} errors`);
      } catch (err) {
        console.error("[Text.ru] Failed to parse spell_check:", err);
      }
    }

    console.log(`[Text.ru] Final result: uniqueness=${uniqueValue}, spam=${spamScore}, water=${waterScore}, spelling=${spellingErrors}`);

    return {
      uniqueness: uniqueValue,
      spamScore,
      naturalness: 100 - spamScore,
      eeat: 0,
      readability: 0,
      keywordDensity: 0,
      waterScore,
      spellingErrors,
      spellDetail,   // Array of {error_type, reason, error_text, replacements[], start, end}
      seoDetail,     // {countWords, countChars, listKeys[], listKeysGroup[], mixedWords[]}
      recommendations: [],
      provider: "text.ru",
      raw: finalResult,
    };
  }
}

// ─── AI Semantic Analysis Provider (OpenRouter/Gemini) ────────────────────────
// Uses the project's AI to evaluate qualitative content metrics
class AiSelfAnalysisProvider implements SeoAnalysisProvider {
  name = "ai-self";
  private callAi: (prompt: string) => Promise<string>;
  
  constructor(callAi: (prompt: string) => Promise<string>) {
    this.callAi = callAi;
  }
  
  async analyze(text: string, title: string, _onBgComplete?: any, expertData?: Record<string, any>): Promise<SeoAnalysisResult> {
    // Build expert context section if available
    const expertContext = expertData ? `

IMPORTANT — Expert Analysis Data (from Text.ru) to consider in your recommendations:
- Uniqueness: ${expertData.uniqueness ?? 'N/A'}%
- Spam Score: ${expertData.spamScore ?? 'N/A'}%
- Water Score (filler content): ${expertData.waterScore ?? 'N/A'}%
- Spelling Errors: ${expertData.spellingErrors ?? 0}
${expertData.spellDetail?.length ? `- Spelling details: ${expertData.spellDetail.slice(0, 5).map((e: any) => `"${e.error_text}" → ${e.reason}`).join('; ')}` : ''}
Take these metrics into account when generating recommendations. If uniqueness is low, recommend improving originality. If spam is high, recommend reducing keyword density. If water is high, suggest cutting filler phrases.` : '';

    const prompt = `You are an expert SEO content auditor. Analyze the following article for quality metrics.

Title: "${title}"
Content (first 3000 chars):
${text.substring(0, 3000)}
${expertContext}

Evaluate and score each metric from 0-100:
- "spamScore": How over-optimized or keyword-stuffed is it? (0 = totally natural, 100 = blatant keyword stuffing)
- "naturalness": How natural/human does the writing sound? (100 = very natural)
- "eeat": E-E-A-T score (Expertise, Experience, Authority, Trust). (100 = highly authoritative)
- "readability": How easy is it to read and understand? (100 = very easy)
- "keywordDensity": Estimated keyword density percentage
- "relevance": How well does it answer the likely user intent for the title? (100 = perfectly relevant)
- "recommendations": Array of 3-5 specific improvement suggestions

Output strictly valid JSON matching this exact structure, with no markdown code fences:
{
  "spamScore": number,
  "naturalness": number,
  "eeat": number,
  "readability": number,
  "keywordDensity": number,
  "relevance": number,
  "recommendations": [string]
}`;

    let response = await this.callAi(prompt);
    response = response.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(response);
    
    return {
      uniqueness: 0, // AI cannot accurately determine uniqueness
      waterScore: 0, // AI estimation of water is subjective, better handled by Text.ru
      ...parsed,
      provider: "ai-self",
      raw: parsed,
    };
  }
}

// ─── Hybrid Provider (Text.ru + AI) ─────────────────────────────────────────
// Combines hard metrics from Text.ru with semantic metrics from AI
class HybridTextRuAiProvider implements SeoAnalysisProvider {
  name = "hybrid-text.ru+ai";
  private textRu: TextRuProvider;
  private aiSelf: AiSelfAnalysisProvider;

  constructor(aiCallFn: (prompt: string) => Promise<string>, textRuApiKey: string) {
    this.textRu = new TextRuProvider(textRuApiKey);
    this.aiSelf = new AiSelfAnalysisProvider(aiCallFn);
  }

  async analyze(text: string, title: string): Promise<SeoAnalysisResult> {
    // Run both analyses in parallel — both will complete before returning
    console.log("[Hybrid] Starting parallel analysis (Text.ru + AI)...");
    const [textRuResult, aiResult] = await Promise.all([
      this.textRu.analyze(text, title).catch(err => {
        console.error("[Hybrid] Text.ru analysis failed:", err.message);
        return null;
      }),
      this.aiSelf.analyze(text, title).catch(err => {
        console.error("[Hybrid] AI analysis failed:", err.message);
        return null;
      })
    ]);

    console.log("[Hybrid] Text.ru result:", textRuResult ? `uniqueness=${textRuResult.uniqueness}, spam=${textRuResult.spamScore}, water=${textRuResult.waterScore}` : "FAILED");
    console.log("[Hybrid] AI result:", aiResult ? `eeat=${aiResult.eeat}, naturalness=${aiResult.naturalness}` : "FAILED");

    if (!textRuResult && !aiResult) {
      throw new Error("Both Text.ru and AI analysis failed.");
    }
    return this.mergeResults(textRuResult, aiResult);
  }

  private mergeResults(textRuResult: any, aiResult: any): SeoAnalysisResult {
    return {
      uniqueness: textRuResult?.uniqueness ?? 0,
      waterScore: textRuResult?.waterScore ?? 0,
      spellingErrors: textRuResult?.spellingErrors ?? 0,
      spellDetail: textRuResult?.spellDetail ?? [],
      seoDetail: textRuResult?.seoDetail ?? null,
      // Text.ru's spam score represents "water/seo spam", AI represents keyword stuffing. We can average them or pick the worse one.
      // We will prefer AI's spam score if available, as Gemini is better at identifying over-optimization in context.
      spamScore: textRuResult?.spamScore ?? aiResult?.spamScore ?? 0, // Using Text.ru spam score as primary since the user wants it grouped with text.ru metrics
      naturalness: aiResult?.naturalness ?? textRuResult?.naturalness ?? 0,
      eeat: aiResult?.eeat ?? 0,
      readability: aiResult?.readability ?? 0,
      keywordDensity: aiResult?.keywordDensity ?? 0,
      recommendations: aiResult?.recommendations ?? [],
      provider: "hybrid-text.ru+gemini",
      raw: {
        textRu: textRuResult?.raw,
        ai: aiResult?.raw
      }
    };
  }
}

// ─── Provider Factory ───────────────────────────────────────────────────────

export function getSeoProvider(
  preferredProvider?: string,
  aiCallFn?: (prompt: string) => Promise<string>,
  textRuApiKey?: string
): SeoAnalysisProvider {
  const hasTextRu = !!textRuApiKey;

  if (preferredProvider === "hybrid" && hasTextRu && aiCallFn) {
    return new HybridTextRuAiProvider(aiCallFn, textRuApiKey!);
  }
  
  if (preferredProvider === "text.ru" && hasTextRu) {
    return new TextRuProvider(textRuApiKey!);
  }
  
  // Fallback to AI self-analysis
  if (aiCallFn) {
    return new AiSelfAnalysisProvider(aiCallFn);
  }
  
  throw new Error("No SEO analysis provider available. Configure your Text.ru API key in Settings.");
}

export const AVAILABLE_PROVIDERS = [
  { id: "hybrid", name: "Hybrid (Text.ru + AI)", description: "Best overall: Uniqueness + E-E-A-T", requiresKey: "textru" },
  { id: "text.ru", name: "Text.ru", description: "Russian-focused uniqueness & spam check", requiresKey: "textru" },
  { id: "ai-self", name: "AI Self-Analysis", description: "Uses project AI for content evaluation (fallback)", requiresKey: null },
];
