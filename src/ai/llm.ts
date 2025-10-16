export type FieldKey = 'theme_color' | 'main_character' | 'purpose' | 'tone' | 'layout' | 'palette' | 'font';

export interface LlmChoice { label: string; emoji?: string; value: string; type: 'color' | 'text' | 'icon' | 'layout'; }
export interface LlmQuestion {
  question: string;
  choices?: LlmChoice[];
  expected_field: FieldKey;
}

export interface PromptContext {
  base_idea?: string;
  theme_color?: string;
  main_character?: string;
  purpose?: string;
  tone?: string;
  layout?: string;
  palette?: string[];
  font?: string;
}

const LLM_BASE = process.env.LLM_BASE_URL || '';
const LLM_KEY = process.env.LLM_API_KEY || '';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${LLM_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LLM_KEY ? `Bearer ${LLM_KEY}` : ''
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function analyzeDescribe(text: string): Promise<PromptContext> {
  return post<PromptContext>('/analyze/describe', { text });
}

export async function analyzeDrawing(imageDataUrl: string): Promise<PromptContext> {
  return post<PromptContext>('/analyze/drawing', { imageDataUrl });
}

export async function nextQuestion(context: PromptContext, lastAnswer?: { field?: FieldKey; value?: string }): Promise<LlmQuestion> {
  return post<LlmQuestion>('/conversation/next', { context, lastAnswer });
}

export async function finalPrompt(context: PromptContext): Promise<{ prompt: string; json: PromptContext }>{
  return post('/conversation/final', { context });
}

export interface LlmPlan {
  steps: Array<{
    question: string;
    expected_field: Exclude<FieldKey, 'theme_color' | 'palette'> | 'palette';
    choices: LlmChoice[];
  }>;
}

export async function planQuestions(context: PromptContext): Promise<LlmPlan> {
  return post<LlmPlan>('/conversation/plan', { context });
}
