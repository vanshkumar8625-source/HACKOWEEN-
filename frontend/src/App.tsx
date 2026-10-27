import { useState } from 'react';
import LandingPage from './pages/Landing';
import Dashboard from './pages/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>('landing');

  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        {currentPage === 'landing' ? (
          <LandingPage onLaunch={() => setCurrentPage('dashboard')} />
        ) : (
          <Dashboard />
        )}
      </ErrorBoundary>
    </div>
  );
}

export default App;
