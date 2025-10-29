import React, { createContext, useContext, useMemo } from 'react';
import { useToast } from '../components/Toast';

type NotifType = 'info' | 'success' | 'error';
type NotifOpts = { type?: NotifType; duration?: number; action?: { label: string; onPress: () => void } };
type Ctx = { show: (message: string, opts?: NotifOpts) => void };

const C = createContext<Ctx | null>(null);

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const value = useMemo<Ctx>(() => ({
    show: (message, opts) => toast.show(message, opts),
  }), [toast]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useNotif() {
  const v = useContext(C);
  if (!v) throw new Error('useNotif must be used within <NotifProvider>');
  return v;
}
