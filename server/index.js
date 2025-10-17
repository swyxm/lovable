/* eslint-disable */
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const PORT = process.env.PORT || 8787;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_TTS_API_KEY = process.env.LLM_TTS_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const LLM_BASE = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const LLM_MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';
const LLM_FINAL_MODEL = process.env.LLM_FINAL_MODEL || 'gemini-2.5-pro';
const LLM_TTS_MODEL = process.env.LLM_TTS_MODEL || 'gemini-2.5-flash-tts';

// Function to get OAuth2 access token
async function getAccessToken() {
  if (LLM_TTS_API_KEY) {
    return LLM_TTS_API_KEY; // Use provided token
  }
  
  // Try to get token from gcloud
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('gcloud auth application-default print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error('Failed to get access token:', error.message);
    throw new Error('No valid authentication found. Please run: gcloud auth application-default login');
  }
}

function parseMimeType(mimeType) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options = {
    numChannels: 1,
    sampleRate: 24000,
    bitsPerSample: 16
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options;
}

function createWavHeader(dataLength, options) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      
  buffer.writeUInt32LE(36 + dataLength, 4);  
  buffer.write('WAVE', 8);                    
  buffer.write('fmt ', 12);                
  buffer.writeUInt32LE(16, 16);       
  buffer.writeUInt16LE(1, 20);           
  buffer.writeUInt16LE(numChannels, 22);  
  buffer.writeUInt32LE(sampleRate, 24);         
  buffer.writeUInt32LE(byteRate, 28); 
  buffer.writeUInt16LE(blockAlign, 32);         
  buffer.writeUInt16LE(bitsPerSample, 34);      
  buffer.write('data', 36);                     
  buffer.writeUInt32LE(dataLength, 40);         

  return buffer;
}

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
  const { context, drawingImage } = req.body || {};
  const base = context?.base_idea || 'a fun website';
  const details = JSON.stringify(context, null, 2);
  try {
    const prompt = PLAN_QUESTIONS_TEMPLATE(base, details, drawingImage);
    const userParts = [{ text: prompt }];
    if (drawingImage) {
      const base64Data = drawingImage.replace(/^data:image\/[a-z]+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }
    const data = await callLLM(`/models/${LLM_MODEL}:generateContent`, {
      systemInstruction: { role: 'system', parts: [{ text: SYSTEM_TEMPLATE }] },
      contents: [ { role: 'user', parts: userParts } ],
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

app.post('/tts', async (req, res) => {
  const { text, speaker = 'Fenrir' } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const validSpeakers = ['Fenrir', 'Zephyr'];
  const selectedSpeaker = validSpeakers.includes(speaker) ? speaker : 'Fenrir';
  
  try {
    const accessToken = await getAccessToken();
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Goog-User-Project': 'airy-cortex-475404-v4'
      },
      body: JSON.stringify({
        input: {
          text: text,
          prompt: `Read aloud in a warm, clear and gentle, friendly tone`
        },
        voice: {
          languageCode: 'en-US',
          name: selectedSpeaker,
          modelName: LLM_TTS_MODEL
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: 24000
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('TTS Request body:', JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `Read aloud in a warm, clear and gentle, friendly tone: ${text}`
          }]
        }],
        generationConfig: {
          responseModalities: ['audio'],
          temperature: 1
        },
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [{
              speaker: 'Speaker1',
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedSpeaker
                }
              }
            }]
          }
        }
      }, null, 2));
      throw new Error(`TTS API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    const audioData = data?.audioContent;
    
    if (audioData) {
      console.log('Audio data received from Cloud TTS API');
      
      const audioBuffer = Buffer.from(audioData, 'base64');
      const options = {
        numChannels: 1,
        sampleRate: 24000,
        bitsPerSample: 16
      };
      const wavHeader = createWavHeader(audioBuffer.length, options);
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
      
      res.setHeader('Content-Type', 'audio/wav');
      res.send(wavBuffer);
    } else {
      console.log('No audio data found in response');
      res.status(500).json({ error: 'No audio generated', response: data });
    }
  } catch (e) {
    console.error('TTS error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`LLM relay listening on :${PORT}`);
});
