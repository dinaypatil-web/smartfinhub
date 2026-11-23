// Custom robust SSE parser implementation

import {
  predictFromLearning,
  generateMissingFieldOptions,
  recordLearnedTransaction,
  buildLearnedProfileFromHistory,
  type MissingOptionsConfig
} from './aiLearningService';

export { recordLearnedTransaction, buildLearnedProfileFromHistory, generateMissingFieldOptions, type MissingOptionsConfig };

export interface AIMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface AIAnalysisData {
  totalIncome: number;
  totalExpenses: number;
  budgetedExpenses: number;
  transactions: Array<{
    type: string;
    category: string;
    amount: number;
    date: string;
    description?: string;
  }>;
  accountBalances: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
  historicalData?: {
    monthlyAverages: {
      income: number;
      expenses: number;
      savings: number;
    };
    categoryTrends: Record<string, number[]>;
    lastThreeMonths: Array<{
      month: string;
      income: number;
      expenses: number;
      savings: number;
    }>;
  };
}

export type AIProviderType = 'gemini' | 'groq' | 'builtin';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GROQ_MODEL = 'llama3-70b-8192';

export const DEPRECATED_GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'models/gemini-1.5-flash',
  'models/gemini-2.0-flash',
  'models/gemini-1.5-pro'
];

export const DEPRECATED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

export interface AIProviderConfig {
  provider: AIProviderType;
  geminiApiKey: string;
  geminiModel: string;
  groqApiKey: string;
  groqModel: string;
}

