import React, { useCallback, useMemo, useRef, useState } from 'react';
import TutorialOverlay from './TutorialOverlay';
import DrawCanvas from './DrawCanvas';

type TutorialFlowProps = {
  onClose: () => void;
};

type TutorialStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const stepText = (s: TutorialStepId): string => (
  s === 1 ? 'Hi! i’m your website buddy. In a few clicks, we’ll turn your idea into a real website.' :
  s === 2 ? 'You can draw your idea or type it. We’ll try drawing first!' :
  s === 3 ? 'Sketch what you want on your homepage — maybe a big title, a picture, buttons. Use colors to draw out your imagination and use the eraser to fix oopsies.' :
  s === 4 ? 'Pen tool: Draw lines and outlines. Try it now!' :
  s === 5 ? 'Eraser: Remove parts you don’t want. Give it a try.' :
  s === 6 ? 'Fill tool: Use the paint bucket to color areas quickly.' :
  s === 7 ? 'Saved drawings show in the gallery below the draw canvas — click a drawing to edit it, or delete it.' :
  s === 8 ? 'Now describe the vibe in a few words or sentences. Press Enter or Continue to proceed.' :
  'Grea work! Let’s build it.'
);

const stepHelper = (_s: TutorialStepId): string | undefined => undefined;

const TutorialFlow: React.FC<TutorialFlowProps> = ({ onClose }) => {
  const [step, setStep] = useState<TutorialStepId>(1);
  const [showDraw, setShowDraw] = useState<boolean>(false);
  const [idea, setIdea] = useState<string>('');
  const getImageRef = useRef<(() => string | null) | null>(null);

  const text = useMemo(() => stepText(step), [step]);
  const helper = useMemo(() => stepHelper(step), [step]);

  const handleNext = useCallback(() => {
    setStep(prev => {
      if (prev === 1) return 2;
      if (prev === 2) { setShowDraw(true); return 3; }
      if (prev === 3) { window.dispatchEvent(new CustomEvent('lb:tutorialHighlight', { detail: { tool: 'pen' } })); return 4; }
      if (prev === 4) { window.dispatchEvent(new CustomEvent('lb:tutorialHighlight', { detail: { tool: 'eraser' } })); return 5; }
      if (prev === 5) { window.dispatchEvent(new CustomEvent('lb:tutorialHighlight', { detail: { tool: 'bucket' } })); return 6; }
      if (prev === 6) { window.dispatchEvent(new CustomEvent('lb:tutorialHighlight', { detail: { tool: 'save' } })); return 7; }
      if (prev === 7) { window.dispatchEvent(new CustomEvent('lb:tutorialHighlightClear')); return 8; }
      if (prev < 8) return ((prev + 1) as TutorialStepId);
      return prev;
    });
  }, []);

  const handleBack = useCallback(() => {
    setStep(prev => (prev > 1 ? ((prev - 1) as TutorialStepId) : prev));
  }, []);

  const handleCta = useCallback(() => {
    setStep(prev => {
      if (prev === 1) return 2;
      if (prev === 2) { setShowDraw(true); return 3; }
      if (prev === 5) return 6;
      if (prev === 8) { onClose(); }
      return prev;
    });
  }, [onClose]);

  const submitIdea = useCallback(() => {
    const trimmed = (idea || '').trim();
    if (!trimmed) return;
    try {
      const drawUrl = getImageRef.current?.() || null;
      const evt = new CustomEvent('lb:tutorialSubmit', { detail: { idea: trimmed, drawUrl } });
      window.dispatchEvent(evt);
    } catch {}
  }, [idea]);

  return (
    <div className="relative h-full w-full">
      {/* Reserve space on the right for the tutorial sidebar to avoid overlap */}
      <div className="h-full w-full overflow-auto p-4 pr-84">
        {step === 1 && !showDraw && (
          <div className="h-full w-full flex items-center justify-center text-slate-500 select-none">
            Follow the tutorial window.
          </div>
        )}
        {showDraw && step < 8 && (
          <div className="border rounded-xl">
            <DrawCanvas exposeGetImage={(g) => { getImageRef.current = g; }} />
          </div>
        )}
        {step === 8 && (
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 mt-2">
            <div className="flex gap-2">
              <input
                className="flex-1 border-2 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-700 border-slate-300"
                placeholder="Describe your idea..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitIdea(); } }}
              />
            </div>
          </div>
        )}
        {step === 7 && (
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 mt-2 text-slate-600 text-sm">
            Click any of the saved images above to edit them. You also have the option to delete a drawing.
          </div>
        )}
        
        
      </div>

      <TutorialOverlay
        visible
        step={step}
        text={text}
        helper={helper}
        ctaLabel={step === 1 ? 'Let’s start' : step === 2 ? 'Open the canvas' : step === 8 ? 'Continue' : undefined}
        onCta={step === 8 ? submitIdea : (step === 1 || step === 2) ? handleCta : undefined}
        onNext={handleNext}
        onBack={handleBack}
      />
    </div>
  );
};

export default TutorialFlow;


