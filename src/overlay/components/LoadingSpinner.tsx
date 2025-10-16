import React from 'react';

interface Props {
  message?: string;
}

export default function LoadingSpinner({ message = 'Thinking...' }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="relative">
        <div className="w-6 h-6 border-2 border-sky-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <span className="text-slate-600 text-sm font-medium">{message}</span>
    </div>
  );
}