export function getAIProviderConfig(): AIProviderConfig {
  let provider: AIProviderType = 'builtin';
  let geminiApiKey = '';
  let geminiModel = DEFAULT_GEMINI_MODEL;
  let groqApiKey = '';
  let groqModel = DEFAULT_GROQ_MODEL;

  if (typeof window !== 'undefined' && window.localStorage) {
    const savedProvider = localStorage.getItem('smartfin_ai_provider') as AIProviderType | null;
    const savedGeminiKey = localStorage.getItem('smartfin_gemini_api_key');
    const savedGeminiModel = localStorage.getItem('smartfin_gemini_model');
    const savedGroqKey = localStorage.getItem('smartfin_groq_api_key');
    const savedGroqModel = localStorage.getItem('smartfin_groq_model');

    if (savedGeminiKey) geminiApiKey = savedGeminiKey.trim();
    if (savedGroqKey) groqApiKey = savedGroqKey.trim();

    if (savedGeminiModel) {
      const clean = savedGeminiModel.trim().replace(/^models\//, '');
      if (DEPRECATED_GEMINI_MODELS.includes(clean)) {
        geminiModel = DEFAULT_GEMINI_MODEL;
        localStorage.setItem('smartfin_gemini_model', DEFAULT_GEMINI_MODEL);
      } else {
        geminiModel = clean;
      }
    }

    if (savedGroqModel) {
      const clean = savedGroqModel.trim();
      if (DEPRECATED_GROQ_MODELS.includes(clean)) {
        groqModel = DEFAULT_GROQ_MODEL;
        localStorage.setItem('smartfin_groq_model', DEFAULT_GROQ_MODEL);
      } else {
        groqModel = clean;
      }
    }

    if (savedProvider && ['gemini', 'groq', 'builtin'].includes(savedProvider)) {
      const explicitBuiltin = localStorage.getItem('smartfin_explicit_builtin') === 'true';
      if (savedProvider === 'builtin' && !explicitBuiltin && (geminiApiKey || groqApiKey)) {
        // User has cloud keys configured; prioritize cloud instead of accidental stale builtin
        provider = geminiApiKey ? 'gemini' : 'groq';
        localStorage.setItem('smartfin_ai_provider', provider);
      } else {
        provider = savedProvider;
      }
    } else if (geminiApiKey) {
      provider = 'gemini';
    } else if (groqApiKey) {
      provider = 'groq';
    }
  }

  // Fallback to env vars if available
  if (!geminiApiKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    geminiApiKey = String(import.meta.env.VITE_GEMINI_API_KEY).trim();
    if (provider === 'builtin') provider = 'gemini';
  }
  if (!groqApiKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) {
    groqApiKey = String(import.meta.env.VITE_GROQ_API_KEY).trim();
    if (provider === 'builtin' && !geminiApiKey) provider = 'groq';
  }

  return { provider, geminiApiKey, geminiModel, groqApiKey, groqModel };
}

export function saveAIProviderConfig(config: Partial<AIProviderConfig>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  if (config.provider) {
    localStorage.setItem('smartfin_ai_provider', config.provider);
    if (config.provider === 'builtin') {
      localStorage.setItem('smartfin_explicit_builtin', 'true');
    } else {
      localStorage.removeItem('smartfin_explicit_builtin');
    }
  }
  if (config.geminiApiKey !== undefined) {
    const trimmed = config.geminiApiKey.trim();
    localStorage.setItem('smartfin_gemini_api_key', trimmed);
    if (trimmed && localStorage.getItem('smartfin_ai_provider') === 'builtin' && localStorage.getItem('smartfin_explicit_builtin') !== 'true') {
      localStorage.setItem('smartfin_ai_provider', 'gemini');
    }
  }
  if (config.geminiModel !== undefined) {
    localStorage.setItem('smartfin_gemini_model', config.geminiModel.trim().replace(/^models\//, ''));
  }
  if (config.groqApiKey !== undefined) {
    const trimmed = config.groqApiKey.trim();
    localStorage.setItem('smartfin_groq_api_key', trimmed);
    if (trimmed && localStorage.getItem('smartfin_ai_provider') === 'builtin' && localStorage.getItem('smartfin_explicit_builtin') !== 'true' && !localStorage.getItem('smartfin_gemini_api_key')) {
      localStorage.setItem('smartfin_ai_provider', 'groq');
    }
  }
  if (config.groqModel !== undefined) {
    localStorage.setItem('smartfin_groq_model', config.groqModel.trim());
  }
}

export async function fetchGeminiAvailableModels(apiKey: string): Promise<string[]> {
  const fallbackList = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
  if (!apiKey || !apiKey.trim()) return fallbackList;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url);
    if (!res.ok) return fallbackList;
    const data = await res.json();
    if (Array.isArray(data.models)) {
      const available = data.models
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => String(m.name || '').replace(/^models\//, ''))
        .filter(Boolean);
      if (available.length > 0) return available;
    }
  } catch (err) {
    console.warn('Failed to dynamically fetch Gemini models, using fallbacks:', err);
  }
  return fallbackList;
}

export async function fetchGroqAvailableModels(apiKey: string): Promise<string[]> {
  const fallbackList = ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  if (!apiKey || !apiKey.trim()) return fallbackList;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    if (!res.ok) return fallbackList;
    const data = await res.json();
    if (Array.isArray(data.data)) {
      const available = data.data
        .filter((m: any) => m.active !== false && !m.id.includes('whisper') && !m.id.includes('embed'))
        .map((m: any) => String(m.id))
        .filter(Boolean);
      if (available.length > 0) return available;
    }
  } catch (err) {
    console.warn('Failed to dynamically fetch Groq models, using fallbacks:', err);
  }
  return fallbackList;
}


export async function testAIProviderConnection(
  provider: AIProviderType,
  apiKey: string,
  model?: string
): Promise<{ success: boolean; message: string; detectedModel?: string }> {
  if (provider === 'builtin') {
    return {
      success: true,
      message: 'Smart Built-in Offline Engine is active, responsive, and ready!'
    };
  }

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      message: `Please enter a valid API key for ${provider === 'gemini' ? 'Google Gemini' : 'Groq Cloud'}.`
    };
  }

  const trimmedKey = apiKey.trim();

  if (provider === 'gemini') {
    let targetModel = (model || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, '');
    if (DEPRECATED_GEMINI_MODELS.includes(targetModel)) {
      targetModel = DEFAULT_GEMINI_MODEL;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with: OK' }] }]
        })
      });
      if (res.ok) {
        return {
          success: true,
          message: `Successfully connected to Google Gemini (${targetModel})!`,
          detectedModel: targetModel
        };
      }

      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Gemini test failed with HTTP ${res.status}`;

      // Auto-heal if model not found or deprecated
      if (res.status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
        const available = await fetchGeminiAvailableModels(trimmedKey);
        const candidate = available.find(m => m.includes('2.5-flash') || m.includes('flash')) || available[0];
        if (candidate && candidate !== targetModel) {
          const retryRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(trimmedKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Respond with: OK' }] }]
            })
          });
          if (retryRes.ok) {
            saveAIProviderConfig({ geminiModel: candidate });
            return {
              success: true,
              message: `Successfully connected! Model '${targetModel}' was deprecated; auto-upgraded to active '${candidate}'.`,
              detectedModel: candidate
            };
          }
        }
      }

      return {
        success: false,
        message: errMsg
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Failed to reach Google Gemini API'
      };
    }
  }

  if (provider === 'groq') {
    let targetModel = (model || DEFAULT_GROQ_MODEL).trim();
    if (DEPRECATED_GROQ_MODELS.includes(targetModel)) {
      targetModel = DEFAULT_GROQ_MODEL;
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Respond with OK' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        return {
          success: true,
          message: `Successfully connected to Groq Cloud (${targetModel})!`,
          detectedModel: targetModel
        };
      }

      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Groq test failed with HTTP ${res.status}`;

      // Auto-heal if model does not exist or user lacks access
      if (res.status === 400 || res.status === 404 || errMsg.includes('does not exist') || errMsg.includes('do not have access')) {
        const available = await fetchGroqAvailableModels(trimmedKey);
        const candidate = available.find(m => m.includes('70b') || m.includes('llama3') || m.includes('8b')) || available[0];
        if (candidate && candidate !== targetModel) {
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${trimmedKey}`
            },
            body: JSON.stringify({
              model: candidate,
              messages: [{ role: 'user', content: 'Respond with OK' }],
              max_tokens: 5
            })
          });
          if (retryRes.ok) {
            saveAIProviderConfig({ groqModel: candidate });
            return {
              success: true,
              message: `Successfully connected! Model '${targetModel}' is unavailable on your key; auto-switched to active '${candidate}'.`,
              detectedModel: candidate
            };
          }
        }
      }

      return {
        success: false,
        message: errMsg
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Failed to reach Groq Cloud API'
      };
    }
  }

  return { success: false, message: 'Unknown AI provider' };
}

async function callGeminiJSON(
  apiKey: string,
  model: string,
  contents: any[],
  systemInstruction?: string
): Promise<string> {
  let cleanModel = (model || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, '');
  if (DEPRECATED_GEMINI_MODELS.includes(cleanModel)) {
    cleanModel = DEFAULT_GEMINI_MODEL;
  }

  const makeUrl = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let response = await fetch(makeUrl(cleanModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson.error?.message || response.statusText || 'Gemini API call failed';

    // Auto-heal if model is deprecated or not found
    if (response.status === 404 || message.includes('not found') || message.includes('no longer available')) {
      console.warn(`Model ${cleanModel} failed (${message}). Auto-healing model discovery...`);
      const available = await fetchGeminiAvailableModels(apiKey);
      const fallbackModel = available.find(m => m.includes('2.5-flash') || m.includes('flash')) || available[0];
      if (fallbackModel && fallbackModel !== cleanModel) {
        cleanModel = fallbackModel;
        saveAIProviderConfig({ geminiModel: fallbackModel });
        response = await fetch(makeUrl(cleanModel), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const finalMsg = err.error?.message || message;
      throw new Error(`Gemini API Error (${response.status}): ${finalMsg}`);
    }
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

async function callGroqJSON(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  let targetModel = (model || DEFAULT_GROQ_MODEL).trim();
  if (DEPRECATED_GROQ_MODELS.includes(targetModel)) {
    targetModel = DEFAULT_GROQ_MODEL;
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const makeBody = (m: string) => ({
    model: m,
    messages,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(makeBody(targetModel))
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const message = errJson.error?.message || response.statusText || 'Groq API call failed';

    if (response.status === 400 || response.status === 404 || message.includes('does not exist') || message.includes('do not have access')) {
      console.warn(`Groq model ${targetModel} failed (${message}). Auto-healing model discovery...`);
      const available = await fetchGroqAvailableModels(apiKey);
      const fallbackModel = available.find(m => m.includes('70b') || m.includes('llama3') || m.includes('8b')) || available[0];
      if (fallbackModel && fallbackModel !== targetModel) {
        targetModel = fallbackModel;
        saveAIProviderConfig({ groqModel: fallbackModel });
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(makeBody(targetModel))
        });
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const finalMsg = err.error?.message || message;
      throw new Error(`Groq API Error (${response.status}): ${finalMsg}`);
    }
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text;
}

async function callGeminiStream(
  apiKey: string,
  model: string,
  contents: any[],
  systemInstruction?: string,
  responseMimeType?: string,
  onChunk?: (text: string) => void
): Promise<string> {
  let cleanModel = (model || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, '');
  if (DEPRECATED_GEMINI_MODELS.includes(cleanModel)) {
    cleanModel = DEFAULT_GEMINI_MODEL;
  }

  const makeUrl = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;
  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.2
    }
  };
  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let response = await fetch(makeUrl(cleanModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson.error?.message || response.statusText || 'Gemini API call failed';

    // Auto-heal if model is deprecated or not found
    if (response.status === 404 || message.includes('not found') || message.includes('no longer available')) {
      console.warn(`Model ${cleanModel} failed (${message}). Attempting auto-healing model discovery...`);
      const available = await fetchGeminiAvailableModels(apiKey);
      const fallbackModel = available.find(m => m.includes('2.5-flash') || m.includes('flash')) || available[0];
      if (fallbackModel && fallbackModel !== cleanModel) {
        cleanModel = fallbackModel;
        saveAIProviderConfig({ geminiModel: fallbackModel });
        response = await fetch(makeUrl(cleanModel), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const finalMsg = err.error?.message || message;
      throw new Error(`Gemini API Error (${response.status}): ${finalMsg}`);
    }
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from Gemini');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          fullText += text;
          if (onChunk) onChunk(text);
        }
      } catch {
        // ignore chunk parse
      }
    }
  }

  return fullText;
}

async function callGroqStream(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  responseFormatJson?: boolean,
  onChunk?: (text: string) => void
): Promise<string> {
  let targetModel = (model || DEFAULT_GROQ_MODEL).trim();
  if (DEPRECATED_GROQ_MODELS.includes(targetModel)) {
    targetModel = DEFAULT_GROQ_MODEL;
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const makeBody = (m: string) => {
    const b: any = {
      model: m,
      messages,
      temperature: 0.2,
      stream: true
    };
    if (responseFormatJson) {
      b.response_format = { type: 'json_object' };
    }
    return b;
  };

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(makeBody(targetModel))
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const message = errJson.error?.message || response.statusText || 'Groq API call failed';

    // Auto-heal if model does not exist or user lacks access
    if (response.status === 400 || response.status === 404 || message.includes('does not exist') || message.includes('do not have access')) {
      console.warn(`Groq model ${targetModel} failed (${message}). Attempting auto-healing model discovery...`);
      const available = await fetchGroqAvailableModels(apiKey);
      const fallbackModel = available.find(m => m.includes('70b') || m.includes('llama3') || m.includes('8b')) || available[0];
      if (fallbackModel && fallbackModel !== targetModel) {
        targetModel = fallbackModel;
        saveAIProviderConfig({ groqModel: fallbackModel });
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(makeBody(targetModel))
        });
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const finalMsg = err.error?.message || message;
      throw new Error(`Groq API Error (${response.status}): ${finalMsg}`);
    }
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from Groq');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) {
          fullText += chunk;
          if (onChunk) onChunk(chunk);
        }
      } catch {
        // ignore chunk parse
      }
    }
  }

  return fullText;
}

function generateLocalFinancialAnalysis(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void
): void {
  const income = Number(data.totalIncome || 0);
  const expenses = Number(data.totalExpenses || 0);
  const netSavings = income - expenses;
  const savingsRate = income > 0 ? ((netSavings / income) * 100).toFixed(1) : '0.0';
  const budget = Number(data.budgetedExpenses || 0);

  // Group expenses by category
  const catMap: Record<string, number> = {};
  for (const t of data.transactions || []) {
    if (t.type === 'expense') {
      const amt = Number(t.amount || 0);
      catMap[t.category] = (catMap[t.category] || 0) + amt;
    }
  }
  const sortedCats: Array<[string, number]> = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const topCategoriesText = sortedCats.length > 0
    ? sortedCats.slice(0, 5).map(([cat, amt]: [string, number]) => `- **${cat}**: ₹${amt.toLocaleString('en-IN')} (${income > 0 ? ((amt / income) * 100).toFixed(1) : 0}% of income)`).join('\n')
    : '- No tracked expenses recorded yet this month.';

  const isPositiveSavings = netSavings >= 0;

  const report = `## Executive Financial Overview
- **Total Monthly Inflows:** ₹${income.toLocaleString('en-IN')}
- **Total Monthly Outflows:** ₹${expenses.toLocaleString('en-IN')}
- **Net Cash Flow:** ₹${netSavings.toLocaleString('en-IN')} (${savingsRate}% savings rate)
${budget > 0 ? `- **Budget Health:** ${expenses <= budget ? `Under budget by ₹${(budget - expenses).toLocaleString('en-IN')}` : `Over budget by ₹${(expenses - budget).toLocaleString('en-IN')}`}` : ''}

---

## 1. Income & Expense Dynamics
${isPositiveSavings
  ? `Your finances are in a **healthy surplus position** with an estimated savings rate of **${savingsRate}%**. Maintaining an operational buffer above 20% provides strong protection against unexpected shocks and supports systematic capital accumulation.`
  : `Your current monthly expenses exceed your income by **₹${Math.abs(netSavings).toLocaleString('en-IN')}**. Immediate attention to discretionary spending and credit line burn rate is advised.`
}

### Top Expense Categories
${topCategoriesText}

---

## 2. Liquidity & Account Health
${(data.accountBalances && data.accountBalances.length > 0)
  ? data.accountBalances.map((a: { name: string; balance: number; type: string }) => `- **${a.name}** (${a.type}): ₹${Number(a.balance).toLocaleString('en-IN')}`).join('\n')
  : '- Account balances are stable across configured ledgers.'
}

---

## 3. Actionable Recommendations
1. **Discretionary Pacing:** Target a 10-15% reduction in your top category (${sortedCats[0]?.[0] || 'lifestyle'}) through mindful substitution.
2. **Automate Surplus Allocation:** Direct at least 50% of monthly surplus into high-yield emergency reserves or diversified index funds.
3. **Debt Optimization:** Ensure high-interest revolving credit balances are settled before the due date to avoid interest slippage.

---
*Generated by SmartFinHub Intelligent Financial Engine.*`;

  const chunks = report.split('\n\n');
  let i = 0;
  const interval = setInterval(() => {
    if (i < chunks.length) {
      onChunk(chunks[i] + '\n\n');
      i++;
    } else {
      clearInterval(interval);
      onComplete();
    }
  }, 40);
}

function generateLocalBudgetOptimization(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void
): void {
  const income = Number(data.totalIncome || 0);
  const expenses = Number(data.totalExpenses || 0);
  const targetNeeds = income * 0.5;
  const targetWants = income * 0.3;
  const targetSavings = income * 0.2;

  const catMap: Record<string, number> = {};
  for (const t of data.transactions || []) {
    if (t.type === 'expense') {
      const amt = Number(t.amount || 0);
      catMap[t.category] = (catMap[t.category] || 0) + amt;
    }
  }
  const sortedCats: Array<[string, number]> = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const report = `## Budget Optimization Strategy (50/30/20 Framework)

Based on your current monthly income of **₹${income.toLocaleString('en-IN')}** and recorded expenses of **₹${expenses.toLocaleString('en-IN')}**, here is your optimized financial blueprint:

### 1. Target Category Allocations
- **Essential Needs (50% max):** Target budget ₹${targetNeeds.toLocaleString('en-IN')}/mo (Housing, Utilities, Groceries, Commute, Minimum Debt Payments)
- **Discretionary Wants (30% max):** Target budget ₹${targetWants.toLocaleString('en-IN')}/mo (Dining Out, Entertainment, Non-essential Shopping)
- **Savings & Debt Acceleration (20% min):** Target allocation ₹${targetSavings.toLocaleString('en-IN')}/mo (Emergency Fund, SIPs, Prepayments)

---

### 2. Category Reduction Targets
${sortedCats.length > 0 ? sortedCats.slice(0, 4).map(([cat, amt]: [string, number]) => {
  const suggestedCut = Math.round(amt * 0.15);
  const newBudget = Math.round(amt * 0.85);
  return `- **${cat}:** Current ₹${amt.toLocaleString('en-IN')} → Recommended Target **₹${newBudget.toLocaleString('en-IN')}** (Save ~₹${suggestedCut.toLocaleString('en-IN')}/mo)`;
}).join('\n') : '- Record categorised transactions to receive granular item-by-item reduction targets.'}

---

### 3. Immediate High-Priority Actions
1. **Trim Top Discretionary Leaks:** Review recurring subscriptions and dining/takeout deliveries from the past 30 days.
2. **Zero-Balance Buffer:** Keep 1 month of essential expenses in your primary checking account to prevent overdrafts.
3. **Automate Pay-Yourself-First:** Schedule transfers to your savings or investment accounts on salary day before discretionary spending begins.

---
*Generated by SmartFinHub Built-in Financial Optimization Engine.*`;

  const chunks = report.split('\n\n');
  let i = 0;
  const interval = setInterval(() => {
    if (i < chunks.length) {
      onChunk(chunks[i] + '\n\n');
      i++;
    } else {
      clearInterval(interval);
      onComplete();
    }
  }, 40);
}

export async function generateFinancialAnalysis(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  const config = getAIProviderConfig();
  const prompt = buildFinancialAnalysisPrompt(data);

  if (config.provider === 'gemini' && config.geminiApiKey) {
    try {
      await callGeminiStream(
        config.geminiApiKey,
        config.geminiModel,
        [{ role: 'user', parts: [{ text: prompt }] }],
        undefined,
        undefined,
        onChunk
      );
      onComplete();
      return;
    } catch (e: any) {
      console.warn('Gemini generateFinancialAnalysis failed, trying secondary cloud provider if available:', e);
      if (config.groqApiKey) {
        try {
          await callGroqStream(
            config.groqApiKey,
            config.groqModel,
            [{ role: 'user', content: prompt }],
            false,
            onChunk
          );
          onComplete();
          return;
        } catch (err2: any) {
          console.warn('Groq secondary failover also failed:', err2);
        }
      }
    }
  } else if (config.provider === 'groq' && config.groqApiKey) {
    try {
      await callGroqStream(
        config.groqApiKey,
        config.groqModel,
        [{ role: 'user', content: prompt }],
        false,
        onChunk
      );
      onComplete();
      return;
    } catch (e: any) {
      console.warn('Groq generateFinancialAnalysis failed, trying secondary cloud provider if available:', e);
      if (config.geminiApiKey) {
        try {
          await callGeminiStream(
            config.geminiApiKey,
            config.geminiModel,
            [{ role: 'user', parts: [{ text: prompt }] }],
            undefined,
            undefined,
            onChunk
          );
          onComplete();
          return;
        } catch (err2: any) {
          console.warn('Gemini secondary failover also failed:', err2);
        }
      }
    }
  }

  // Fallback to local financial analysis generator
  try {
    generateLocalFinancialAnalysis(data, onChunk, onComplete);
  } catch (err: any) {
    onError(err?.message || 'Failed to generate financial analysis');
  }
}

function buildFinancialAnalysisPrompt(data: AIAnalysisData): string {
  const totalIncomeNum = Number(data.totalIncome || 0);
  const totalExpensesNum = Number(data.totalExpenses || 0);
  const budgetedExpensesNum = Number(data.budgetedExpenses || 0);

  const savingsRate = totalIncomeNum > 0
    ? ((totalIncomeNum - totalExpensesNum) / totalIncomeNum * 100).toFixed(1)
    : '0';

  const budgetAdherence = budgetedExpensesNum > 0
    ? ((totalExpensesNum / budgetedExpensesNum) * 100).toFixed(1)
    : 'N/A';

  const categoryBreakdown = data.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const amt = Number(t.amount || 0);
      acc[t.category] = (acc[t.category] || 0) + amt;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
    .join(', ');

  let historicalSection = '';
  if (data.historicalData) {
    const { monthlyAverages, lastThreeMonths } = data.historicalData;
    historicalSection = `

**Historical Trends (Last 3 Months):**
${lastThreeMonths.map(m => {
      const inc = Number(m.income || 0);
      const exp = Number(m.expenses || 0);
      const sav = Number(m.savings || 0);
      return `- ${m.month}: Income ₹${inc.toFixed(2)}, Expenses ₹${exp.toFixed(2)}, Savings ₹${sav.toFixed(2)}`;
    }).join('\n')}

**Monthly Averages:**
- Average Income: ₹${Number(monthlyAverages.income || 0).toFixed(2)}
- Average Expenses: ₹${Number(monthlyAverages.expenses || 0).toFixed(2)}
- Average Savings: ₹${Number(monthlyAverages.savings || 0).toFixed(2)}`;
  }

  return `You are a professional financial advisor with expertise in personal finance management. Analyze the following financial data and provide comprehensive insights, current month advice, and future budget recommendations.

**Current Month Financial Summary:**
- Total Income: ₹${totalIncomeNum.toFixed(2)}
- Total Expenses: ₹${totalExpensesNum.toFixed(2)}
- Budgeted Expenses: ₹${budgetedExpensesNum.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Budget Adherence: ${budgetAdherence}%

**Top Expense Categories:**
${topCategories || 'No expenses recorded'}

**Account Balances:**
${data.accountBalances.map(acc => {
    const bal = Number(acc.balance || 0);
    let note = '';
    if (acc.type === 'credit_card' && bal < 0) {
      note = ' (Note: This negative balance represents a positive advance payment/credit surplus - the user has paid ahead)';
    }
    return `- ${acc.name} (${acc.type}): ₹${bal.toFixed(2)}${note}`;
  }).join('\n')}
${historicalSection}

**Recent Transactions (last 10):**
${data.transactions.slice(-10).map(t => {
    const desc = t.description ? ` - "${t.description}"` : '';
    const amt = Number(t.amount || 0);
    return `- ${t.date}: ${t.type} - ${t.category} - ₹${amt.toFixed(2)}${desc}`;
  }).join('\n')}

**IMPORTANT**: Pay special attention to transaction descriptions as they provide valuable context about spending patterns, merchant names, and specific purchase details. Use these descriptions to:
- Identify recurring expenses and subscriptions
- Detect unusual or one-time purchases
- Recognize specific merchants or vendors
- Understand the nature of expenses better
- Provide more personalized and actionable recommendations

**Credit Card Advance Payments**: Pay close attention to credit card balances. A negative credit card balance represents an **advance payment (credit surplus)**, meaning the user has proactively paid ahead. This is a highly positive financial habit. If you detect any negative credit card balances:
- Explicitly commend the user for this proactive advance payment habit.
- Treat it as a credit surplus/asset rather than a debt liability in your analysis.
- Highlight it as a major strength in the 'Financial Health Assessment' section.

Please provide a comprehensive analysis with the following sections:

## 1. Current Month Analysis & Advice
- Evaluate spending patterns for the current month
- Identify any unusual or concerning transactions (use descriptions for context)
- Provide specific recommendations for the remaining days of this month
- Highlight areas where the user is doing well (including commendation for credit card advance payments/pre-payments)

## 2. Financial Health Assessment
- Overall evaluation of current financial situation
- Comparison with historical trends (if available)
- Strengths and areas for improvement

## 3. Budget Analysis
- How well expenses align with the budget
- Categories that are over/under budget
- Areas of concern and opportunities

## 4. Future Budget Recommendations
Based on historical data and current trends, suggest:
- Recommended budget for next month (category-wise breakdown)
- Realistic savings targets
- Adjustments to current spending patterns
- Expected outcomes if recommendations are followed

## 5. Expense Optimization Strategies
- Specific, actionable recommendations to reduce expenses
- Category-wise suggestions for the top spending categories
- Use transaction descriptions to identify specific merchants or services that could be optimized
- Quick wins vs. long-term changes

## 6. Savings & Investment Opportunities
- Ways to increase savings based on spending patterns
- Suggestions for emergency fund building
- Investment recommendations based on savings capacity

## 7. Action Plan
- Prioritized steps to improve financial health
- Timeline for implementing changes
- Metrics to track progress

Format your response in clear sections with bullet points and specific numbers. Be practical, encouraging, and data-driven. Use emojis sparingly for visual appeal.`;
}

export async function generateBudgetOptimization(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const prompt = `You are a financial planning expert. Based on the following financial data, suggest an optimized monthly budget that reduces expenses while maintaining quality of life.

**Current Financial Data:**
- Monthly Income: ₹${Number(data.totalIncome || 0).toFixed(2)}
- Current Expenses: ₹${Number(data.totalExpenses || 0).toFixed(2)}
- Current Budget: ₹${Number(data.budgetedExpenses || 0).toFixed(2)}

**Expense Breakdown:**
${Object.entries(
    data.transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const amt = Number(t.amount || 0);
        acc[t.category] = (acc[t.category] || 0) + amt;
        return acc;
      }, {} as Record<string, number>)
  )
      .map(([cat, amt]) => `- ${cat}: ₹${amt.toFixed(2)}`)
      .join('\n')}

Please provide:
1. **Optimized Budget Allocation**: Suggested budget for each category
2. **Reduction Targets**: Specific percentage or amount to reduce in each category
3. **Priority Areas**: Which expenses to tackle first
4. **Practical Tips**: How to achieve these reductions without sacrificing essentials
5. **Expected Savings**: Total monthly savings from the optimized budget

Be realistic and practical. Focus on sustainable changes.`;

    const config = getAIProviderConfig();

    if (config.provider === 'gemini' && config.geminiApiKey) {
      try {
        await callGeminiStream(
          config.geminiApiKey,
          config.geminiModel,
          [{ role: 'user', parts: [{ text: prompt }] }],
          undefined,
          undefined,
          onChunk
        );
        onComplete();
        return;
      } catch (e: any) {
        console.warn('Gemini generateBudgetOptimization failed, trying secondary cloud provider if available:', e);
        if (config.groqApiKey) {
          try {
            await callGroqStream(
              config.groqApiKey,
              config.groqModel,
              [{ role: 'user', content: prompt }],
              false,
              onChunk
            );
            onComplete();
            return;
          } catch (err2: any) {
            console.warn('Groq secondary failover also failed:', err2);
          }
        }
      }
    } else if (config.provider === 'groq' && config.groqApiKey) {
      try {
        await callGroqStream(
          config.groqApiKey,
          config.groqModel,
          [{ role: 'user', content: prompt }],
          false,
          onChunk
        );
        onComplete();
        return;
      } catch (e: any) {
        console.warn('Groq generateBudgetOptimization failed, trying secondary cloud provider if available:', e);
        if (config.geminiApiKey) {
          try {
            await callGeminiStream(
              config.geminiApiKey,
              config.geminiModel,
              [{ role: 'user', parts: [{ text: prompt }] }],
              undefined,
              undefined,
              onChunk
            );
            onComplete();
            return;
          } catch (err2: any) {
            console.warn('Gemini secondary failover also failed:', err2);
          }
        }
      }
    }

    // Fallback to local budget optimization generator
    try {
      generateLocalBudgetOptimization(data, onChunk, onComplete);
    } catch (err: any) {
      onError(err instanceof Error ? err.message : 'Failed to generate optimization');
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to generate optimization');
  }
}

export interface BatchTransactionItem {
  transaction_type: 'income' | 'expense' | 'withdrawal' | 'transfer';
  amount: number;
  from_account_id?: string | null;
  to_account_id?: string | null;
  account_name?: string | null;
  category?: string | null;
  income_category?: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
  description?: string | null;
  transaction_date?: string | null;
}

export interface SmartChatbotResult {
  intent: 'transaction' | 'account' | 'budget' | 'financial_inquiry' | 'emi_calculator' | 'financial_analysis' | 'general_help';
  extractedInfo: {
    // For transaction
    transaction_type?: 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | 'interest_charge' | null;
    amount?: number | null;
    from_account_id?: string | null;
    to_account_id?: string | null;
    category?: string | null;
    income_category?: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
    description?: string | null;
    transaction_date?: string | null;
    is_emi?: boolean | null;
    emi_months?: number | null;
    bank_charges?: number | null;

    // For account
    account_type?: 'cash' | 'bank' | 'credit_card' | 'loan' | null;
    account_name?: string | null;
    balance?: number | null;
    currency?: string | null;
    country?: string | null;
    institution_name?: string | null;
    last_4_digits?: string | null;
    credit_limit?: number | null;
    loan_principal?: number | null;
    loan_tenure_months?: number | null;
    current_interest_rate?: number | null;
    loan_start_date?: string | null;
    due_date?: number | null;
    statement_day?: number | null;
    due_day?: number | null;
    web_url?: string | null;
    ios_app_url?: string | null;
    android_app_url?: string | null;
    institution_logo?: string | null;

    // For budget
    month?: number | null;
    year?: number | null;
    budgeted_income?: number | null;
    budgeted_expenses?: number | null;
    category_budgets?: Record<string, number> | null;

    // For emi_calculator
    principal?: number | null;
    annual_rate?: number | null;
    tenure_months?: number | null;
  };
  batchTransactions?: BatchTransactionItem[];
  isComplete: boolean;
  missingFields: string[];
  missingOptions?: MissingOptionsConfig | null;
  reply?: string;
  clarificationQuestion: string;
  extraContext?: any;
  engineUsed?: 'gemini' | 'groq' | 'builtin';
  fallbackReason?: string;
}

// Helper to resolve an account from natural language text, ID, or keywords
function resolveAccountFromText(
  text: string | null | undefined,
  accounts: any[],
  defaultAccId: string | null = null
): string | null {
  if (!text || !accounts || accounts.length === 0) return defaultAccId;
  const t = text.trim().toLowerCase();

  // 1. Direct match with account ID
  const directId = accounts.find(a => a.id === text.trim());
  if (directId) return directId.id;

  // 2. Direct match with account name (case-insensitive)
  for (const acc of accounts) {
    const name = acc.account_name.toLowerCase();
    if (t.includes(name) || name.includes(t)) return acc.id;
  }

  // 3. Keyword / bank brand matching
  const bankKeywords = [
    { keys: ['hdfc'], type: 'hdfc' },
    { keys: ['sbi', 'state bank'], type: 'sbi' },
    { keys: ['icici'], type: 'icici' },
    { keys: ['axis'], type: 'axis' },
    { keys: ['kotak'], type: 'kotak' },
    { keys: ['pnb', 'punjab'], type: 'pnb' },
    { keys: ['bob', 'baroda'], type: 'baroda' },
    { keys: ['idbi'], type: 'idbi' },
    { keys: ['yes bank', 'yesbank'], type: 'yes' },
    { keys: ['indusind'], type: 'indus' },
    { keys: ['canara'], type: 'canara' },
    { keys: ['cash', 'wallet', 'pocket', 'petty'], type: 'cash' },
    { keys: ['credit card', 'creditcard', 'cc'], type: 'credit_card' },
  ];

  for (const bk of bankKeywords) {
    if (bk.keys.some(k => t.includes(k))) {
      if (bk.type === 'cash') {
        const cashAcc = accounts.find(a => a.account_type === 'cash');
        if (cashAcc) return cashAcc.id;
      } else if (bk.type === 'credit_card') {
        const matchedCC = accounts.find(a => a.account_type === 'credit_card' && bk.keys.some(k => a.account_name.toLowerCase().includes(k)));
        if (matchedCC) return matchedCC.id;
        const anyCC = accounts.find(a => a.account_type === 'credit_card');
        if (anyCC) return anyCC.id;
      } else {
        const matched = accounts.find(a => a.account_name.toLowerCase().includes(bk.type));
        if (matched) return matched.id;
      }
    }
  }

  return defaultAccId;
}

const NLP_MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

const nlpMonthNamesPattern = Object.keys(NLP_MONTHS).sort((a, b) => b.length - a.length).join('|');

const NLP_WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6
};

const nlpWeekdayPattern = Object.keys(NLP_WEEKDAYS).sort((a, b) => b.length - a.length).join('|');

// Helper to parse dates from natural language text
export function parseDateFromText(text: string | null | undefined, currentDate: string): string {
  if (!text) return currentDate;
  const t = text.toLowerCase();
  const curr = new Date(currentDate);
  const currYear = curr.getFullYear();
  const currMonth = curr.getMonth(); // 0-indexed (0=Jan..11=Dec)
  const currDayOfWeek = curr.getDay(); // 0=Sun..6=Sat

  // Helper to format date YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Relative: today / aaj
  if (/\b(?:today|aaj)\b/i.test(t)) {
    return currentDate;
  }

  // 2. Relative: day before yesterday / parso
  if (/\b(?:day\s+before\s+yesterday|parso)\b/i.test(t)) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 2);
    return formatYMD(d);
  }

  // 3. Relative: yesterday / kal
  if (/\b(?:yesterday|kal)\b/i.test(t)) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return formatYMD(d);
  }

  // 4. Relative: X days ago
  const daysAgoMatch = t.match(/\b(\d+)\s+days?\s+ago\b/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(currentDate);
    d.setDate(d.getDate() - days);
    return formatYMD(d);
  }

  // 5. Weekdays: e.g. "last Sunday", "on Sunday", "this Monday", "Friday"
  const weekdayMatch = t.match(new RegExp(`\\b(?:(last|this|past|previous|on)\\s+)?(${nlpWeekdayPattern})\\b`, 'i'));
  if (weekdayMatch) {
    const prefix = (weekdayMatch[1] || '').toLowerCase();
    const wdayName = weekdayMatch[2].toLowerCase();
    const targetWday = NLP_WEEKDAYS[wdayName];

    let diff = (currDayOfWeek - targetWday + 7) % 7;
    if (prefix === 'last' || prefix === 'past' || prefix === 'previous') {
      if (diff === 0) diff = 7;
    } else if (diff === 0) {
      diff = 0;
    }
    const d = new Date(currentDate);
    d.setDate(d.getDate() - diff);
    return formatYMD(d);
  }

  // 6. ISO Date: YYYY-MM-DD
  const isoMatch = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 7. Full numeric: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += 2000;
    return `${y}-${m}-${d}`;
  }

  // 8. Day Month (e.g. "15th Nov", "15th of Nov", "15 November 2026", "15 Nov")
  const dayMonthRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${nlpMonthNamesPattern})(?:\\s*,?\\s*(\\d{2,4}))?\\b`, 'i');
  const dmWordMatch = t.match(dayMonthRegex);
  if (dmWordMatch) {
    const day = String(parseInt(dmWordMatch[1], 10)).padStart(2, '0');
    const mStr = dmWordMatch[2].toLowerCase();
    const monthNum = String(NLP_MONTHS[mStr] + 1).padStart(2, '0');
    let year = dmWordMatch[3] ? parseInt(dmWordMatch[3], 10) : currYear;
    if (year < 100) year += 2000;
    return `${year}-${monthNum}-${day}`;
  }

  // 9. Month Day (e.g. "Nov 15", "November 15th", "Nov the 15th", "Nov 15, 2026")
  const monthDayRegex = new RegExp(`\\b(${nlpMonthNamesPattern})\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{2,4}))?\\b`, 'i');
  const mdWordMatch = t.match(monthDayRegex);
  if (mdWordMatch) {
    const mStr = mdWordMatch[1].toLowerCase();
    const monthNum = String(NLP_MONTHS[mStr] + 1).padStart(2, '0');
    const day = String(parseInt(mdWordMatch[2], 10)).padStart(2, '0');
    let year = mdWordMatch[3] ? parseInt(mdWordMatch[3], 10) : currYear;
    if (year < 100) year += 2000;
    return `${year}-${monthNum}-${day}`;
  }

  // 10. Short numeric: DD/MM, DD-MM, DD.MM (e.g. "15/11", "15-11", "15.11")
  const dmShortMatch = t.match(/\b(?:on|dated?|dt[:\s]*)?\s*(\d{1,2})[/.-](\d{1,2})\b/i);
  if (dmShortMatch) {
    const dVal = parseInt(dmShortMatch[1], 10);
    const mVal = parseInt(dmShortMatch[2], 10);
    if (dVal >= 1 && dVal <= 31 && mVal >= 1 && mVal <= 12) {
      const d = String(dVal).padStart(2, '0');
      const m = String(mVal).padStart(2, '0');
      return `${currYear}-${m}-${d}`;
    }
  }

  // 11. Prefixed day of current month:
  // e.g. "on 15", "on 15th", "dated 15", "dated 15th", "date 15", "date: 15th", "dt 15", "15th ko"
  const prefixedDayMatch = t.match(/\b(?:on|dated?|date[:\s]*|dt[:\s]*)\s*(?:the\s*)?(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (prefixedDayMatch) {
    const dayVal = parseInt(prefixedDayMatch[1], 10);
    if (dayVal >= 1 && dayVal <= 31) {
      const day = String(dayVal).padStart(2, '0');
      const monthNum = String(currMonth + 1).padStart(2, '0');
      return `${currYear}-${monthNum}-${day}`;
    }
  }

  // 12. Day with Indian suffix "ko" or "tarikh": e.g. "15th ko", "15 tarikh", "15 ko"
  const indianDayMatch = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:ko|tarikh)\b/i);
  if (indianDayMatch) {
    const dayVal = parseInt(indianDayMatch[1], 10);
    if (dayVal >= 1 && dayVal <= 31) {
      const day = String(dayVal).padStart(2, '0');
      const monthNum = String(currMonth + 1).padStart(2, '0');
      return `${currYear}-${monthNum}-${day}`;
    }
  }

  // 13. Standalone ordinal day: e.g. "15th" in "15th petrol 500" or "paid 500 15th"
  const standaloneOrdinal = t.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/i);
  if (standaloneOrdinal) {
    const dayVal = parseInt(standaloneOrdinal[1], 10);
    if (dayVal >= 1 && dayVal <= 31) {
      const day = String(dayVal).padStart(2, '0');
      const monthNum = String(currMonth + 1).padStart(2, '0');
      return `${currYear}-${monthNum}-${day}`;
    }
  }

  return currentDate;
}

