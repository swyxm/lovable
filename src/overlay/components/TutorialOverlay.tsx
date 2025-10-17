import React from 'react';

type Props = {
  visible: boolean;
  step: number;
  text?: string;
  imageSrc?: string;
  onNext?: () => void;
};

export default function TutorialOverlay({ visible, step, text, imageSrc, onNext }: Props) {
  const fullText = text || 'This is a quick tutorial! Use the tools above to draw, pick colors, or add shapes.';
  const [typed, setTyped] = React.useState<string>('');
  const [bubbleHeight, setBubbleHeight] = React.useState<number | null>(null);
  const sizerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    // Measure full height first so the bubble does not grow while typing
    requestAnimationFrame(() => {
      const el = sizerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setBubbleHeight(rect.height);
      }
    });
    setTyped('');
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(interval);
      }
    }, 24);
    return () => window.clearInterval(interval);
  }, [fullText, visible, step]);

  if (!visible) return null;
  const isTyping = typed.length < fullText.length;
  const defaultCircle = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#ef4444"/></svg>');
  const characterSrc = imageSrc || defaultCircle;

  return (
    <div className="fixed bottom-4 right-4 z-[2147483646] flex items-end gap-3">
      {/* Hidden sizer to lock bubble size */}
      <div className="fixed -z-10 opacity-0 pointer-events-none w-72">
        <div ref={sizerRef} className="rounded-2xl border border-sky-700 bg-sky-600 shadow-xl p-3">
          <div className="text-xs font-semibold text-sky-100 mb-1">Step {step}</div>
          <div className="text-white text-sm leading-snug">{fullText}</div>
          <div className="mt-2 flex justify-end">
            <span className="inline-block px-2 py-1 text-xs rounded-md border border-white/50 bg-white/90 text-sky-700">Next</span>
          </div>
        </div>
      </div>

      <div className="w-72 rounded-2xl border border-sky-700 bg-sky-600 shadow-xl p-3 flex flex-col" style={{ height: bubbleHeight || undefined }}>
        <div className="text-xs font-semibold text-sky-100 mb-1">Step {step}</div>
        <div className="text-white text-sm leading-snug flex-1">
          {typed}
          {isTyping && <span className="inline-block align-middle ml-0.5 h-4 w-[2px] bg-white animate-pulse" />}
        </div>
        <div className="pt-2 flex justify-end">
          <button
            className="px-2 py-1 text-xs rounded-md border border-white/60 bg-white text-sky-700 hover:bg-sky-50"
            onClick={onNext}
          >
            Next
          </button>
        </div>
      </div>

      <div className="relative">
        <style>{'@keyframes lbFloat{0%{transform:translateY(0)}100%{transform:translateY(-6px)}}'}</style>
        <img
          src={characterSrc}
          alt="tutorial character"
          className="w-12 h-12 object-contain drop-shadow-lg"
          style={{ animation: 'lbFloat 4s ease-in-out infinite alternate' }}
        />
      </div>
    </div>
  );
}


