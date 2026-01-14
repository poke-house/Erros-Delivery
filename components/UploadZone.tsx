import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (file: File) => file.type === 'application/pdf'
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      } else {
        alert("Por favor, envie apenas arquivos PDF.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter(
        (file: File) => file.type === 'application/pdf'
      );
      onFilesSelected(validFiles);
    }
  };

  const handleClick = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300
        ${isDragging 
          ? 'border-brand-500 bg-brand-50' 
          : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        accept="application/pdf"
        multiple
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-brand-100' : 'bg-gray-100'}`}>
          <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-brand-600' : 'text-gray-500'}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            {isProcessing ? 'Processando arquivos...' : 'Clique ou arraste seus PDFs aqui'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Suporta múltiplos arquivos PDF (Páginas Web Impressas)
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;