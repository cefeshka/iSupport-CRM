import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

console.log('Main.tsx: Starting application...');
console.log('Main.tsx: Environment variables:', {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

const rootElement = document.getElementById('root');
console.log('Main.tsx: Root element found:', !!rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  console.log('Main.tsx: Application rendered successfully');
} else {
  console.error('Main.tsx: Root element not found!');
}
