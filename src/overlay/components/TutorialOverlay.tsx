import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  visible: boolean;
  step: number;
  text?: string;
  imageSrc?: string;
  onNext?: () => void;
  onBack?: () => void;
  ctaLabel?: string;
  onCta?: () => void;
  helper?: string;
};

export default function TutorialOverlay({ visible, step, text, imageSrc, onNext, onBack, ctaLabel, onCta, helper }: Props) {
  if (!visible) return null;
  const fullText = text || 'This is a quick tutorial!';
  const avatarSrc = useMemo(() => {
    if (imageSrc) return imageSrc;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL('avatarimages/defaultavatar.png');
      }
    } catch {}
    return '/avatarimages/defaultavatar.png';
  }, [imageSrc]);

  // simple typing animation for the main text
  const [typed, setTyped] = useState('');
  useEffect(() => {
    setTyped('');
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) window.clearInterval(iv);
    }, 14);
    return () => window.clearInterval(iv);
  }, [fullText, step]);

  const TypingText: React.FC<{ text: string }> = ({ text }) => (
    <>
      {typed}
      {typed.length < text.length ? <span className="inline-block align-middle ml-0.5 h-4 w-[2px] bg-white animate-pulse" /> : null}
    </>
  );

  const TypingTextHelp: React.FC<{ text: string }> = ({ text }) => {
    const [h, setH] = useState('');
    useEffect(() => {
      setH('');
      let i = 0; const iv = window.setInterval(() => { i += 1; setH(text.slice(0, i)); if (i >= text.length) window.clearInterval(iv); }, 18);
      return () => window.clearInterval(iv);
    }, [text, step]);
    return <>{h}{h.length < text.length ? <span className="inline-block align-middle ml-0.5 h-3 w-[2px] bg-white/80 animate-pulse" /> : null}</>;
  };

  const typingDone = typed.length >= fullText.length;

  return (
    <>
      <style>
        {`@keyframes lbFloatY{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}`}
      </style>
      <div className="fixed right-0 top-16 bottom-6 w-80 z-[99999999] pointer-events-auto bg-sky-100 border-l border-slate-200 shadow-xl rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-sky-100">
          <div className="text-sm font-semibold text-slate-700">Tutorial</div>
          <div className="text-xs text-slate-500">Step {step}</div>
        </div>
        <div className="relative flex-1 overflow-hidden bg-sky-100">
          <div className="absolute inset-0 px-4 py-5 flex items-center justify-center gap-4">
            <div className="relative max-w-[260px] w-full">
              <div className="w-full rounded-2xl border border-sky-700 bg-sky-600 shadow p-3 text-white text-sm leading-snug">
                <div className="whitespace-pre-wrap">
                  <TypingText text={fullText} />
                </div>
                {/* helper merged into main text for single paragraph on drawing step */}
              </div>
              <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-sky-600 border-t border-r border-sky-700" />
            </div>
            <img
              src={avatarSrc}
              alt="Guide"
              className="w-32 h-32 rounded-full border border-slate-200 shadow-md"
              style={{ animation: 'lbFloatY 1.8s ease-in-out infinite alternate' }}
            />
          </div>
        </div>
        <div className="p-3 border-t border-slate-200 flex items-center justify-end bg-sky-100">
          <button className={`px-3 py-1.5 rounded-md ${typingDone ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`} disabled={!typingDone} onClick={() => { if (!typingDone) return; if (onCta) { onCta(); } else { onNext?.(); } }}>{ctaLabel || 'Next'}</button>
        </div>
      </div>
    </>
  );
}