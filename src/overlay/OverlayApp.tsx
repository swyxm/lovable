import React, { useEffect, useRef, useState } from 'react';
import A11yMenu, { A11yState } from './components/A11yMenu';
import DrawCanvas from './components/DrawCanvas';
import QuestionsFlow from './components/QuestionsFlow';
import LoadingSpinner from './components/LoadingSpinner';
import { PromptContext, analyzeDrawing, finalPrompt } from '../ai/llm';
import { speakText, createAudioButton, stopCurrentAudio } from '../ai/tts';
import { WebsiteReadinessDetector, quickReadinessCheck } from '../content/websiteReadinessDetector';
import { extractIframeDOM } from '../content/domUtils';


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

const generateImprovementPrompt = async (originalPrompt: string, userImprovement: string, drawingImage?: string, currentDOM?: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:8787/conversation/improvement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalPrompt, userImprovement, drawingImage, currentDOM })
    });
    const data = await response.json();
    return data.prompt || '';
  } catch (error) {
    console.error('Failed to generate improvement prompt:', error);
    throw error;
  }
};

const OverlayApp: React.FC<OverlayAppProps> = ({ onClose, onHeaderReady }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [textIdea, setTextIdea] = useState('');
  const [a11y, setA11y] = useState<A11yState>({ largeText: false, highContrast: false, boldText: false, textToSpeech: false, ttsVoice: 'Fenrir' });
  const [ctx, setCtx] = useState<PromptContext>({});
  const [error, setError] = useState<string | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [finalOut, setFinalOut] = useState<string>('');

  const [phase, setPhase] = useState<'entry' | 'questions' | 'building' | 'improvement'>('entry');
  const [inputLocked, setInputLocked] = useState<boolean>(false);
  const [questionsCtx, setQuestionsCtx] = useState<PromptContext | null>(null);
  const [finalContext, setFinalContext] = useState<PromptContext | null>(null);
  const [readinessDetector, setReadinessDetector] = useState<WebsiteReadinessDetector | null>(null);
  const [readinessStatus, setReadinessStatus] = useState<string>('');
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [originalPrompt, setOriginalPrompt] = useState<string>('');
  const [improvementDetector, setImprovementDetector] = useState<WebsiteReadinessDetector | null>(null);

  useEffect(() => { onHeaderReady?.(headerRef.current); }, [onHeaderReady]);

  useEffect(() => {
    if (!a11y.textToSpeech) {
      stopCurrentAudio();
    }
  }, [a11y.textToSpeech, a11y.ttsVoice]);

  useEffect(() => {
    if (!showFinal) return;
    const toSend = sanitizePrompt(finalOut || '');
    if (!toSend.trim()) return;
    try {
      setOriginalPrompt(toSend); 
      const evt = new CustomEvent('lb:pastePrompt', { detail: { prompt: toSend } });
      window.dispatchEvent(evt);
      chrome?.storage?.local?.set?.({ lb_pending_prompt: toSend }, () => {});
      setPhase('building');
    } catch {}
  }, [showFinal, finalOut]);

  useEffect(() => {
    if (phase === 'building' && !readinessDetector && !improvementDetector && !manualOverride) {
      // Determine if this is initial creation or improvement based on whether we have an original prompt
      const isImprovement = !!originalPrompt;
      
      setReadinessStatus(isImprovement ? 'Applying improvements...' : 'Detecting website readiness...');
      
      const detector = new WebsiteReadinessDetector();
      
      if (isImprovement) {
        setImprovementDetector(detector);
      } else {
        setReadinessDetector(detector);
      }
      
      detector.detectReadiness().then((result) => {
        if (result.isReady) {
          if (isImprovement) {
            setReadinessStatus('Improvements applied!');
            setPhase('improvement'); // Back to improvement phase for next round
          } else {
            setReadinessStatus('Website is ready!');
            setPhase('improvement');
          }
        } else {
          setReadinessStatus(`Detection completed: ${result.details || 'Not ready'}`);
        }
        
        if (isImprovement) {
          setImprovementDetector(null);
        } else {
          setReadinessDetector(null);
        }
      }).catch((error) => {
        console.error('Readiness detection failed:', error);
        setReadinessStatus('Detection failed');
        
        if (isImprovement) {
          setImprovementDetector(null);
        } else {
          setReadinessDetector(null);
        }
      });
    }
    
    if (phase !== 'building') {
      if (readinessDetector) {
        readinessDetector.stop();
        setReadinessDetector(null);
      }
      if (improvementDetector) {
        improvementDetector.stop();
        setImprovementDetector(null);
      }
      setReadinessStatus('');
    }
    
    if (phase === 'improvement') {
      setInputLocked(false);
    }
  }, [phase, manualOverride, readinessDetector, improvementDetector]); 

  useEffect(() => {
    return () => {
      if (readinessDetector) {
        readinessDetector.stop();
      }
      if (improvementDetector) {
        improvementDetector.stop();
      }
    };
  }, [readinessDetector, improvementDetector]);

  const [drawOpen, setDrawOpen] = useState<boolean>(true);
  const drawGetterRef = useRef<(() => string | null) | null>(null);

  return (
    <div className={`relative min-h-full h-full w-full bg-white text-slate-700 ${a11y.largeText ? 'lb-large-text' : ''} ${a11y.highContrast ? 'lb-high-contrast' : ''} ${a11y.boldText ? 'font-bold' : ''}`} style={{ position: 'absolute', inset: 0 }}>
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
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-slate-800">Describe your idea</h3>
              {createAudioButton("Describe your idea", a11y.ttsVoice)}
            </div>
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
              <div className="flex items-center gap-2">
                <span className="font-medium">Draw your idea!</span>
                {createAudioButton("Draw your idea!", a11y.ttsVoice)}
              </div>
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
              ttsEnabled={a11y.textToSpeech}
              ttsVoice={a11y.ttsVoice}
              onFinal={(finalText, finalCtx) => {
                setFinalOut(finalText);
                setCtx(finalCtx);
                setFinalContext(finalCtx);
                setShowFinal(true);
              }}
              onError={(msg) => setError(msg)}
            />
          </div>
        )}

        {phase === 'building' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-[90%] text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                {improvementDetector ? 'Applying Improvements!' : 'Great! Your website is now being built!'}
              </h3>
              <div className="flex justify-center mb-4">
                <LoadingSpinner />
              </div>
              <p className="text-slate-600 mb-4">
                {improvementDetector ? 'Please wait while I apply your improvements...' : 'Please wait while I create your website...'}
              </p>
            </div>
          </div>
        )}

        {phase === 'improvement' && finalContext && (
          <div className="mt-4">
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-slate-800">Make Improvements</h3>
                {createAudioButton("Make Improvements", a11y.ttsVoice)}
              </div>
              <p className="text-slate-600 mb-4">Your website is ready! Describe what you'd like to change or improve.</p>
              
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 border-2 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-700 border-slate-300"
                  placeholder="Describe improvements you'd like to make..."
                  value={textIdea}
                  onChange={(e) => setTextIdea(e.target.value)}
                  disabled={inputLocked}
                />
                <button
                  className={`px-6 py-2 rounded-xl ${!textIdea.trim() || inputLocked ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                  disabled={!textIdea.trim() || inputLocked}
                  onClick={async () => {
                    if (!textIdea.trim() || !originalPrompt) return;
                    
                    setInputLocked(true);
                    setError(null);
                    
                    try {
                      const currentDOM = extractIframeDOM();
                      
                      const drawUrl = drawGetterRef.current?.();
                      
                      const improvementPrompt = await generateImprovementPrompt(
                        originalPrompt,
                        textIdea,
                        drawUrl || undefined,
                        currentDOM || undefined
                      );
                      
                      const toSend = sanitizePrompt(improvementPrompt);
                      
                      const evt = new CustomEvent('lb:pastePrompt', { detail: { prompt: toSend } });
                      window.dispatchEvent(evt);
                      chrome?.storage?.local?.set?.({ lb_pending_prompt: toSend }, () => {});
                      
                      setPhase('building');
                      setTextIdea('');
                      
                    } catch (e) {
                      setError('Failed to generate improvement prompt');
                    } finally {
                      setInputLocked(false);
                    }
                  }}
                >
                  {inputLocked ? 'Applying...' : 'Apply'}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                <button className="w-full flex items-center justify-between px-4 text-slate-700" onClick={() => setDrawOpen((v) => !v)}>
                  <span className="font-medium">Draw additional improvements</span>
                  <span className="text-slate-500 text-sm">{drawOpen ? 'Hide' : 'Show'}</span>
                </button>
                {drawOpen && (
                  <div className="p-4 border-t border-slate-200">
                    <DrawCanvas exposeGetImage={(g) => { drawGetterRef.current = g; }} />
                  </div>
                )}
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