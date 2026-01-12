'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface CopilotContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  openCopilot: () => void;
  closeCopilot: () => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);

  return (
    <CopilotContext.Provider value={{ isOpen, setIsOpen, openCopilot, closeCopilot }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
}