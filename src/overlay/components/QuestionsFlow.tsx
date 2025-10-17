import React, { useEffect, useState } from 'react';
import { LlmPlan, LlmQuestion, PromptContext, finalPrompt, planQuestions } from '../../ai/llm';
import OptionCard from './OptionCard';
import LayoutCard from './LayoutCard';
import ColorCard from './ColorCard';
import FontCard from './FontCard';
import LoadingSpinner from './LoadingSpinner';

type QuestionsFlowProps = {
  initialContext: PromptContext;
  drawingImage?: string | null;
  onFinal: (finalText: string, finalContext: PromptContext) => void;
  onError?: (message: string) => void;
};

const QuestionsFlow: React.FC<QuestionsFlowProps> = ({ initialContext, drawingImage, onFinal, onError }) => {
  const [ctx, setCtx] = useState<PromptContext>(initialContext);
  const [plan, setPlan] = useState<LlmPlan | null>(null);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [q, setQ] = useState<LlmQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ field: keyof PromptContext | null; value: string | null; label: string | null }>({ field: null, value: null, label: null });

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await planQuestions(initialContext, drawingImage);
        if (cancelled) return;
        if (p && Array.isArray(p.steps) && p.steps.length > 0) {
          setPlan(p);
          setStepIdx(0);
          setQ(p.steps[0] as LlmQuestion);
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

  const handleNext = async () => {
    if (!plan || !q || !selection.value || !selection.field) return;
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
      setQ(plan.steps[nextIndex] as LlmQuestion);
      setSelection({ field: null, value: null, label: null });
      } else {
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
      {loading && <LoadingSpinner />}
      {!loading && q && (
        <div>
          <p className="mb-3 text-slate-700 font-medium">{q.question}</p>
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