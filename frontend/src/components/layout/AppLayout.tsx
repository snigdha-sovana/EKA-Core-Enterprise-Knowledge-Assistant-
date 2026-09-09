import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { EkaFloatingLauncher } from '../eka/EkaFloatingLauncher';
import { EkaChatPanel } from '../eka/EkaChatPanel';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ekaFloatingOpen } = useApp();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Floating EKA Assistant launcher & Slide-over panel */}
      <EkaFloatingLauncher />
      {ekaFloatingOpen && <EkaChatPanel isFullPage={false} />}
    </div>
  );
};
