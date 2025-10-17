import React from 'react';
import { Volume2 } from 'lucide-react';

const TTS_BASE = process.env.LLM_BASE_URL || 'http://localhost:8787';

let currentAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, { audio: HTMLAudioElement; url: string }>();

export function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export async function preloadAudio(text: string, speaker: 'Fenrir' | 'Zephyr' = 'Fenrir'): Promise<HTMLAudioElement | null> {
  const cacheKey = `${text}-${speaker}`;
  if (audioCache.has(cacheKey)) {
    const cached = audioCache.get(cacheKey)!;
    return cached.audio;
  }

  try {
    const response = await fetch(`${TTS_BASE}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, speaker })
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audioCache.set(cacheKey, { audio, url: audioUrl });
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
      audioCache.delete(cacheKey);
    });

    return audio;
  } catch (error) {
    console.error('TTS preload error:', error);
    return null;
  }
}

export async function playPreloadedAudio(audio: HTMLAudioElement): Promise<void> {
  try {
    stopCurrentAudio(); 
    currentAudio = audio;
    await audio.play();
  } catch (error) {
    console.error('TTS play error:', error);
  }
}

export async function preloadMultipleAudio(texts: string[], speaker: 'Fenrir' | 'Zephyr' = 'Fenrir'): Promise<Map<string, HTMLAudioElement>> {
  const results = new Map<string, HTMLAudioElement>();
  
  const fetchPromises = texts.map(async (text) => {
    const cacheKey = `${text}-${speaker}`;
    
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return { text, audio: cached.audio };
    }

    try {
      const response = await fetch(`${TTS_BASE}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, speaker })
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audioCache.set(cacheKey, { audio, url: audioUrl });
      
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        audioCache.delete(cacheKey);
      });

      return { text, audio };
    } catch (error) {
      console.error(`TTS preload error for "${text}":`, error);
      return { text, audio: null };
    }
  });

  const responses = await Promise.all(fetchPromises);
  responses.forEach(({ text, audio }) => {
    if (audio) {
      results.set(text, audio);
    }
  });

  return results;
}

export async function speakText(text: string, speaker: 'Fenrir' | 'Zephyr' = 'Fenrir'): Promise<void> {
  const audio = await preloadAudio(text, speaker);
  if (audio) {
    await playPreloadedAudio(audio);
  }
}

export function createAudioButton(text: string, speaker: 'Fenrir' | 'Zephyr' = 'Fenrir', className?: string): JSX.Element {
  return React.createElement('button', {
    className: `inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800 transition-colors ${className || ''}`,
    onClick: () => speakText(text, speaker),
    title: `Read aloud (${speaker})`,
    'aria-label': `Read aloud (${speaker})`
  }, React.createElement(Volume2, { className: 'w-3 h-3' }));
}
