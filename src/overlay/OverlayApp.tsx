import React, { useEffect, useRef, useState } from 'react';
import A11yMenu, { A11yState } from './components/A11yMenu';
import DrawCanvas from './components/DrawCanvas';
import QuestionsFlow from './components/QuestionsFlow';
import { PromptContext, analyzeDrawing } from '../ai/llm';


type OverlayAppProps = {
  onClose: () => void;
  onHeaderReady?: (el: HTMLElement | null) => void;
};

const sanitizePrompt = (raw: string): string => {
  let t = (raw || '').trim();
  t = t.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
  t = t.replace(/\n?```\s*$/, '');
  return t.trim();
};

const OverlayApp: React.FC<OverlayAppProps> = ({ onClose, onHeaderReady }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [textIdea, setTextIdea] = useState('');
  const [a11y, setA11y] = useState<A11yState>({ largeText: false, highContrast: false, reduceMotion: false, boldText: false });
  const [ctx, setCtx] = useState<PromptContext>({});
  const [error, setError] = useState<string | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [finalOut, setFinalOut] = useState<string>('');

  const [phase, setPhase] = useState<'entry' | 'questions'>('entry');
  const [inputLocked, setInputLocked] = useState<boolean>(false);
  const [questionsCtx, setQuestionsCtx] = useState<PromptContext | null>(null);

  useEffect(() => { onHeaderReady?.(headerRef.current); }, [onHeaderReady]);

  useEffect(() => {
    if (!showFinal) return;
    const toSend = sanitizePrompt(finalOut || '');
    if (!toSend.trim()) return;
    try {
      const evt = new CustomEvent('lb:pastePrompt', { detail: { prompt: toSend } });
      window.dispatchEvent(evt);
      chrome?.storage?.local?.set?.({ lb_pending_prompt: toSend }, () => {});
    } catch {}
  }, [showFinal, finalOut]);

  const [drawOpen, setDrawOpen] = useState<boolean>(true);
  const drawGetterRef = useRef<(() => string | null) | null>(null);

  return (
    <div className={`relative min-h-full h-full w-full bg-white text-slate-700 ${a11y.largeText ? 'lb-large-text' : ''} ${a11y.highContrast ? 'lb-high-contrast' : ''} ${a11y.reduceMotion ? 'lb-reduce-motion' : ''} ${a11y.boldText ? 'font-bold' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      <div ref={headerRef} id="lb-header" className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 select-none">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-sky-600">LovaBridge Buddy</span>
          <span className="text-slate-500 hidden sm:inline">– Create something wonderful</span>
        </div>
        <div className="flex items-center gap-2">
          <button title="Close" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 text-2xl leading-none" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="lb-scroll h-[calc(100%-48px)] overflow-auto p-4 pb-8 bg-white">
        {phase === 'entry' && (
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
            <div className="flex gap-2">
              <input
                className={`flex-1 border-2 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 ${inputLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300'}`}
                placeholder="Describe your idea..."
                value={textIdea}
                disabled={inputLocked}
                data-lb-primary-focus
                onChange={(e) => setTextIdea(e.target.value)}
              />
            </div>
            {error && <p className="mt-2 text-red-600">{error}</p>}
          </div>
        )}

        {phase === 'entry' && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
            <button className="w-full flex items-center justify-between px-4 text-slate-700" onClick={() => setDrawOpen((v) => !v)}>
              <span className="font-medium">Draw your idea!</span>
              <span className="text-slate-500 text-sm">{drawOpen ? 'Hide' : 'Show'}</span>
            </button>
            {drawOpen && (
              <div className="p-4 border-t border-slate-200">
                <DrawCanvas exposeGetImage={(g) => { drawGetterRef.current = g; }} />
              </div>
            )}
          </div>
        )}

        {phase === 'entry' && !inputLocked && (
          <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50">
            <button
              className={`px-8 py-2 rounded-full shadow-lg ${!textIdea.trim() ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
              disabled={!textIdea.trim()}
              onClick={async () => {
                if (!textIdea.trim()) return;
                let nextCtx: PromptContext = { ...ctx, base_idea: textIdea };
                const drawUrl = drawGetterRef.current?.();
                if (drawUrl) {
                  const img = new Image();
                  img.onerror = () => console.error('OverlayApp: Drawing image is invalid!');
                  img.src = drawUrl;
                  
                  try {
                    const drawCtx = await analyzeDrawing(drawUrl);
                    nextCtx = { ...nextCtx, ...drawCtx };
                  } catch (e) {
                  }
                }
                setCtx(nextCtx);
                setQuestionsCtx(nextCtx);
                setInputLocked(true);
                setPhase('questions');
              }}
            >Submit</button>
          </div>
        )}

        {phase === 'questions' && questionsCtx && (
          <div className="mt-4">
            <QuestionsFlow
              initialContext={questionsCtx}
              drawingImage={drawGetterRef.current?.() || null}
              onFinal={(finalText, finalContext) => {
                setFinalOut(finalText);
                setCtx(finalContext);
                setShowFinal(true);
              }}
              onError={(msg) => setError(msg)}
            />
          </div>
        )}

        {showFinal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowFinal(false)}>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-[90%] text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Your website is being built!</h3>
              <p className="text-slate-600">Let’s see it in action!!</p>
              <div className="text-center mt-4">
                <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl" onClick={() => setShowFinal(false)}>OK</button>
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