function toTitleCase(str: string): string {
  return str.replace(/\b[a-zA-Z]/g, match => match.toUpperCase());
}

// Clean and summarize a concise, professional description from a natural language transaction
export function cleanDescriptionFromText(seg: string, category: string | null, transactionType: string): string {
  if (!seg) return category || (transactionType === 'income' ? 'Income' : 'Expense');
  let d = seg.trim();
  const isRecharge = /\brecharg(?:e|ed|ing)\b/i.test(seg);

  // 1. Remove command prefix verbs & intent filler phrases
  d = d.replace(/\b(?:please\s+)?(?:add|record|enter|punch|note\s+down|note|track|create|put|save|log)\s+(?:a\s+new\s+|an?\s+|the\s+)?(?:expense|transaction|payment|income|transfer|withdrawal|entry|record)?(?:\s+(?:of|for|amount))?\b/gi, ' ');
  d = d.replace(/\b(?:i|we|they|he|she|my\s+friend)\s+(?:have\s+|had\s+)?(?:spent|paid|bought|purchased|ordered|received|got|withdrew|transferred|sent|recharged|went|visited|eaten|consumed|done|taken)\b/gi, ' ');
  d = d.replace(/\b(?:i|we|they|he|she)\b/gi, ' ');
  d = d.replace(/\b(?:went\s+to|gone\s+to|visited|had\s+gone\s+to)\b/gi, ' ');
  d = d.replace(/\b(?:had|took|taken|done|made)\b/gi, ' ');
  d = d.replace(/\b(?:some\s+items?|some\s+stuff|items?|stuff|things?)\b/gi, ' ');
  d = d.replace(/\b(?:for\s+my|for\s+our|for\s+the|for\s+a|for\s+an|for\s+some|for\s+personal\s+use)\b/gi, ' ');
  d = d.replace(/\b(?:with\s+friends?|with\s+family|with\s+team|with\s+colleagues?|with\s+office)\b/gi, ' ');

  // 2. Remove date expressions first so they don't get partially stripped by number regexes
  d = d.replace(/\b(?:on\s+)?(?:day before yesterday|yesterday|today|aaj|kal|parso|\d+\s+days?\s+ago)\b/gi, ' ');
  d = d.replace(new RegExp(`\\b(?:(last|this|past|previous|on)\\s+)?(?:${nlpWeekdayPattern})\\b`, 'gi'), ' ');
  d = d.replace(new RegExp(`\\b(?:(?:on|dated?|date[:\\s]*|dt[:\\s]*)\\s*)?\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${nlpMonthNamesPattern})(?:\\s*,?\\s*\\d{2,4})?\\b`, 'gi'), ' ');
  d = d.replace(new RegExp(`\\b(?:(?:on|dated?|date[:\\s]*|dt[:\\s]*)\\s*)?(?:${nlpMonthNamesPattern})\\s+(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?(?:\\s*,?\\s*\\d{2,4})?\\b`, 'gi'), ' ');
  d = d.replace(/\b(?:(?:on|dated?|date[:\s]*|dt[:\s]*)\s*)?\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/gi, ' ');
  d = d.replace(/\b(?:on|dated?|date[:\s]*|dt[:\s]*)\s*(?:the\s*)?\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ');
  d = d.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*(?:ko|tarikh)\b/gi, ' ');
  d = d.replace(/\b\d{1,2}(?:st|nd|rd|th)\b/gi, ' ');
  d = d.replace(new RegExp(`\\b(?:of\\s+)?(?:${nlpMonthNamesPattern})\\b`, 'gi'), ' ');
  d = d.replace(/\b(?:dated?|date[:\s]*|dt[:\s]*)\b/gi, ' ');

  // 3. Remove bank / account references
  d = d.replace(/\b(?:from|via|through|using|by|with|in|to)\s+(?:(?:my|the)\s+)?(?:(?:hdfc|sbi|icici|axis|kotak|pnb|bob|canara|union|idfc|yes|indusind|rbl|citi|hsbc|standard\s*chartered)\s*(?:bank|card|credit\s*card|debit\s*card|savings|account)?|cash\s*(?:wallet|pocket|account)?|credit\s*card|debit\s*card|upi|paytm|gpay|google\s*pay|phonepe)\b/gi, ' ');
  d = d.replace(/\b(?:from|at|via)\s+(?:sbi|hdfc|icici|axis|kotak|pnb|bob)?\s*atm\b/gi, ' ');
  d = d.replace(/\b(?:in|into|to|from)\s+(?:hdfc|sbi|icici|axis|kotak|pnb|bob)\s*(?:bank|account)?\b/gi, ' ');
  d = d.replace(/\b(?:via|by|through|using)?\s*(?:upi|gpay|google\s*pay|phonepe|paytm|netbanking)\b/gi, ' ');

  // 4. Remove amounts with preceding prepositions like "for 2500", "worth 2500", "costing 2500"
  d = d.replace(/\b(?:for|worth|costing|of|sum\s+of|amount\s+of)\s+(?:(?:₹|rs\.?|inr|usd|\$)\s*)?\b\d+(?:,\d+)*(?:\.\d{1,2})?\s*(?:rs|inr|bucks|rupees)?(?=\s|$|[,-.;])/gi, ' ');
  d = d.replace(/(?:(?:₹|rs\.?|inr|usd|\$)\s*)?\b\d+(?:,\d+)*(?:\.\d{1,2})?\s*(?:rs|inr|bucks|rupees)?(?=\s|$|[,-.;])/gi, ' ');
  d = d.replace(/\b(?:amount\s+of|sum\s+of|worth|costing|cost\s+of)\b/gi, ' ');

  // 5. Remove common action verbs
  d = d.replace(/\b(?:spent|paid\s+to|paid|bought|ordered|purchased|received|got|credited|debited|withdrew|withdrawn|withdraw|transferred|transfer|sent\s+to|moved\s+to|recharged)\b/gi, ' ');

  // 6. Clean up connectors, dangling prepositions and punctuation
  d = d.replace(/\b(?:for\s+at|for\s+in|for\s+on|for\s+from|from\s+at)\b/gi, 'at ');
  d = d.replace(/[,_\-;:~|/.]+/g, ' ');
  d = d.replace(/\b(?:and\s+and|for\s+for)\b/gi, ' ');
  d = d.replace(/\b(?:for|at|in|on|from|to|with|of|by)\s+(?:for|at|in|on|from|to|with|of|by)\b/gi, (m) => m.split(/\s+/).pop() || '');
  for (let i = 0; i < 3; i++) {
    d = d.replace(/^\s*(?:for|at|on|to|in|via|with|by|of|from|using|a|an|the|and)\s+/gi, ' ');
    d = d.replace(/\s+(?:for|at|on|to|in|via|with|by|of|from|using|a|an|the|and)\s*$/gi, ' ');
  }
  d = d.replace(/\s+/g, ' ').trim();

  // 7. Handle mobile/DTH recharge
  if (isRecharge) {
    if (!d || d.length <= 2) {
      d = 'Mobile Recharge';
    } else if (!d.toLowerCase().includes('recharge')) {
      d = `${d} Recharge`;
    }
  }

  // 8. Handle withdrawal / transfer defaults
  if (transactionType === 'withdrawal') {
    if (!d || d.length <= 2 || /^(?:atm|cash|atm\s*cash)?\s*withdrawal$/i.test(d.trim()) || d.toLowerCase() === 'atm') {
      return 'ATM Cash Withdrawal';
    }
    return toTitleCase(d.toLowerCase().includes('atm') ? d : `ATM Cash Withdrawal - ${d}`);
  }
  if (transactionType === 'transfer') {
    return d && d.length > 2 ? toTitleCase(d) : 'Account Transfer';
  }

  // 9. If clean text is empty or meaningless, use category
  if (!d || d.length < 2 || /^\d+$/.test(d)) {
    return category || (transactionType === 'income' ? 'Income' : 'Expense');
  }

  // 10. Format common brand & conjunction patterns
  let formatted = toTitleCase(d);
  
  const brandMap: [RegExp, string][] = [
    [/\bAtm\b/g, 'ATM'],
    [/\bUpi\b/g, 'UPI'],
    [/\bOtp\b/g, 'OTP'],
    [/\bEmi\b/g, 'EMI'],
    [/\bMcdonald'?s\b/gi, "McDonald's"],
    [/\bDmart\b/gi, 'DMart'],
    [/\bZomato\b/gi, 'Zomato'],
    [/\bSwiggy\b/gi, 'Swiggy'],
    [/\bStarbucks\b/gi, 'Starbucks'],
    [/\bBlinkit\b/gi, 'Blinkit'],
    [/\bZepto\b/gi, 'Zepto'],
    [/\bBigbasket\b/gi, 'BigBasket'],
    [/\bMyntra\b/gi, 'Myntra'],
    [/\bAjio\b/gi, 'Ajio'],
    [/\bZara\b/gi, 'Zara'],
    [/\bH&m\b/gi, 'H&M'],
    [/\bMarks\s*(?:&|and)\s*Spencer\b/gi, 'Marks & Spencer'],
    [/\bBarbeque\s*Nation\b/gi, 'Barbeque Nation'],
    [/\bJio\b/gi, 'Jio'],
    [/\bAirtel\b/gi, 'Airtel'],
    [/\bVodafone\b/gi, 'Vodafone'],
    [/\bNetflix\b/gi, 'Netflix'],
    [/\bAmazon\b/gi, 'Amazon'],
    [/\bFlipkart\b/gi, 'Flipkart'],
    [/\bUber\b/gi, 'Uber'],
    [/\bOla\b/gi, 'Ola']
  ];

  for (const [pattern, replacement] of brandMap) {
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted.replace(/\s+/g, ' ').trim();
}

const CATEGORY_TAXONOMY = [
  {
    target: ['Shopping', 'Clothing', 'Personal'],
    keywords: [
      'marks & spencer', 'marks and spencer', 'zara', 'h&m', 'myntra', 'ajio', 'meesho', 'nykaa',
      'shirt', 'pants', 'pant', 'jeans', 'tshirt', 't-shirt', 'shoes', 'dress', 'clothing', 'clothes',
      'footwear', 'sneakers', 'saree', 'kurta', 'electronics', 'gadget', 'laptop', 'shopping', 'mall'
    ]
  },
  {
    target: ['Groceries', 'Grocery', 'Household'],
    keywords: [
      'grocer', 'supermarket', 'dmart', 'milk', 'curd', 'paneer', 'egg', 'eggs', 'bread', 'butter',
      'cheese', 'vegetable', 'vegetables', 'fruit', 'fruits', 'veggie', 'veggies', 'bigbasket', 'blinkit',
      'zepto', 'instamart', 'kirana', 'ration', 'provisions', 'reliance fresh', 'spencers', "spencer's"
    ]
  },
  {
    target: ['Food & Dining', 'Food', 'Dining', 'Restaurant', 'Food and Drinks'],
    keywords: [
      'food', 'dining', 'restaurant', 'cafe', 'coffee', 'tea', 'chai', 'lunch', 'dinner', 'breakfast',
      'snack', 'snacks', 'zomato', 'swiggy', 'starbucks', 'mcdonald', 'burger', 'pizza', 'dominos',
      'kfc', 'subway', 'haldiram', 'meal', 'dessert', 'bistro', 'bar', 'pub', 'dhaba', 'bakery', 'cake'
    ]
  },
  {
    target: ['Transportation', 'Travel', 'Fuel', 'Commute', 'Vehicle'],
    keywords: [
      'petrol', 'fuel', 'diesel', 'cng', 'auto', 'uber', 'ola', 'rapido', 'metro', 'bus', 'cab', 'taxi',
      'train', 'irctc', 'railway', 'flight', 'indigo', 'airline', 'parking', 'toll', 'fastag', 'fare',
      'commute', 'travel', 'mechanic'
    ]
  },
  {
    target: ['Utilities', 'Bills & Utilities', 'Bills', 'Recharge'],
    keywords: [
      'electricity', 'water bill', 'cylinder', 'gas bill', 'wifi', 'broadband', 'internet', 'fiber',
      'recharge', 'mobile bill', 'phone bill', 'dth', 'power bill', 'utility', 'bills', 'airtel', 'jio',
      'vi', 'vodafone', 'bescom', 'mseb'
    ]
  },
  {
    target: ['Health & Medical', 'Medical', 'Healthcare', 'Health'],
    keywords: [
      'pharmacy', 'medicine', 'medicines', 'doctor', 'hospital', 'clinic', 'medical', 'test', 'lab',
      'chemist', 'tablet', 'apollo', '1mg', 'pharmeasy', 'dentist', 'health'
    ]
  },
  {
    target: ['Entertainment', 'Leisure', 'Subscriptions'],
    keywords: [
      'movie', 'movies', 'cinema', 'theatre', 'theater', 'pvr', 'inox', 'netflix', 'prime', 'hotstar',
      'spotify', 'youtube', 'bookmyshow', 'concert', 'game', 'gaming', 'subscription'
    ]
  },
  {
    target: ['Housing', 'Rent', 'Home'],
    keywords: [
      'rent', 'house rent', 'flat rent', 'maintenance', 'society', 'pg', 'hostel', 'property', 'maid', 'cook'
    ]
  }
];

// Helper to resolve an expense category from natural language text, keywords, and history
export function resolveCategoryFromText(text: string | null | undefined, categories: any[], transactions: any[] = []): string {
  if (!text) return categories[0]?.name || 'Others';
  const t = text.trim().toLowerCase();

  // 1. Direct match with existing category name
  for (const c of categories) {
    if (new RegExp(`\\b${c.name.toLowerCase()}\\b`, 'i').test(t)) return c.name;
  }

  // 2. Learn from previous transactions matching descriptions/keywords
  if (Array.isArray(transactions) && transactions.length > 0) {
    for (const tx of transactions) {
      if (tx.description && tx.category) {
        const descWords = tx.description.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
        const matchCount = descWords.filter((w: string) => t.includes(w)).length;
        if (matchCount >= 2 || (descWords.length === 1 && matchCount === 1)) {
          const matchedCat = categories.find(c => c.name.toLowerCase() === tx.category.toLowerCase());
          if (matchedCat) return matchedCat.name;
        }
      }
    }
  }

  // 3. Keyword dictionary taxonomy
  for (const group of CATEGORY_TAXONOMY) {
    const hasMatch = group.keywords.some(k => {
      const escaped = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(t) || t.includes(k);
    });
    if (hasMatch) {
      for (const targetName of group.target) {
        const found = categories.find(c =>
          c.name.toLowerCase() === targetName.toLowerCase() ||
          c.name.toLowerCase().includes(targetName.toLowerCase()) ||
          targetName.toLowerCase().includes(c.name.toLowerCase())
        );
        if (found) return found.name;
      }
    }
  }

  // 4. Match individual words of category names (e.g. "Food" in "Food & Dining")
  for (const c of categories) {
    const words = c.name.toLowerCase().split(/[\s&,/]+/).filter((w: string) => w.length > 3);
    if (words.some((w: string) => t.includes(w))) return c.name;
  }

  return categories[0]?.name || 'Others';
}

// Helper to resolve an income category from text
export function resolveIncomeCategoryFromText(text: string | null | undefined): 'salaries' | 'allowances' | 'family_income' | 'others' {
  if (!text) return 'others';
  const t = text.trim().toLowerCase();
  if (t.includes('salary') || t.includes('salaries') || t.includes('payroll') || t.includes('stipend')) return 'salaries';
  if (t.includes('allowance') || t.includes('bonus') || t.includes('incentive') || t.includes('perk') || t.includes('cashback') || t.includes('refund') || t.includes('dividend')) return 'allowances';
  if (t.includes('family') || t.includes('father') || t.includes('mother') || t.includes('parents') || t.includes('dad') || t.includes('mom') || t.includes('husband') || t.includes('wife')) return 'family_income';
  return 'others';
}

// Local heuristic fallback for common queries or when API is unreachable
export function tryLocalHeuristicFallback(
  command: string,
  accounts: any[],
  categories: any[],
  currentDate: string,
  transactions: any[] = []
): SmartChatbotResult | null {
  const text = command.trim().toLowerCase();

  // 1. Show bank balances
  if (text.includes('balance') || text === 'show my bank balances' || text === 'balances') {
    const list = accounts.length > 0
      ? accounts.map(a => `• **${a.account_name}** (${a.account_type}): ₹${Number(a.balance).toLocaleString('en-IN')}`).join('\n')
      : 'No accounts recorded yet.';
    const reply = `Here are your current account balances:\n\n${list}`;
    return {
      intent: 'financial_inquiry',
      extractedInfo: {},
      isComplete: true,
      missingFields: [],
      missingOptions: null,
      reply,
      clarificationQuestion: reply,
      extraContext: { accounts }
    };
  }

  // 2. What categories do I have
  if (text.includes('category') || text.includes('categories')) {
    const catList = categories.length > 0
      ? categories.map(c => `• ${c.name}`).join('\n')
      : '• Food & Dining\n• Groceries\n• Transportation\n• Utilities\n• Entertainment';
    const reply = `Here are your available expense categories:\n\n${catList}\n\n**Income Categories:**\n• Salaries\n• Allowances\n• Family Income\n• Others`;
    return {
      intent: 'financial_inquiry',
      extractedInfo: {},
      isComplete: true,
      missingFields: [],
      missingOptions: null,
      reply,
      clarificationQuestion: reply,
      extraContext: { categories }
    };
  }

  // 3. Quick transaction extraction fallback (supporting both single and multi-transaction)
  const defaultBankAcc = accounts.find(a => a.account_type === 'bank')?.id || accounts.find(a => a.account_type === 'cash')?.id || accounts[0]?.id || null;
  const defaultCashAcc = accounts.find(a => a.account_type === 'cash')?.id || accounts.find(a => a.account_type === 'bank')?.id || accounts[0]?.id || null;
  const defaultIncomeAcc = accounts.find(a => a.account_type === 'bank')?.id || accounts[0]?.id || null;

  // Learn from history and memory
  const learnedInfo = predictFromLearning(command, accounts, categories, transactions);

  // Check if the overall command mentions a common account or date for the whole batch
  const overallAccId = resolveAccountFromText(command, accounts, null) || learnedInfo.predictedFromAccountId;
  const overallDate = parseDateFromText(command, currentDate);

  // Split command into candidate transaction segments.
  const lines = command.trim().split(/\r?\n|;/).map(l => l.trim()).filter(Boolean);
  const segments: string[] = [];

  for (const line of lines) {
    const subSegments = line
      .split(/(?:\s+and\s+(?=(?:spent|paid|withdrew|withdraw|withdrawal|withdrawn|atm|received|got|salary|income|debited|credited|bought|ordered|recharged|transferred|transfer|[a-zA-Z&'\s]+\s+\d+|\b(?:₹|rs\.?|inr)?\s*\d+)))|(?:\s*,\s*(?=(?:spent|paid|withdrew|withdraw|withdrawal|withdrawn|atm|received|got|salary|income|debited|credited|bought|ordered|recharged|transferred|transfer|[a-zA-Z&'\s]+\s+\d+|\b(?:₹|rs\.?|inr)?\s*\d+)))/i)
      .map(s => s.trim().replace(/^\s*(?:\d+[\.\)\-:]+|[#*•\-]|and\b)\s*/i, ''))
      .filter(Boolean);
    segments.push(...subSegments);
  }

  const extractedBatch: BatchTransactionItem[] = [];

  for (const rawSeg of segments) {
    const seg = rawSeg.replace(/^\s*(?:\d+[\.\)\-:]+|[#*•\-]|and\b)\s*/i, '').trim();
    if (!seg) continue;

    const segText = seg.toLowerCase();

    // Extract amounts using robust boundary regex
    const amountMatches = [...seg.matchAll(/(?:(?:₹|rs\.?|inr)\s*)?(\b\d+(?:,\d+)*(?:\.\d{1,2})?\b)/gi)];
    let matchedAmount: number | null = null;
    if (amountMatches && amountMatches.length > 0) {
      for (const match of amountMatches) {
        const valStr = match[1].replace(/,/g, '');
        const num = parseFloat(valStr);
        if (num >= 2020 && num <= 2035 && !match[0].match(/₹|rs|inr/i) && !segText.match(/salary|rent|fees|amount|spent|paid/i)) {
          continue;
        }
        if (num > 0) {
          matchedAmount = num;
          break;
        }
      }
    }

    // Detect withdrawal
    const isWithdrawal = segText.includes('withdrew') ||
                         segText.includes('withdraw') ||
                         segText.includes('withdrawal') ||
                         segText.includes('withdrawn') ||
                         segText.includes('atm') ||
                         segText.includes('cash withdrawal') ||
                         (segText.includes('cash') && (segText.includes('from bank') || segText.includes('from atm')));

    // Detect transfer
    const isTransfer = !isWithdrawal && (
      segText.includes('transfer') ||
      segText.includes('transferred') ||
      segText.includes('sent to') ||
      segText.includes('moved to')
    );

    // Detect income vs expense
    const cleanedForIncome = segText.replace(/credit\s*card|creditcard|\bcc\b/g, '');
    const isIncome = !isWithdrawal && !isTransfer && (
      cleanedForIncome.includes('salary') ||
      cleanedForIncome.includes('income') ||
      cleanedForIncome.includes('received') ||
      cleanedForIncome.includes('got paid') ||
      cleanedForIncome.includes('credited') ||
      cleanedForIncome.includes('deposit') ||
      cleanedForIncome.includes('earned') ||
      cleanedForIncome.includes('refund') ||
      cleanedForIncome.includes('cashback')
    );

    const txType: 'expense' | 'income' | 'withdrawal' | 'transfer' = 
      isWithdrawal ? 'withdrawal' : isTransfer ? 'transfer' : isIncome ? 'income' : 'expense';

    // Date extraction: check segment first, then overall command date
    const segDate = parseDateFromText(seg, overallDate);

    // If amount is missing, check if this segment expresses transaction intent
    if (!matchedAmount || isNaN(matchedAmount) || matchedAmount <= 0) {
      const hasTxIntent = /spent|paid|bought|purchased|ordered|recharged|withdrew|withdraw|transferred|transfer|received|salary|income|petrol|fuel|groceries|grocery|coffee|tea|dinner|lunch|shopping|rent|bill|tickets|ticket|movie|doctor|medicine|pharmacy|zomato|swiggy|uber|ola|starbucks|dmart|recharge/i.test(segText);
      if (hasTxIntent) {
        const cleanDesc = cleanDescriptionFromText(seg, null, txType);
        const expCat = learnedInfo.predictedCategory || resolveCategoryFromText(seg, categories, transactions);
        const explicitAcc = resolveAccountFromText(seg, accounts, null) || overallAccId;
        const missingOpts = generateMissingFieldOptions('amount', accounts, categories, {
          transaction_type: txType,
          category: expCat
        });
        const reply = `I've prepared a draft for **${cleanDesc}** on ${segDate}. How much was the amount?`;
        return {
          intent: 'transaction',
          extractedInfo: {
            transaction_type: txType,
            amount: null,
            from_account_id: explicitAcc || learnedInfo.predictedFromAccountId || null,
            to_account_id: isWithdrawal ? defaultCashAcc : null,
            category: isWithdrawal || isTransfer || isIncome ? null : expCat,
            income_category: isIncome ? resolveIncomeCategoryFromText(seg) : null,
            description: cleanDesc,
            transaction_date: segDate
          },
          batchTransactions: [],
          isComplete: false,
          missingFields: ['amount'],
          missingOptions: missingOpts,
          reply,
          clarificationQuestion: reply
        };
      }
      continue;
    }

    // Account for this segment
    const explicitAccId = resolveAccountFromText(seg, accounts, null);
    const segAccId = explicitAccId || overallAccId;

    if (isWithdrawal) {
      const cleanDesc = cleanDescriptionFromText(seg, null, 'withdrawal');
      extractedBatch.push({
        transaction_type: 'withdrawal',
        amount: matchedAmount,
        from_account_id: segAccId || defaultBankAcc,
        to_account_id: defaultCashAcc,
        category: null,
        income_category: null,
        description: cleanDesc,
        transaction_date: segDate
      });
    } else if (isTransfer) {
      const cleanDesc = cleanDescriptionFromText(seg, null, 'transfer');
      extractedBatch.push({
        transaction_type: 'transfer',
        amount: matchedAmount,
        from_account_id: segAccId || defaultBankAcc,
        to_account_id: defaultCashAcc,
        category: null,
        income_category: null,
        description: cleanDesc,
        transaction_date: segDate
      });
    } else if (isIncome) {
      const incCat = resolveIncomeCategoryFromText(seg);
      const cleanDesc = cleanDescriptionFromText(seg, 'Salary', 'income');
      extractedBatch.push({
        transaction_type: 'income',
        amount: matchedAmount,
        from_account_id: null,
        to_account_id: segAccId || defaultIncomeAcc,
        category: null,
        income_category: incCat,
        description: cleanDesc,
        transaction_date: segDate
      });
    } else {
      const expCat = learnedInfo.predictedCategory || resolveCategoryFromText(seg, categories, transactions);
      const cleanDesc = cleanDescriptionFromText(seg, expCat, 'expense');
      extractedBatch.push({
        transaction_type: 'expense',
        amount: matchedAmount,
        from_account_id: segAccId || defaultBankAcc,
        to_account_id: null,
        category: expCat,
        income_category: null,
        description: cleanDesc,
        transaction_date: segDate
      });
    }
  }

  if (extractedBatch.length > 1) {
    const expCount = extractedBatch.filter(b => b.transaction_type === 'expense').length;
    const incCount = extractedBatch.filter(b => b.transaction_type === 'income').length;
    const wthCount = extractedBatch.filter(b => b.transaction_type === 'withdrawal').length;
    const trfCount = extractedBatch.filter(b => b.transaction_type === 'transfer').length;
    
    const countParts: string[] = [];
    if (expCount > 0) countParts.push(`${expCount} expense${expCount !== 1 ? 's' : ''}`);
    if (incCount > 0) countParts.push(`${incCount} income`);
    if (wthCount > 0) countParts.push(`${wthCount} withdrawal${wthCount !== 1 ? 's' : ''}`);
    if (trfCount > 0) countParts.push(`${trfCount} transfer${trfCount !== 1 ? 's' : ''}`);

    const reply = `I've prepared a batch of **${extractedBatch.length} transactions** (${countParts.join(', ')}). All categories, accounts, and dates are assigned. Please review and submit to post them!`;
    return {
      intent: 'transaction',
      extractedInfo: extractedBatch[0],
      batchTransactions: extractedBatch,
      isComplete: true,
      missingFields: [],
      missingOptions: null,
      reply,
      clarificationQuestion: reply
    };
  }

  if (extractedBatch.length === 1) {
    const single = extractedBatch[0];
    const isSingleExpense = single.transaction_type === 'expense';

    const explicitAccId = resolveAccountFromText(command, accounts, null);
    const learnedAccId = learnedInfo.predictedFromAccountId;
    const isLearnedAcc = !explicitAccId && Boolean(learnedAccId);

    // 1. Check if Paying Account is missing (Expense with multiple accounts, no explicit mention, and no learned account)
    const eligibleExpenseAccounts = accounts.filter(a => ['bank', 'cash', 'credit_card'].includes(a.account_type));
    if (isSingleExpense && !explicitAccId && !isLearnedAcc && eligibleExpenseAccounts.length > 1) {
      const missingOpts = generateMissingFieldOptions('from_account_id', accounts, categories, single);
      const reply = `I've prepared an expense of ₹${single.amount.toLocaleString('en-IN')} for **${single.description || single.category}** on ${single.transaction_date}. Which account was used for this payment?`;
      return {
        intent: 'transaction',
        extractedInfo: {
          ...single,
          from_account_id: null
        },
        batchTransactions: [single],
        isComplete: false,
        missingFields: ['from_account_id'],
        missingOptions: missingOpts,
        reply,
        clarificationQuestion: reply
      };
    }

    // 2. Check if Category is missing (Generic spent/paid with no merchant/category in text and no learned category)
    const hasCategoryInText = CATEGORY_TAXONOMY.some(g => g.keywords.some(k => text.includes(k))) ||
                             categories.some(c => text.includes(c.name.toLowerCase()));
    if (isSingleExpense && !hasCategoryInText && !learnedInfo.predictedCategory && !text.match(/grocer|food|shop|fuel|petrol|util|bill|rent|movie|med/i)) {
      const missingOpts = generateMissingFieldOptions('category', accounts, categories, single);
      const reply = `I've recorded ₹${single.amount.toLocaleString('en-IN')} spent on ${single.transaction_date}. Which category should this be filed under?`;
      return {
        intent: 'transaction',
        extractedInfo: {
          ...single,
          category: null
        },
        batchTransactions: [single],
        isComplete: false,
        missingFields: ['category'],
        missingOptions: missingOpts,
        reply,
        clarificationQuestion: reply
      };
    }

    // 3. Complete single transaction
    const learnedNote = isLearnedAcc
      ? ` (auto-selected **${accounts.find(a => a.id === single.from_account_id)?.account_name}** from past patterns)`
      : '';
    const catName = single.transaction_type === 'expense' ? single.category : single.transaction_type === 'income' ? single.income_category : null;
    const reply = `I've prepared a ${single.transaction_type} of ₹${single.amount.toLocaleString('en-IN')}${catName ? ` for **${catName}**` : ''}${single.description ? ` (${single.description})` : ''}${learnedNote} on ${single.transaction_date}. Form is ready!`;
    return {
      intent: 'transaction',
      extractedInfo: single,
      batchTransactions: [single],
      isComplete: true,
      missingFields: [],
      missingOptions: null,
      reply,
      clarificationQuestion: reply
    };
  }

  return null;
}

export async function parseSmartChatbotCommand(
  params: {
    command: string;
    accounts: any[];
    categories: any[];
    transactions: any[];
    chatHistory: Array<{ role: 'user' | 'model'; content: string }>;
    currentDate: string;
  },
  onChunk: (text: string) => void,
  onComplete: (result: SmartChatbotResult) => void,
  onError: (error: string) => void
): Promise<void> {
  const { command, accounts, categories, transactions, chatHistory, currentDate } = params;

  try {
    const accountsContext = accounts.map(a => `- ID: "${a.id}", Name: "${a.account_name}", Type: "${a.account_type}", Balance: ${a.balance}, Currency: "${a.currency}"`).join('\n');
    const categoriesContext = categories.map(c => `- Name: "${c.name}", Icon: "${c.icon}"`).join('\n');
    
    // Map transactions list to highly readable text for the LLM
    const transactionsContext = transactions.slice(0, 100).map(t => {
      const fromName = accounts.find(a => a.id === t.from_account_id)?.account_name || 'N/A';
      const toName = accounts.find(a => a.id === t.to_account_id)?.account_name || 'N/A';
      const catName = t.category || t.income_category || 'Uncategorized';
      return `- Date: ${t.transaction_date}, Type: ${t.transaction_type}, Amount: ₹${t.amount}, Category: ${catName}, Description: "${t.description || ''}", From: "${fromName}", To: "${toName}"`;
    }).join('\n');

    const prompt = `You are a highly intelligent Smart AI Chatbot for the SmartFinHub personal finance app.
    Your job is to parse the user's natural language input (chat or voice) and perform one of the following operations:
    1. Manage Transactions (intent: "transaction")
    2. Manage Accounts (intent: "account")
    3. Manage Budgets (intent: "budget")
    4. Solve Loan EMI Payment Calculations (intent: "emi_calculator")
    5. Answer Financial Inquiries about balances, spending, or audits (intent: "financial_inquiry")
    6. Generate Financial Analysis reports (intent: "financial_analysis")
    7. Provide general support instructions (intent: "general_help")
    
    Here is the context of the user's existing accounts:
    ${accountsContext || 'No accounts recorded yet.'}
    
    Here is the context of the user's available expense categories:
    ${categoriesContext || 'No expense categories recorded yet.'}
    
    Static Income Categories are:
    - key: "salaries", Name: "Salaries"
    - key: "allowances", Name: "Allowances"
    - key: "family_income", Name: "Family Income"
    - key: "others", Name: "Others"
    
    Here is the context of the user's recent transactions (last 100):
    ${transactionsContext || 'No recent transactions recorded.'}
    
    Today's date is: ${currentDate}
    Default currency is INR (₹).

    LEARNING & PREFERENCE RULES:
    - Carefully analyze the provided context of the user's recent transactions (last 100) to learn their spending patterns, preferred accounts, and category mappings.
    - If the user provides a brief command (e.g., "spent 250 at Starbucks" or "McDonald's 500"), use the history to resolve the most likely "category" (e.g., matching "Starbucks" to "Food & Dining" because of previous transactions) and "from_account_id" (e.g., HDFC Bank account if they typically pay HDFC there).
    - Leverage this history to auto-fill missing details seamlessly, so the bot gets smarter with every transaction the user records!

    CRITICAL RULES FOR "reply" AND "clarificationQuestion":
    You MUST ALWAYS provide a friendly, helpful, natural conversational message in "reply" (and duplicate it in "clarificationQuestion").
    - NEVER leave "reply" or "clarificationQuestion" empty or null!
    - For intent "transaction":
      - When complete: Confirm what was auto-filled (e.g., "Got it! I have set up an income of ₹50,000 for Salary deposited into HDFC Bank on 2026-09-19.").
      - When incomplete: Acknowledge what was extracted, and gently prompt for what is still needed (e.g., "I've recorded ₹350 for Groceries on 2026-09-18. Which account was used for this payment?").
    - For intent "financial_inquiry":
      - Answer the user's question directly and thoroughly with clean markdown formatting. For example, for "Show my bank balances", list each account, its type, and its balance in INR (₹). For "What categories do I have?", list all categories.
    - For intent "emi_calculator":
      - Provide a clear summary with the monthly EMI amount, total interest payable, and total cost.
    - For intent "general_help":
      - Provide a friendly, concise list of examples of what you can do (recording expenses, checking balances, budget tracking, calculating EMIs).

    RULES FOR DETECTING INTENTS & REQUIRED FIELDS:
    
    1. intent: "transaction"
       - Triggered if the user wants to record spent money, salary received, transfer funds, cash withdrawal, credit card bill repayment, or loan payment.
       - Required fields: "transaction_type", "amount" (positive number), "description".
       - Specific required fields by type:
         - expense: from_account_id (matched from accounts), category (matched from categories).
         - income: to_account_id (matched from accounts), income_category (salaries/allowances/family_income/others).
         - transfer / withdrawal / loan_payment / credit_card_repayment: both from_account_id and to_account_id.
         - interest_charge: to_account_id.
       - Summarize "description" into a clean, concise merchant or item title (e.g. "Groceries", "Starbucks - Coffee", "Petrol", "ATM Cash Withdrawal", "Dinner at Barbeque Nation", "Jio Mobile Recharge"). NEVER copy raw conversational sentences like "spent 500 on groceries yesterday with sbi" or command phrasing like "add expense of 500 for groceries" into the description!
        - Extract "transaction_date" accurately in "YYYY-MM-DD" format from natural language expressions (e.g. "yesterday", "on 15th", "on 15", "15 Nov", "last Sunday", "3 days ago"). If no date is mentioned, use today's date (${currentDate}).
        - MULTI-TRANSACTION BATCH POSTING RULES:
         * If the user specifies multiple transactions in the input (e.g. "spent 500 on groceries and 200 on petrol", pasted SMS/statements, or comma/newline separated items), set intent: "transaction".
         * Multi-transaction batch posting supports "expense", "income", "withdrawal", and "transfer".
         * Populate "batchTransactions": an array of items with { transaction_type: "expense" | "income" | "withdrawal" | "transfer", amount: number, category: string | null, income_category: string | null, from_account_id: string | null, to_account_id: string | null, description: string, transaction_date: "YYYY-MM-DD" }.
         * Account & Category rules for batch items:
           - "expense": "from_account_id" (bank/cash/card), "category" is STRICTLY REQUIRED (must never be empty/null, default to "Others").
           - "income": "to_account_id" (bank/cash), "income_category" is STRICTLY REQUIRED (one of salaries, allowances, family_income, others).
           - "withdrawal": "from_account_id" is source bank account, "to_account_id" is destination cash wallet account. "category" and "income_category" must be null.
           - "transfer": "from_account_id" is source account, "to_account_id" is destination account. "category" and "income_category" must be null.
         * Also populate "extractedInfo" with the first transaction in the batch for backwards compatibility.
         * Reply clearly summarizing the batch count (e.g. "I have prepared 3 transactions (1 expense, 1 withdrawal, 1 income) for your review. Please verify and submit to post them!").
       - Special Credit Card EMI extraction (single transaction): If the user mentions converting a credit card transaction or expense to EMI (e.g., "convert to 12 months EMI with 500 charges"), extract:
         - "is_emi": true (boolean)
         - "emi_months": total number of months (integer, e.g., 6 or 12)
         - "bank_charges": processing fee or bank charges amount (number, default 0 if not mentioned)
       - Missing fields go in "missingFields".
       
    2. intent: "account"
       - Triggered if the user wants to add/create a new account, card, cash wallet, or loan profile. E.g. "Create a new bank account named HDFC Savings with balance 10000" or "Add a new credit card named SBI Card with limit 150000".
       - Required fields by type:
         - cash: "account_type", "account_name".
         - bank: "account_type", "account_name", "country", "currency", "institution_name".
         - credit_card: "account_type", "account_name", "country", "currency", "institution_name", "credit_limit", "statement_day", "due_day".
         - loan: "account_type", "account_name", "country", "currency", "institution_name", "loan_principal", "loan_tenure_months", "current_interest_rate", "loan_start_date", "due_date".
       
    3. intent: "budget"
       - Triggered if the user wants to set a monthly budget or category budget.
       - Extracted fields: "month", "year", "budgeted_income", "budgeted_expenses", "category_budgets".
       
    4. intent: "emi_calculator"
       - Triggered if the user wants to calculate or simulate loan payments.
       - Calculation: If all fields are complete, perform the exact monthly EMI calculation: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1] where P = principal, r = annual_rate/12/100, n = tenure_months. Put the calculated EMI, total interest, and a friendly summary inside "reply" and return calculation details inside "extraContext" as: {"monthly_emi": X, "total_interest": Y, "total_payable": Z}.
       
    5. intent: "financial_inquiry"
       - Triggered if the user asks a question about balances, spent totals, or available categories.
       - Return the calculated answer directly in "reply". Set "isComplete" to true.
       
    6. intent: "financial_analysis"
       - Return a markdown analysis report in "reply".
       
    7. intent: "general_help"
       - Explain how the user can operate transactions, accounts, budgets, and EMI calculations in "reply".

    Current natural language input: "${command}"
    
    You must respond with ONLY a valid JSON object in this exact schema. Do not output any markdown wrapper or explanation, just the JSON string itself.
    
    {
      "intent": "transaction" | "account" | "budget" | "financial_inquiry" | "emi_calculator" | "financial_analysis" | "general_help",
      "extractedInfo": {
        "transaction_type": "income" | "expense" | "withdrawal" | "transfer" | "loan_payment" | "credit_card_repayment" | "interest_charge" | null,
        "amount": number | null,
        "from_account_id": string | null,
        "to_account_id": string | null,
        "category": string | null,
        "income_category": "salaries" | "allowances" | "family_income" | "others" | null,
        "description": string | null,
        "transaction_date": "YYYY-MM-DD" | null,
        "is_emi": boolean | null,
        "emi_months": number | null,
        "bank_charges": number | null,
        
        "account_type": "cash" | "bank" | "credit_card" | "loan" | null,
        "account_name": string | null,
        "balance": number | null,
        "currency": string | null,
        "country": string | null,
        "institution_name": string | null,
        "last_4_digits": string | null,
        "credit_limit": number | null,
        "loan_principal": number | null,
        "loan_tenure_months": number | null,
        "current_interest_rate": number | null,
        "loan_start_date": "YYYY-MM-DD" | null,
        "due_date": number | null,
        "statement_day": number | null,
        "due_day": number | null,
        "web_url": string | null,
        "ios_app_url": string | null,
        "android_app_url": string | null,
        "institution_logo": string | null,
        
        "month": number | null,
        "year": number | null,
        "budgeted_income": number | null,
        "budgeted_expenses": number | null,
        "category_budgets": object | null,
        
        "principal": number | null,
        "annual_rate": number | null,
        "tenure_months": number | null
      },
      "batchTransactions": [
        {
          "transaction_type": "income" | "expense",
          "amount": number,
          "from_account_id": string | null,
          "to_account_id": string | null,
          "category": string,
          "income_category": "salaries" | "allowances" | "family_income" | "others",
          "description": string,
          "transaction_date": "YYYY-MM-DD"
        }
      ],
      "isComplete": boolean,
      "missingFields": string[],
      "reply": string,
      "clarificationQuestion": string,
      "extraContext": any
    }
    `;

    const config = getAIProviderConfig();
    let fullResponseText = '';
    let cloudUsed: 'gemini' | 'groq' | null = null;
    let cloudFailReason = '';

    const executeGemini = async (): Promise<string> => {
      const contentsPayload = [];
      for (const msg of chatHistory) {
        contentsPayload.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
      contentsPayload.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
      return await callGeminiJSON(config.geminiApiKey, config.geminiModel, contentsPayload);
    };

    const executeGroq = async (): Promise<string> => {
      const messages: Array<{ role: string; content: string }> = [];
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content
        });
      }
      messages.push({
        role: 'user',
        content: prompt
      });
      return await callGroqJSON(config.groqApiKey, config.groqModel, messages);
    };

    if (config.provider === 'gemini' && config.geminiApiKey) {
      try {
        fullResponseText = await executeGemini();
        if (fullResponseText && fullResponseText.trim()) cloudUsed = 'gemini';
      } catch (err: any) {
        cloudFailReason = `Gemini (${config.geminiModel}): ${err.message || 'Call failed'}`;
        console.warn('Gemini parseSmartChatbotCommand failed, checking secondary cloud provider:', err);
        if (config.groqApiKey) {
          try {
            fullResponseText = await executeGroq();
            if (fullResponseText && fullResponseText.trim()) cloudUsed = 'groq';
          } catch (err2: any) {
            cloudFailReason += `; Groq failover: ${err2.message || 'Call failed'}`;
            console.warn('Groq secondary failover also failed:', err2);
          }
        }
      }
    } else if (config.provider === 'groq' && config.groqApiKey) {
      try {
        fullResponseText = await executeGroq();
        if (fullResponseText && fullResponseText.trim()) cloudUsed = 'groq';
      } catch (err: any) {
        cloudFailReason = `Groq (${config.groqModel}): ${err.message || 'Call failed'}`;
        console.warn('Groq parseSmartChatbotCommand failed, checking secondary cloud provider:', err);
        if (config.geminiApiKey) {
          try {
            fullResponseText = await executeGemini();
            if (fullResponseText && fullResponseText.trim()) cloudUsed = 'gemini';
          } catch (err2: any) {
            cloudFailReason += `; Gemini failover: ${err2.message || 'Call failed'}`;
            console.warn('Gemini secondary failover also failed:', err2);
          }
        }
      }
    } else if (config.provider === 'builtin' && (config.geminiApiKey || config.groqApiKey)) {
      if (config.geminiApiKey) {
        try {
          fullResponseText = await executeGemini();
          if (fullResponseText && fullResponseText.trim()) cloudUsed = 'gemini';
        } catch (e: any) {
          cloudFailReason = e.message || 'Gemini failed';
          if (config.groqApiKey) {
            try {
              fullResponseText = await executeGroq();
              if (fullResponseText && fullResponseText.trim()) cloudUsed = 'groq';
            } catch {}
          }
        }
      } else if (config.groqApiKey) {
        try {
          fullResponseText = await executeGroq();
          if (fullResponseText && fullResponseText.trim()) cloudUsed = 'groq';
        } catch (e: any) {
          cloudFailReason = e.message || 'Groq failed';
        }
      }
    }

    if (onChunk && fullResponseText) {
      onChunk('Processing AI response...');
    }

    if (!fullResponseText || !fullResponseText.trim()) {
      const fallbackResult = tryLocalHeuristicFallback(command, accounts, categories, currentDate, transactions);
      if (fallbackResult) {
        fallbackResult.engineUsed = 'builtin';
        if (cloudFailReason) {
          fallbackResult.fallbackReason = cloudFailReason;
        }
        onComplete(fallbackResult);
      } else {
        onError('Could not parse transaction from command');
      }
      return;
    }

    // Try to parse the accumulated full text as a JSON object
    try {
      // Clean up JSON block formatting if present
      let cleanedText = fullResponseText.trim();
      if (cleanedText.startsWith('```')) {
        const matches = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
        if (matches && matches[1]) {
          cleanedText = matches[1].trim();
        }
      }
      
      const parsedResult: SmartChatbotResult = JSON.parse(cleanedText);
      parsedResult.engineUsed = cloudUsed || 'gemini';

      // Sanitize & enforce non-blank categories and valid accounts for batch transactions
      if (parsedResult.batchTransactions && Array.isArray(parsedResult.batchTransactions)) {
        const defaultBankAcc = accounts.find(a => a.account_type === 'bank' || a.account_type === 'cash')?.id || accounts[0]?.id || null;
        const defaultCashAcc = accounts.find(a => a.account_type === 'cash')?.id || accounts.find(a => a.account_type === 'bank')?.id || accounts[0]?.id || null;
        const defaultIncomeAcc = accounts.find(a => a.account_type === 'bank')?.id || accounts[0]?.id || null;

        parsedResult.batchTransactions = parsedResult.batchTransactions
          .filter(t => t && Number(t.amount) > 0)
          .map(t => {
            const rawType = (t.transaction_type || '').toLowerCase();
            const type: 'income' | 'expense' | 'withdrawal' | 'transfer' = 
              rawType === 'income' ? 'income' :
              rawType === 'withdrawal' ? 'withdrawal' :
              rawType === 'transfer' ? 'transfer' : 'expense';

            if (type === 'withdrawal') {
              const fromAccId = resolveAccountFromText(t.from_account_id || t.account_name, accounts, defaultBankAcc);
              const toAccId = resolveAccountFromText(t.to_account_id, accounts, defaultCashAcc);
              return {
                transaction_type: 'withdrawal',
                amount: Number(t.amount),
                from_account_id: fromAccId,
                to_account_id: toAccId,
                category: null,
                income_category: null,
                description: cleanDescriptionFromText(t.description?.trim() || 'Cash Withdrawal', null, 'withdrawal'),
                transaction_date: t.transaction_date || currentDate
              };
            }

            if (type === 'transfer') {
              const fromAccId = resolveAccountFromText(t.from_account_id || t.account_name, accounts, defaultBankAcc);
              const toAccId = resolveAccountFromText(t.to_account_id, accounts, defaultCashAcc);
              return {
                transaction_type: 'transfer',
                amount: Number(t.amount),
                from_account_id: fromAccId,
                to_account_id: toAccId,
                category: null,
                income_category: null,
                description: cleanDescriptionFromText(t.description?.trim() || 'Account Transfer', null, 'transfer'),
                transaction_date: t.transaction_date || currentDate
              };
            }

            if (type === 'income') {
              const toAccId = resolveAccountFromText(t.to_account_id || t.account_name, accounts, defaultIncomeAcc);
              const resolvedIncCategory = resolveIncomeCategoryFromText(t.income_category);
              return {
                transaction_type: 'income',
                amount: Number(t.amount),
                from_account_id: null,
                to_account_id: toAccId,
                category: null,
                income_category: resolvedIncCategory,
                description: cleanDescriptionFromText(t.description?.trim() || 'Income', 'Salary', 'income'),
                transaction_date: t.transaction_date || currentDate
              };
            }

            // Default to expense
            const fromAccId = resolveAccountFromText(t.from_account_id || t.account_name, accounts, defaultBankAcc);
            const resolvedCategory = resolveCategoryFromText(t.category, categories);
            return {
              transaction_type: 'expense',
              amount: Number(t.amount),
              from_account_id: fromAccId,
              to_account_id: null,
              category: resolvedCategory,
              income_category: null,
              description: cleanDescriptionFromText(t.description?.trim() || 'Expense', resolvedCategory, 'expense'),
              transaction_date: t.transaction_date || currentDate
            };
          });

        if (parsedResult.batchTransactions.length > 0 && !parsedResult.extractedInfo?.amount) {
          parsedResult.extractedInfo = parsedResult.batchTransactions[0] as any;
        }
      }

      // Enforce non-blank category, summarized description, and accurate date for single extractedInfo
      if (parsedResult.intent === 'transaction' && parsedResult.extractedInfo) {
        // Ensure date is accurately extracted from the command if missing or defaulted to today
        if (!parsedResult.extractedInfo.transaction_date || parsedResult.extractedInfo.transaction_date === currentDate) {
          parsedResult.extractedInfo.transaction_date = parseDateFromText(command, currentDate);
        }

        // Summarize description into a clean title
        if (parsedResult.extractedInfo.description) {
          parsedResult.extractedInfo.description = cleanDescriptionFromText(
            parsedResult.extractedInfo.description,
            parsedResult.extractedInfo.category || null,
            parsedResult.extractedInfo.transaction_type || 'expense'
          );
        }
        if (parsedResult.extractedInfo.transaction_type === 'expense') {
          if (!parsedResult.extractedInfo.category || !parsedResult.extractedInfo.category.trim()) {
            parsedResult.extractedInfo.category = categories[0]?.name || 'Others';
          }
        } else if (parsedResult.extractedInfo.transaction_type === 'income') {
          if (!parsedResult.extractedInfo.income_category) {
            parsedResult.extractedInfo.income_category = 'others';
          }
        }
      }

      // Generate missing options if missing fields exist
      if (parsedResult.missingFields && parsedResult.missingFields.length > 0 && !parsedResult.missingOptions) {
        parsedResult.missingOptions = generateMissingFieldOptions(
          parsedResult.missingFields[0],
          accounts,
          categories,
          parsedResult.extractedInfo || {}
        );
      }

      // Normalize reply and clarificationQuestion so neither is ever blank/null
      let finalReply = parsedResult.reply || parsedResult.clarificationQuestion || '';

      if (!finalReply || !finalReply.trim()) {
        if (parsedResult.intent === 'transaction') {
          if (parsedResult.batchTransactions && parsedResult.batchTransactions.length > 1) {
            const count = parsedResult.batchTransactions.length;
            const expCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'expense').length;
            const incCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'income').length;
            const wthCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'withdrawal').length;
            const trfCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'transfer').length;
            const countParts: string[] = [];
            if (expCount > 0) countParts.push(`${expCount} expense${expCount !== 1 ? 's' : ''}`);
            if (incCount > 0) countParts.push(`${incCount} income`);
            if (wthCount > 0) countParts.push(`${wthCount} withdrawal${wthCount !== 1 ? 's' : ''}`);
            if (trfCount > 0) countParts.push(`${trfCount} transfer${trfCount !== 1 ? 's' : ''}`);
            finalReply = `I've prepared a batch of **${count} transactions** (${countParts.join(', ')}). Categories and accounts are assigned and ready for review. Click **Submit** to post them!`;
          } else {
            const ext = parsedResult.extractedInfo || {};
            const parts: string[] = [];
            if (ext.amount) parts.push(`₹${Number(ext.amount).toLocaleString('en-IN')}`);
            if (ext.category) parts.push(`for ${ext.category}`);
            if (ext.transaction_type) parts.push(`(${ext.transaction_type})`);
            if (ext.transaction_date) parts.push(`on ${ext.transaction_date}`);

            if (parsedResult.missingFields && parsedResult.missingFields.length > 0) {
              const readableMissing = parsedResult.missingFields.map(f => f.replace(/_/g, ' ')).join(', ');
              finalReply = parts.length > 0
                ? `I've prepared ${parts.join(' ')}. Please specify: ${readableMissing}.`
                : `Please specify the missing details: ${readableMissing}.`;
            } else {
              finalReply = parts.length > 0
                ? `I've auto-filled the transaction form with ${parts.join(' ')}. Ready to submit!`
                : `Transaction details have been applied to the form!`;
            }
          }
        } else if (parsedResult.intent === 'financial_inquiry') {
          const fallbackInquiry = tryLocalHeuristicFallback(command, accounts, categories, currentDate, transactions);
          finalReply = fallbackInquiry?.reply || "Here are your financial inquiry results based on your accounts and records.";
        } else {
          finalReply = "I've processed your request. Let me know if you need to adjust any transaction or account details!";
        }
      }

      parsedResult.reply = finalReply;
      parsedResult.clarificationQuestion = finalReply;
      onComplete(parsedResult);
    } catch (e) {
      console.error('Failed to parse final AI output as JSON:', e, fullResponseText);
      
      // Check if heuristic fallback can handle it
      const fallback = tryLocalHeuristicFallback(command, accounts, categories, currentDate, transactions);
      if (fallback) {
        onComplete(fallback);
        return;
      }

      // Return a structured error fallback
      onComplete({
        intent: 'general_help',
        extractedInfo: {},
        isComplete: false,
        missingFields: [],
        reply: "I'm here to help you manage Transactions, Accounts, Budgets, and simulate EMIs! What would you like to operate today?",
        clarificationQuestion: "I'm here to help you manage Transactions, Accounts, Budgets, and simulate EMIs! What would you like to operate today?"
      });
    }
  } catch (error) {
    console.error('AI Service Error:', error);

    // If API failed (network error, app ID, rate limit), attempt heuristic fallback first
    const fallback = tryLocalHeuristicFallback(command, accounts, categories, currentDate, transactions);
    if (fallback) {
      onComplete(fallback);
      return;
    }

    onError(error instanceof Error ? error.message : 'Failed to parse command');
  }
}

export interface TransactionInsightParams {
  transaction: {
    isEdit: boolean;
    transaction_type: string;
    amount: number;
    currency: string;
    category?: string;
    income_category?: string;
    description?: string;
    transaction_date: string;
  };
  accounts: Array<{
    id?: string;
    name: string;
    type: string;
    roleLabel: string;
    previousBalance?: number;
    postBalance: number;
    currency: string;
    credit_limit?: number | null;
    changeAmount?: number;
  }>;
  categoryBudgets?: Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    hasBudget: boolean;
    percentageUsed: number;
    transactionAmount?: number;
  }>;
}

