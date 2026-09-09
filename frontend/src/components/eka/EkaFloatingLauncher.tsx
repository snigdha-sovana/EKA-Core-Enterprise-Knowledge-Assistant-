import React from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EkaFloatingLauncher: React.FC = () => {
  const { ekaFloatingOpen, setEkaFloatingOpen } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setEkaFloatingOpen(!ekaFloatingOpen)}
        className="group relative flex items-center gap-2.5 bg-gradient-to-r from-eka-600 to-indigo-600 hover:from-eka-700 hover:to-indigo-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-eka-glow transition-all duration-300 transform hover:-translate-y-0.5"
        title="Open EKA AI Assistant"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse"></span>
        <Sparkles className="w-5 h-5 text-white animate-bounce" />
        <span className="text-xs font-bold tracking-wide pr-1">Ask EKA</span>
      </button>
    </div>
  );
};
