import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ReconciliationResults from './components/ReconciliationResults';
import { ReconciliationData } from './types';

function App() {
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReconciliationComplete = (data: ReconciliationData) => {
    setReconciliationData(data);
    setError(null);
  };

  const handleError = (errorMessage: string | null) => {
    setError(errorMessage);
    setReconciliationData(null);
  };

  const handleLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const handleReset = () => {
    setReconciliationData(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📊 Logistics Reconciliation Tool</h1>
        <p>Upload your Sales Order and Purchase Order files to perform reconciliation</p>
      </header>

      <main className="app-main">
        {!reconciliationData ? (
          <FileUpload
            onReconciliationComplete={handleReconciliationComplete}
            onError={handleError}
            onLoading={handleLoading}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <ReconciliationResults
            data={reconciliationData}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React & Node.js • Excel file processing powered by SheetJS</p>
      </footer>
    </div>
  );
}

export default App;