export interface PostPostingAIInsight {
  status: 'positive' | 'warning' | 'caution' | 'neutral';
  statusBadge: string;
  headline: string;
  budgetInsight?: string;
  cashFlowInsight?: string;
  smartTip?: string;
  generatedVia?: 'ai' | 'heuristic';
}

const formatInsightCurrency = (amount: number, currency = 'INR'): string => {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
  return `${sym}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export function generateHeuristicTransactionInsight(params: TransactionInsightParams): PostPostingAIInsight {
  const { transaction: tx, accounts, categoryBudgets } = params;
  const curr = tx.currency || 'INR';
  const txAmt = Number(tx.amount || 0);

  // 1. Expense analysis
  if (tx.transaction_type === 'expense') {
    const overBudget = categoryBudgets?.find(b => b.hasBudget && b.remaining < 0);
    const nearBudget = categoryBudgets?.find(b => b.hasBudget && b.remaining >= 0 && b.percentageUsed >= 80);
    const normalBudget = categoryBudgets?.find(b => b.hasBudget && b.percentageUsed < 80);
    const primaryCat = tx.category || categoryBudgets?.[0]?.category || 'General Spending';

    // Credit card check
    const ccAccount = accounts.find(a => a.type === 'credit_card');
    let cashFlowInsight = '';
    if (ccAccount && ccAccount.credit_limit) {
      const util = (ccAccount.postBalance / ccAccount.credit_limit) * 100;
      const avail = Math.max(0, ccAccount.credit_limit - ccAccount.postBalance);
      if (util > 50) {
        cashFlowInsight = `Credit card utilization is high at ${util.toFixed(0)}% (${formatInsightCurrency(ccAccount.postBalance, curr)} of ${formatInsightCurrency(ccAccount.credit_limit, curr)} limit). Available credit is ${formatInsightCurrency(avail, curr)}.`;
      } else {
        cashFlowInsight = `Credit card utilization is at a safe ${util.toFixed(0)}%. Available credit is ${formatInsightCurrency(avail, curr)}.`;
      }
    } else {
      const debitedAcc = accounts.find(a => a.roleLabel.toLowerCase().includes('debit') || a.roleLabel.toLowerCase().includes('paid'));
      if (debitedAcc) {
        cashFlowInsight = `Post-transaction balance in ${debitedAcc.name} is ${formatInsightCurrency(debitedAcc.postBalance, curr)}.`;
      }
    }

    if (overBudget) {
      const overAmt = Math.abs(overBudget.remaining);
      return {
        status: 'warning',
        statusBadge: 'Budget Exceeded',
        headline: `Budget alert: Spending in ${overBudget.category} has exceeded your monthly limit by ${formatInsightCurrency(overAmt, curr)} (${overBudget.percentageUsed.toFixed(0)}% spent).`,
        budgetInsight: `Allocated budget was ${formatInsightCurrency(overBudget.budgeted, curr)}, while cumulative spend now totals ${formatInsightCurrency(overBudget.spent, curr)}.`,
        cashFlowInsight: cashFlowInsight || `This expense directly impacts your end-of-month discretionary cash reserves.`,
        smartTip: `Consider pausing non-essential purchases in ${overBudget.category} or reallocating surplus from an under-utilized budget category to restore balance.`,
        generatedVia: 'heuristic'
      };
    }

    if (nearBudget) {
      return {
        status: 'caution',
        statusBadge: 'Approaching Budget',
        headline: `Heads up: You have consumed ${nearBudget.percentageUsed.toFixed(0)}% of your monthly ${nearBudget.category} budget.`,
        budgetInsight: `Only ${formatInsightCurrency(nearBudget.remaining, curr)} remains available for ${nearBudget.category} for the remainder of this cycle.`,
        cashFlowInsight: cashFlowInsight || `Account liquidity remains sufficient, but category pacing needs attention.`,
        smartTip: `Pace discretionary spending in ${nearBudget.category} over the remaining days of this month to stay within your target.`,
        generatedVia: 'heuristic'
      };
    }

    if (normalBudget) {
      return {
        status: 'positive',
        statusBadge: 'Within Budget',
        headline: `Healthy spending: ${normalBudget.category} is at a comfortable ${normalBudget.percentageUsed.toFixed(0)}% of your monthly budget.`,
        budgetInsight: `You still have ${formatInsightCurrency(normalBudget.remaining, curr)} in remaining budget buffer for this category.`,
        cashFlowInsight: cashFlowInsight || `Your spending pace is sustainable and aligned with your savings plan.`,
        smartTip: `Consistent budget discipline like this maximizes your monthly savings rate for investments!`,
        generatedVia: 'heuristic'
      };
    }

    return {
      status: 'neutral',
      statusBadge: 'Spend Recorded',
      headline: `Transaction of ${formatInsightCurrency(txAmt, curr)} recorded under ${primaryCat}.`,
      budgetInsight: `No active monthly budget cap is configured for ${primaryCat}.`,
      cashFlowInsight: cashFlowInsight || `Associated account balances have been synchronized.`,
      smartTip: `Setting a monthly target for ${primaryCat} in Budgets will give you proactive burn-rate tracking!`,
      generatedVia: 'heuristic'
    };
  }

  // 2. Income analysis
  if (tx.transaction_type === 'income') {
    const creditedAcc = accounts.find(a => a.roleLabel.toLowerCase().includes('credit') || a.roleLabel.toLowerCase().includes('received')) || accounts[0];
    return {
      status: 'positive',
      statusBadge: 'Income Boost',
      headline: `Inflow of ${formatInsightCurrency(txAmt, curr)} successfully credited to ${creditedAcc ? creditedAcc.name : 'your account'}.`,
      budgetInsight: `New income elevates your monthly cash flow buffer and widens your savings margin.`,
      cashFlowInsight: creditedAcc ? `Updated balance in ${creditedAcc.name} is now ${formatInsightCurrency(creditedAcc.postBalance, curr)}.` : `Liquid wealth increased.`,
      smartTip: `Pro-tip: Allocate at least 20% of fresh income immediately toward emergency savings or mutual funds before spending!`,
      generatedVia: 'heuristic'
    };
  }

  // 3. Loan Payment analysis
  if (tx.transaction_type === 'loan_payment') {
    const loanAcc = accounts.find(a => a.type === 'loan');
    return {
      status: 'positive',
      statusBadge: 'Debt Reduced',
      headline: `Loan installment of ${formatInsightCurrency(txAmt, curr)} posted successfully.`,
      budgetInsight: `EMI payments systematically lower outstanding liability and build long-term net worth.`,
      cashFlowInsight: loanAcc ? `Remaining loan principal balance reduced to ${formatInsightCurrency(loanAcc.postBalance, curr)}.` : `Principal reduced.`,
      smartTip: `Every on-time EMI enhances your CIBIL/credit score and saves compounding interest charges!`,
      generatedVia: 'heuristic'
    };
  }

  // 4. Credit Card Repayment analysis
  if (tx.transaction_type === 'credit_card_repayment') {
    const cardAcc = accounts.find(a => a.type === 'credit_card');
    return {
      status: 'positive',
      statusBadge: 'Credit Restored',
      headline: `Card repayment of ${formatInsightCurrency(txAmt, curr)} processed successfully.`,
      budgetInsight: `Clearing credit card dues protects you from steep APR finance charges (up to 42% p.a.).`,
      cashFlowInsight: cardAcc ? `Outstanding card balance dropped to ${formatInsightCurrency(cardAcc.postBalance, curr)}. Available limit refreshed.` : `Card debt paid down.`,
      smartTip: `Paying credit card bills before the due date builds a sterling credit score and guarantees zero interest charges.`,
      generatedVia: 'heuristic'
    };
  }

  // 5. Transfer / Withdrawal
  return {
    status: 'neutral',
    statusBadge: 'Funds Reallocated',
    headline: `Internal transfer of ${formatInsightCurrency(txAmt, curr)} successfully completed between accounts.`,
    budgetInsight: `Transfer transactions do not alter your net monthly expense or income totals.`,
    cashFlowInsight: `Liquidity has been re-balanced across your accounts post-transaction.`,
    smartTip: `Distributing liquid funds between high-yield bank accounts and daily operating accounts maximizes interest earnings.`,
    generatedVia: 'heuristic'
  };
}

export async function generateTransactionAIInsight(
  params: TransactionInsightParams
): Promise<PostPostingAIInsight> {
  const fallback = generateHeuristicTransactionInsight(params);

  try {
    const { transaction: tx, accounts, categoryBudgets } = params;

    const accountsText = accounts.map(a => {
      let text = `- ${a.name} (${a.type.replace('_', ' ')}): Balance ₹${Number(a.postBalance).toLocaleString('en-IN')}`;
      if (a.previousBalance !== undefined) {
        text += `, Previous: ₹${Number(a.previousBalance).toLocaleString('en-IN')}`;
      }
      if (a.changeAmount !== undefined) {
        text += `, Net Change: ${a.changeAmount >= 0 ? '+' : ''}₹${Number(a.changeAmount).toLocaleString('en-IN')}`;
      }
      if (a.type === 'credit_card' && a.credit_limit) {
        const util = ((a.postBalance / a.credit_limit) * 100).toFixed(1);
        text += `, Limit: ₹${Number(a.credit_limit).toLocaleString('en-IN')} (Utilization: ${util}%)`;
      }
      return text;
    }).join('\n');

    const budgetsText = (categoryBudgets && categoryBudgets.length > 0)
      ? categoryBudgets.map(b => {
          return `- Category "${b.category}": Spent Now ₹${Number(b.spent).toLocaleString('en-IN')}, Budgeted: ${b.hasBudget ? `₹${Number(b.budgeted).toLocaleString('en-IN')}` : 'No limit'}, Remaining: ${b.hasBudget ? `₹${Number(b.remaining).toLocaleString('en-IN')} (${b.percentageUsed.toFixed(1)}% used)` : 'N/A'}`;
        }).join('\n')
      : 'No monthly category budget cap active for this transaction.';

    const prompt = `You are an expert personal finance coach and transaction analyst for SmartFinHub.
A user just submitted the following financial transaction:
- Action: ${tx.isEdit ? 'Updated Transaction' : 'New Transaction'}
- Type: ${tx.transaction_type}
- Amount: ₹${Number(tx.amount).toLocaleString('en-IN')} (${tx.currency})
- Category: ${tx.category || tx.income_category || 'N/A'}
- Description: "${tx.description || 'N/A'}"
- Date: ${tx.transaction_date}

Post-Posting Account Balances:
${accountsText || 'None'}

Post-Posting Category Budget Status:
${budgetsText}

Provide an ultra-concise, high-impact financial insight on this transaction.
Respond strictly in JSON format matching this schema:
{
  "status": "positive" | "warning" | "caution" | "neutral",
  "statusBadge": "2-4 words badge (e.g., 'Budget Healthy', 'Budget Exceeded', 'High Credit Utilization', 'Income Boost', 'Debt Reduced')",
  "headline": "1 punchy sentence summarizing this specific transaction's financial impact.",
  "budgetInsight": "1-2 concise sentences analyzing the budget impact, category pace, or burn rate.",
  "cashFlowInsight": "1-2 concise sentences on liquidity, cash reserves, debt reduction, or credit card utilization.",
  "smartTip": "1 practical, actionable, encouraging tip for the user going forward."
}

Do not include any extra text, commentary, or markdown formatting outside the JSON object.`;

    const config = getAIProviderConfig();
    let fullResponseText = '';

    const executeGemini = async (): Promise<string> => {
      return await callGeminiJSON(
        config.geminiApiKey,
        config.geminiModel,
        [{ role: 'user', parts: [{ text: prompt }] }]
      );
    };

    const executeGroq = async (): Promise<string> => {
      return await callGroqJSON(
        config.groqApiKey,
        config.groqModel,
        [{ role: 'user', content: prompt }]
      );
    };

    if (config.provider === 'gemini' && config.geminiApiKey) {
      try {
        fullResponseText = await executeGemini();
      } catch (e) {
        console.warn('Gemini generateTransactionAIInsight failed, trying secondary cloud provider:', e);
        if (config.groqApiKey) {
          try {
            fullResponseText = await executeGroq();
          } catch (err2) {
            console.warn('Groq secondary failover also failed:', err2);
          }
        }
      }
    } else if (config.provider === 'groq' && config.groqApiKey) {
      try {
        fullResponseText = await executeGroq();
      } catch (e) {
        console.warn('Groq generateTransactionAIInsight failed, trying secondary cloud provider:', e);
        if (config.geminiApiKey) {
          try {
            fullResponseText = await executeGemini();
          } catch (err2) {
            console.warn('Gemini secondary failover also failed:', err2);
          }
        }
      }
    } else if (config.provider === 'builtin' && (config.geminiApiKey || config.groqApiKey)) {
      if (config.geminiApiKey) {
        try {
          fullResponseText = await executeGemini();
        } catch {
          if (config.groqApiKey) {
            try {
              fullResponseText = await executeGroq();
            } catch {}
          }
        }
      } else if (config.groqApiKey) {
        try {
          fullResponseText = await executeGroq();
        } catch {}
      }
    }

    if (!fullResponseText || !fullResponseText.trim()) {
      return fallback;
    }

    // Clean JSON text
    let cleanJson = fullResponseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed.headline === 'string') {
      const validStatuses = ['positive', 'warning', 'caution', 'neutral'];
      const status = validStatuses.includes(parsed.status) ? parsed.status : fallback.status;
      return {
        status,
        statusBadge: parsed.statusBadge || fallback.statusBadge,
        headline: parsed.headline || fallback.headline,
        budgetInsight: parsed.budgetInsight || fallback.budgetInsight,
        cashFlowInsight: parsed.cashFlowInsight || fallback.cashFlowInsight,
        smartTip: parsed.smartTip || fallback.smartTip,
        generatedVia: 'ai'
      };
    }

    return fallback;
  } catch (error) {
    console.warn('generateTransactionAIInsight failed, using heuristic fallback:', error);
    return fallback;
  }
}
