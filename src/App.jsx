import React from 'react';
import Dashboard from './components/Dashboard';

/**
 * Main App root layout (Plain JSX)
 */
export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-250">
      <Dashboard />
    </div>
  );
}
