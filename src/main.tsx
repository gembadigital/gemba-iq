import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import RootApp from './RootApp.tsx';
import './index.css';
import { LanguageProvider } from './lib/LanguageContext';
import { AuthProvider } from './lib/AuthContext';
import AppErrorBoundary from './components/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <RootApp />
        </LanguageProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
