import React, { useState } from 'react';
import { extractOrdersFromPdf } from './services/geminiService';
import { ExtractedFileResult, ProcessingStatus } from './types';
import UploadZone from './components/UploadZone';
import ResultsTable from './components/ResultsTable';
import { Activity, FileCheck, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [results, setResults] = useState<ExtractedFileResult[]>([]);
  const [progress, setProgress] = useState<string>("");

  const handleFilesSelected = async (files: File[]) => {
    setStatus(ProcessingStatus.PROCESSING);
    setResults([]); // Reset previous results

    const newResults: ExtractedFileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Analisando arquivo ${i + 1} de ${files.length}: ${file.name}...`);
      
      try {
        const orders = await extractOrdersFromPdf(file);
        newResults.push({
          fileName: file.name,
          status: 'success',
          orders: orders
        });
      } catch (error) {
        newResults.push({
          fileName: file.name,
          status: 'error',
          orders: [],
          errorMessage: 'Falha ao processar PDF'
        });
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    setResults(newResults);
    setStatus(ProcessingStatus.COMPLETED);
    setProgress("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-2 rounded-lg">
                <ShieldAlert className="text-white h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Order<span className="text-brand-600">Audit</span> AI
              </h1>
            </div>
            <div className="text-sm text-gray-500 hidden sm:block">
              Extração Inteligente de Falhas em Pedidos
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Importar Relatórios</h2>
          <p className="text-gray-600">
            Faça upload das páginas web impressas em PDF. O sistema irá identificar automaticamente pedidos com erros, extrair datas, nomes e números de pedido.
          </p>
        </div>

        {/* Upload Section */}
        <UploadZone 
          onFilesSelected={handleFilesSelected} 
          isProcessing={status === ProcessingStatus.PROCESSING} 
        />

        {/* Processing Indicator */}
        {status === ProcessingStatus.PROCESSING && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center gap-3 animate-pulse">
            <Activity className="text-brand-600 animate-spin" />
            <span className="text-brand-700 font-medium">{progress}</span>
          </div>
        )}

        {/* Results Section */}
        {status === ProcessingStatus.COMPLETED && (
          <ResultsTable results={results} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            Powered by Gemini AI • Processamento Seguro
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
