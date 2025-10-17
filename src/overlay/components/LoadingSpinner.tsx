import React from 'react';
import AnimCycle from './AnimCycle';

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = 'Thinking...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <AnimCycle />
      <span className="text-slate-600 text-sm font-medium">{message}</span>
    </div>
  );
}
