/* eslint-disable */
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const PORT = process.env.PORT || 8787;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const LLM_MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';
const LLM_FINAL_MODEL = process.env.LLM_FINAL_MODEL || 'gemini-2.5-pro';

function llmUrl(path){
  const sep = path.startsWith('/') ? '' : '/';
  return `${LLM_BASE}${sep}${path}`;
}

async function callLLM(modelPath, body){
  const url = `${llmUrl(modelPath)}?key=${encodeURIComponent(LLM_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const text = await res.text();
    throw new Error(`LLM error ${res.status}: ${text}`);
  }
  return res.json();
}

import { SYSTEM_TEMPLATE, FINAL_PROMPT_TEMPLATE, PLAN_QUESTIONS_TEMPLATE } from './prompts.js';

function extractFirstJsonObject(text){
  if(!text) return '';
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const start = text.indexOf('{');
  if (start === -1) return '';
  let depth = 0;
  for (let i = start; i < text.length; i++){
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0){
        return text.slice(start, i + 1);
      }
    }
  }
  return '';
}

app.post('/analyze/describe', async (req, res) => {
  const { text } = req.body || {};
  try {
    const prompt = `Summarize this idea into a short base concept string only: ${text}`;
    const data = await callLLM(`/models/${LLM_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }]
    });
    const concept = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
    res.json({ base_idea: concept });
  } catch (e){
    res.status(500).json({ error: e.message });
  }
});

app.post('/analyze/drawing', async (req, res) => {
  const { imageDataUrl } = req.body || {};
  try {
    const prompt = 'Describe this image in a short phrase for a kid-friendly website idea.';
    const data = await callLLM(`/models/${LLM_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: imageDataUrl.split(',')[1] } }] }]
    });
    const concept = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Creative idea';
    res.json({ base_idea: concept });
  } catch (e){
    res.status(500).json({ error: e.message });
  }
});

app.post('/conversation/next', async (req, res) => {
  const { context, lastAnswer } = req.body || {};
  const base = context?.base_idea || 'a fun website';
  const details = JSON.stringify(context, null, 2);
  try {
    const memory = lastAnswer?.value ? `Previous answer: ${lastAnswer.value}` : '';
    const lastField = lastAnswer?.field ? `\nDo NOT ask again about: ${lastAnswer.field}.` : '';
    const prompt = `${memory ? memory + '\n' : ''}Given the idea "${base}" and current details: \n${details}\n\nAsk ONE new question to fill a single missing attribute from: palette, layout, font, tone, main_character, purpose.\nFollow the same rules as the system for JSON shape and choices.\nPrefer palettes over single theme colors. Provide exactly 3 layout options when asking about layout. Output JSON only.${lastField}`;
    const baseGenConfig = {
      temperature: 0.6,
      topK: 30,
      topP: 0.95,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          expected_field: { type: 'string', enum: ['theme_color','main_character','purpose','tone','layout','palette','font'] },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                emoji: { type: 'string' },
                value: { type: 'string' },
                type: { type: 'string', enum: ['color','text','icon','layout'] }
              },
              required: ['label','value','type']
            },
            minItems: 3,
            maxItems: 6
          }
        },
        required: ['question','expected_field','choices']
      }
    };

    async function makeRequest(genCfg){
      return callLLM(`/models/${LLM_MODEL}:generateContent`, {
        systemInstruction: { role: 'system', parts: [{ text: SYSTEM_TEMPLATE }] },
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: genCfg
      });
    }

    let data = await makeRequest(baseGenConfig);
    if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS'){
      const retryCfg = { ...baseGenConfig, maxOutputTokens: 2048 };
      data = await makeRequest(retryCfg);
    }
    if (!data?.candidates || data.candidates.length === 0) {
      const dump = JSON.stringify(data)?.slice(0, 2000) || '';
      return res.status(422).json({ error: 'Empty LLM response', raw: dump });
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const raw = (parts
      .map(p => (typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('')
      .trim());
    if (!raw) {
      const dump = JSON.stringify(data)?.slice(0, 2000) || '';
      return res.status(422).json({ error: 'Invalid JSON from LLM', raw: dump });
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const extracted = extractFirstJsonObject(raw);
      if (!extracted) {
        return res.status(422).json({ error: 'Invalid JSON from LLM', raw: raw?.slice(0, 2000) });
      }
      try {
        parsed = JSON.parse(extracted);
      } catch (e2){
        return res.status(422).json({ error: 'Invalid JSON from LLM', raw: raw?.slice(0, 2000) });
      }
    }
    if (!parsed || !parsed.question || !Array.isArray(parsed.choices) || !parsed.expected_field) {
      return res.status(422).json({ error: 'Malformed JSON from LLM', raw: raw?.slice(0, 1000) });
    }
    res.json(parsed);
  } catch (e){
    console.error('Relay /conversation/next error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/conversation/final', async (req, res) => {
  const { context } = req.body || {};
  const details = JSON.stringify(context, null, 2);
  try {
    const prompt = FINAL_PROMPT_TEMPLATE(details);
    const data = await callLLM(`/models/${LLM_FINAL_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }]
    });
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    res.json({ prompt: out, json: context });
  } catch (e){
    console.error('Relay /conversation/final error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/conversation/plan', async (req, res) => {
  const { context } = req.body || {};
  const base = context?.base_idea || 'a fun website';
  const details = JSON.stringify(context, null, 2);
  try {
    const prompt = PLAN_QUESTIONS_TEMPLATE(base, details);
    const data = await callLLM(`/models/${LLM_MODEL}:generateContent`, {
      systemInstruction: { role: 'system', parts: [{ text: SYSTEM_TEMPLATE }] },
      contents: [ { role: 'user', parts: [{ text: prompt }] } ],
      generationConfig: {
        temperature: 0.5,
        topK: 30,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  expected_field: { type: 'string', enum: ['palette','layout','font','tone','main_character','purpose'] },
                  choices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        emoji: { type: 'string' },
                        value: { type: 'string' },
                        type: { type: 'string', enum: ['color','text','icon','layout'] }
                      },
                      required: ['label','value','type']
                    },
                    minItems: 3,
                    maxItems: 6
                  }
                },
                required: ['question','expected_field','choices']
              },
              minItems: 3,
              maxItems: 6
            }
          },
          required: ['steps']
        }
      }
    });
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const raw = (parts.map(p => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean).join('').trim());
    if (!raw) return res.status(422).json({ error: 'Invalid JSON from LLM' });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const extracted = extractFirstJsonObject(raw);
      if (!extracted) return res.status(422).json({ error: 'Invalid JSON from LLM', raw: raw?.slice(0, 2000) });
      parsed = JSON.parse(extracted);
    }
    if (!parsed?.steps || !Array.isArray(parsed.steps)) return res.status(422).json({ error: 'Malformed plan' });
    res.json(parsed);
  } catch (e){
    console.error('Relay /conversation/plan error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`LLM relay listening on :${PORT}`);
});
