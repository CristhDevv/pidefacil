'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { LoginModal } from '@/components/LoginModal';
import { InstallPwaPrompt } from '@/components/InstallPwaPrompt';

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
      <LoginModal />
      <InstallPwaPrompt />
    </AuthProvider>
  );
};
