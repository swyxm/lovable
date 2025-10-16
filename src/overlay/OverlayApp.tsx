import React, { useEffect, useRef, useState } from 'react';
import A11yMenu, { A11yState } from './components/A11yMenu';
import DrawCanvas from './components/DrawCanvas';
import OptionCard from './components/OptionCard';
import ColorCard from './components/ColorCard';
import LayoutCard from './components/LayoutCard';
import FontCard from './components/FontCard';
import LoadingSpinner from './components/LoadingSpinner';
import { finalPrompt, planQuestions, PromptContext, LlmQuestion, LlmPlan } from '../ai/llm';

type OverlayAppProps = {
  onClose: () => void;
  onHeaderReady?: (el: HTMLElement | null) => void;
};

const OverlayApp: React.FC<OverlayAppProps> = ({ onClose, onHeaderReady }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'draw' | 'text'>('draw');
  const [textIdea, setTextIdea] = useState('');
  const [a11y, setA11y] = useState<A11yState>({ largeText: false, highContrast: false, reduceMotion: false, boldText: false });
  const [ctx, setCtx] = useState<PromptContext>({});
  const [q, setQ] = useState<LlmQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [finalOut, setFinalOut] = useState<string>('');
  
  const [plan, setPlan] = useState<LlmPlan | null>(null);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [inputLocked, setInputLocked] = useState<boolean>(false);
  const [selection, setSelection] = useState<{ field: keyof PromptContext | null; value: string | null; label: string | null }>({ field: null, value: null, label: null });

  const startPlan = async (nextCtx: PromptContext) => {
    setLoading(true);
    setError(null);
    try {
      const p = await planQuestions(nextCtx);
      if (p && Array.isArray(p.steps) && p.steps.length > 0){
        setPlan(p);
        setStepIdx(0);
        setQ(p.steps[0] as LlmQuestion);
      } else {
        setError('No questions could be planned.');
      }
    } catch (e: any){
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const advanceWithSelection = async (nextCtx: PromptContext, field: keyof PromptContext, choiceLabel: string) => {
    setCtx(nextCtx);
    if (!plan) { setError('Missing plan. Please start over.'); return; }
    const nextIndex = stepIdx + 1;
    if (nextIndex < plan.steps.length){
      setStepIdx(nextIndex);
      const nextStep = plan.steps[nextIndex] as LlmQuestion;
      setQ(nextStep);
    } else {
      setQ(null);
      setLoading(true);
      try {
        const fin = await finalPrompt(nextCtx);
        setFinalOut(fin.prompt || '');
        setShowFinal(true);
      } catch (e: any){
        setError(e?.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => { onHeaderReady?.(headerRef.current); }, [onHeaderReady]);

  return (
    <div className={`relative min-h-full h-full w-full bg-white text-slate-700 ${a11y.largeText ? 'lb-large-text' : ''} ${a11y.highContrast ? 'lb-high-contrast' : ''} ${a11y.reduceMotion ? 'lb-reduce-motion' : ''} ${a11y.boldText ? 'font-bold' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      <div ref={headerRef} id="lb-header" className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 select-none">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-sky-600">LovaBridge Buddy</span>
          <span className="text-slate-500 hidden sm:inline">– Create something wonderful</span>
        </div>
        <button title="Close" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 text-2xl leading-none" onClick={onClose}>×</button>
      </div>

      <div className="lb-scroll h-[calc(100%-48px)] overflow-auto p-4 pb-8 bg-white">
        <div className="mb-3 flex items-center gap-2 justify-center bg-slate-100/80 rounded-xl py-1.5">
          <button
            className={`px-3 py-1 rounded-full border text-sm ${mode === 'draw' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
          <button
            className={`px-3 py-1 rounded-full border text-sm ${mode === 'text' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
            onClick={() => setMode('text')}
          >
            Describe
          </button>
        </div>

        {mode === 'draw' ? (
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <DrawCanvas />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
            <div className="flex gap-2">
              <input
                className={`flex-1 border-2 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 ${inputLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300'}`}
                placeholder="Describe your idea..."
                value={textIdea}
                disabled={inputLocked}
                data-lb-primary-focus
                onChange={(e) => setTextIdea(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !loading && !inputLocked && textIdea.trim()) {
                    const nextCtx = { ...ctx, base_idea: textIdea };
                    setCtx(nextCtx);
                    setInputLocked(true);
                    await startPlan(nextCtx);
                  }
                }}
              />
              <button
                className={`px-4 py-2 rounded-xl ${inputLocked || !textIdea.trim() ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
                disabled={inputLocked || !textIdea.trim()}
                onClick={async () => {
                  if (inputLocked || !textIdea.trim()) return;
                  const nextCtx = { ...ctx, base_idea: textIdea };
                  setCtx(nextCtx);
                  setInputLocked(true);
                  await startPlan(nextCtx);
                }}
              >Send</button>
            </div>
            {error && <p className="mt-2 text-red-600">{error}</p>}
            <div className="mt-4">
              <div className="rounded-xl bg-slate-100 border border-slate-200 p-3 h-72 overflow-y-auto">
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
                        onClick={async () => {
                          if (!selection.value || !selection.field) return;
                          const field = selection.field as keyof PromptContext;
                          let nextCtx: PromptContext;
                          if (field === 'palette') {
                            const arr = (selection.value || '').split(',').map(s => s.trim()).filter(Boolean);
                            nextCtx = { ...ctx, palette: arr } as PromptContext;
                          } else {
                            nextCtx = { ...ctx, [field]: selection.value } as PromptContext;
                          }
                          await advanceWithSelection(nextCtx, field, selection.label || '');
                          setSelection({ field: null, value: null, label: null });
                        }}
                      >Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showFinal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowFinal(false)}>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-xl w-[90%]" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 mb-3">All set! Here’s your Lovable prompt:</h3>
              <pre className="whitespace-pre-wrap text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 max-h-72 overflow-auto">{finalOut}</pre>
              <div className="text-right mt-4">
                <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl mr-2" onClick={() => navigator.clipboard.writeText(finalOut)}>Copy</button>
                <button className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-2 rounded-xl" onClick={() => { setShowFinal(false); setQ(null); setTextIdea(''); setCtx({}); setPlan(null); setStepIdx(0); setInputLocked(false); }}>Start over</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="fixed left-4 bottom-4 z-50 pointer-events-auto">
        <A11yMenu value={a11y} onChange={setA11y} />
      </div>
    </div>
  );
};

export default OverlayApp;