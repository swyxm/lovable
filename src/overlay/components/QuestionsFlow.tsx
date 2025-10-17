import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LlmPlan, LlmQuestion, PromptContext, finalPrompt, planQuestions } from '../../ai/llm';
import OptionCard from './OptionCard';
import LayoutCard from './LayoutCard';
import ColorCard from './ColorCard';
import FontCard from './FontCard';
import LoadingSpinner from './LoadingSpinner';
import { speakText, createAudioButton, preloadAudio, playPreloadedAudio, stopCurrentAudio, preloadMultipleAudio } from '../../ai/tts';
import AnimCycle from './AnimCycle';

type QuestionsFlowProps = {
  initialContext: PromptContext;
  drawingImage?: string | null;
  onFinal: (finalText: string, finalContext: PromptContext) => void;
  onError?: (message: string) => void;
  ttsEnabled?: boolean;
  ttsVoice?: 'Fenrir' | 'Zephyr';
};

const QuestionsFlow: React.FC<QuestionsFlowProps> = ({ initialContext, drawingImage, onFinal, onError, ttsEnabled = false, ttsVoice = 'Fenrir' }) => {
  const [ctx, setCtx] = useState<PromptContext>(initialContext);
  const [plan, setPlan] = useState<LlmPlan | null>(null);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [q, setQ] = useState<LlmQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsgs, setLoadingMsgs] = useState<string[] | null>(null);
  const [loadingKey, setLoadingKey] = useState<number>(0);
  const finishingRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ field: keyof PromptContext | null; value: string | null; label: string | null }>({ field: null, value: null, label: null });
  const [preloadedAudios, setPreloadedAudios] = useState<Map<string, HTMLAudioElement>>(new Map());

  const createQuestionText = (question: LlmQuestion) => {
    const optionsText = question.choices?.map((choice, index) => 
      `Option ${index + 1}: ${choice.label}`
    ).join('. ') || '';
    return `${question.question}. ${optionsText}`;
  };

  const preloadAllQuestions = async (plan: LlmPlan) => {
    if (!ttsEnabled) return;
    
    try {
      const questionTexts = plan.steps.map(step => {
        const question = step as LlmQuestion;
        return createQuestionText(question);
      });
      
      const audioMap = await preloadMultipleAudio(questionTexts, ttsVoice);
      setPreloadedAudios(audioMap);
      
      console.log(`Preloaded ${audioMap.size} audio files simultaneously`);
    } catch (error) {
      console.error('Error preloading audio:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      setLoadingMsgs([
        'Sprinkling magic dust…',
        'Gathering awesome ideas…',
        'Painting rainbow colors…',
        'Choosing friendly fonts…',
        'Warming up our build bots…',
      ]);
      setLoadingKey((k) => k + 1);
      setError(null);
      try {
        const p = await planQuestions(initialContext, drawingImage);
        if (cancelled) return;
        if (p && Array.isArray(p.steps) && p.steps.length > 0) {
          setPlan(p);
          setStepIdx(0);
          const firstQuestion = p.steps[0] as LlmQuestion;
          setQ(firstQuestion);
          if (ttsEnabled) {
            await preloadAllQuestions(p);
            const firstQuestionText = createQuestionText(firstQuestion);
            const firstAudio = preloadedAudios.get(firstQuestionText);
            if (firstAudio) {
              await playPreloadedAudio(firstAudio);
            }
          }
        } else {
          const fin = await finalPrompt(initialContext);
          if (cancelled) return;
          onFinal(fin.prompt || '', fin.json || initialContext);
        }
      } catch (e: any) {
        setError(e?.message || 'Request failed');
        onError?.(e?.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    };
    boot();
    return () => { cancelled = true; };
  }, [initialContext, onFinal, onError]);

  useEffect(() => {
    if (!ttsEnabled) {
      stopCurrentAudio();
    }
  }, [ttsEnabled, ttsVoice]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const handleNext = async () => {
    if (!plan || !q || !selection.value || !selection.field) return;
    
    stopCurrentAudio();
    
    const field = selection.field as keyof PromptContext;
    let nextCtx: PromptContext;
    if (field === 'palette') {
      const arr = (selection.value || '').split(',').map(s => s.trim()).filter(Boolean);
      nextCtx = { ...ctx, palette: arr } as PromptContext;
    } else {
      nextCtx = { ...ctx, [field]: selection.value } as PromptContext;
    }
    setCtx(nextCtx);
    const nextIndex = stepIdx + 1;
    if (nextIndex < plan.steps.length) {
      setStepIdx(nextIndex);
      const nextQuestion = plan.steps[nextIndex] as LlmQuestion;
      setQ(nextQuestion);
      setSelection({ field: null, value: null, label: null });

      } else {
        finishingRef.current = true;
        setQ(null);
        setLoading(true);
        const paletteStr = Array.isArray((nextCtx as any).palette) ? ((nextCtx as any).palette as string[]).join(',') : '';
        const warm = /(#ef4444|red|orange|#f59e0b)/i.test(paletteStr);
        const cool = /(#3b82f6|#22c55e|blue|green|teal)/i.test(paletteStr);
        const vibe = warm ? 'fiery colors' : cool ? 'cool palette' : 'chosen style';
        setLoadingMsgs([
          'Casting the build spell…',
          `Building your ${vibe}…`,
          'Adding extra sparkles…',
          'Packing everything nicely…',
          'Almost ready…',
        ]);
        setLoadingKey((k) => k + 1);
        try {
          const fin = await finalPrompt(nextCtx);
          onFinal(fin.prompt || '', fin.json || nextCtx);
        } catch (e: any) {
          setError(e?.message || 'Request failed');
          onError?.(e?.message || 'Request failed');
        } finally {
        }
      }
    }
        
    if (ttsEnabled) {
        const nextQuestionText = createQuestionText(nextQuestion);
        const nextAudio = preloadedAudios.get(nextQuestionText);
        if (nextAudio) {
          await playPreloadedAudio(nextAudio);
        } else {
          const fallbackAudio = await preloadAudio(nextQuestionText, ttsVoice);
          if (fallbackAudio) {
            await playPreloadedAudio(fallbackAudio);
        }else {
      setLoading(true);
      try {
        const fin = await finalPrompt(nextCtx);
        onFinal(fin.prompt || '', fin.json || nextCtx);
      } catch (e: any) {
        setError(e?.message || 'Request failed');
        onError?.(e?.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const LoadingSequence: React.FC<{ messages: string[]; intervalMs?: number }> = ({ messages, intervalMs = 5000 }) => {
    const [idx, setIdx] = useState(0);
    const [typed, setTyped] = useState('');
    useEffect(() => {
      let cancelled = false;
      let t: number | null = null;
      const tick = () => {
        if (cancelled) return;
        setIdx((i) => (i + 1) % messages.length);
        t = window.setTimeout(tick, intervalMs);
      };
      t = window.setTimeout(tick, intervalMs);
      return () => { cancelled = true; if (t) window.clearTimeout(t); };
    }, [messages.length, intervalMs]);
    useEffect(() => {
      setTyped('');
      let i = 0; const iv = window.setInterval(() => { i += 1; const m = messages[idx] || ''; setTyped(m.slice(0, i)); if (i >= m.length) window.clearInterval(iv); }, 18);
      return () => window.clearInterval(iv);
    }, [idx, messages]);
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <AnimCycle />
        <span className="text-sky-600 text-lg font-semibold">{typed}</span>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-slate-100 border border-slate-200 p-3 h-100 overflow-y-auto">
      {plan && (
        <div className="mb-3 text-center">
          <div className="text-sm text-slate-600 font-medium">{Math.min(stepIdx + 1, plan.steps.length)}/{plan.steps.length}</div>
          <div className="mt-1 flex items-center justify-center gap-1">
            {plan.steps.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === stepIdx ? 'bg-sky-500' : 'bg-slate-300'}`} />
            ))}
          </div>
        </div>
      )}
      {(loading || (!q && !error)) && <LoadingSequence key={loadingKey} messages={loadingMsgs || ['Working…']} intervalMs={4000} />}
      {!loading && q && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-slate-700 font-medium">{q.question}</p>
            {createAudioButton(createQuestionText(q), ttsVoice)}
          </div>
          <div className={`grid ${q.expected_field === 'font' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-3`}>
            {q.choices?.map((c) => {
              if (c.type === 'color') {
                const isSelected = selection.value === c.value && selection.field === (q.expected_field as keyof PromptContext);
                return (
                  <ColorCard
                    key={c.value}
                    label={c.label}
                    hex={c.value}
                    selected={isSelected}
                    onSelect={(val) => {
                      const field = q.expected_field as keyof PromptContext;
                      setSelection({ field, value: val, label: c.label });
                    }}
                  />
                );
              }
              if (c.type === 'layout') {
                const isSelected = selection.value === c.value && selection.field === (q.expected_field as keyof PromptContext);
                return (
                  <LayoutCard
                    key={c.value}
                    label={c.label}
                    value={c.value}
                    selected={isSelected}
                    onSelect={(val) => {
                      const field = q.expected_field as keyof PromptContext;
                      setSelection({ field, value: val, label: c.label });
                    }}
                  />
                );
              }
              if (q.expected_field === 'font') {
                const isSelected = selection.value === c.value && selection.field === (q.expected_field as keyof PromptContext);
                return (
                  <FontCard
                    key={c.value}
                    label={c.label}
                    value={c.value}
                    selected={isSelected}
                    onSelect={(val) => {
                      const field = q.expected_field as keyof PromptContext;
                      setSelection({ field, value: val, label: c.label });
                    }}
                  />
                );
              }
              const isSelected = selection.value === c.value && selection.field === (q.expected_field as keyof PromptContext);
              return (
                <OptionCard
                  key={c.value}
                  label={c.label}
                  emoji={c.emoji as any}
                  value={c.value}
                  context={q.expected_field}
                  selected={isSelected}
                  onSelect={(val) => {
                    const field = q.expected_field as keyof PromptContext;
                    setSelection({ field, value: val, label: c.label });
                  }}
                />
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className={`px-4 py-2 rounded-xl ${!selection.value ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
              disabled={!selection.value}
              onClick={handleNext}
            >Next</button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
};

export default QuestionsFlow;