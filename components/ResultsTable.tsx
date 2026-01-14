import React, { useState, useMemo } from 'react';
import { ExtractedFileResult } from '../types';
import { AlertCircle, CheckCircle2, FileText, Clock, User, Hash, Store, Calendar, Filter, X, Download, BarChart3 } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ResultsTableProps {
  results: ExtractedFileResult[];
}

interface RestaurantStats {
  [key: string]: number;
  total: number;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  // Memoize allOrders calculation to avoid recalculating on every render unless results change
  const allOrders = useMemo(() => {
    if (results.length === 0) return [];
    return results.flatMap(r => 
      r.orders.map(o => ({ ...o, sourceFile: r.fileName }))
    );
  }, [results]);

  if (results.length === 0) return null;

  // Extract unique restaurant names for the filter
  const uniqueRestaurants = useMemo(() => {
    const names = Array.from(new Set(allOrders.map(o => o.restaurantName)));
    return names.sort();
  }, [allOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    if (selectedRestaurants.length === 0) return allOrders;
    return allOrders.filter(o => selectedRestaurants.includes(o.restaurantName));
  }, [allOrders, selectedRestaurants]);

  // Aggregation Logic for Summary Table
  const summaryStats = useMemo(() => {
    const stats: Record<string, RestaurantStats> = {};
    const detectedPlatforms = new Set<string>();

    // Initialize stats for all visible restaurants to ensure they appear even with 0 orders if filtered differently
    const restaurantsToTrack = selectedRestaurants.length > 0 ? selectedRestaurants : uniqueRestaurants;
    
    // First pass: scan for platforms involved in current view
    filteredOrders.forEach(o => detectedPlatforms.add(o.platform));
    
    // Sort platforms (standardize order: Uber, Glovo, Bolt, others)
    const priority = ['Uber Eats', 'Glovo', 'Bolt'];
    const sortedPlatforms = Array.from(detectedPlatforms).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Populate counts
    filteredOrders.forEach(order => {
      const rest = order.restaurantName;
      const plat = order.platform;

      if (!stats[rest]) {
        stats[rest] = { total: 0 };
        sortedPlatforms.forEach(p => stats[rest][p] = 0);
      }
      
      if (stats[rest][plat] === undefined) stats[rest][plat] = 0;
      stats[rest][plat]++;
      stats[rest].total++;
    });

    return { stats, platforms: sortedPlatforms };
  }, [filteredOrders, uniqueRestaurants, selectedRestaurants]);

  const toggleRestaurant = (name: string) => {
    setSelectedRestaurants(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name) 
        : [...prev, name]
    );
  };

  const getPlatformStyle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('uber')) return 'bg-black text-white';
    if (p.includes('glovo')) return 'bg-yellow-100 text-yellow-800';
    if (p.includes('bolt')) return 'bg-green-500 text-white';
    return 'bg-gray-100 text-gray-800';
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text("Relatório de Pedidos Extraídos", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    doc.text(`Gerado em: ${dateStr}`, 14, 30);
    
    if (selectedRestaurants.length > 0) {
        doc.text(`Filtro: ${selectedRestaurants.join(", ")}`, 14, 36);
    }

    // Main Table Data
    const tableBody = filteredOrders.map(order => [
        order.platform,
        order.orderNumber,
        order.restaurantName,
        order.date,
        order.time,
        order.customerName || 'N/A'
    ]);

    // Generate Main Table
    autoTable(doc, {
        head: [['Plataforma', 'Pedido', 'Restaurante', 'Data', 'Horário', 'Cliente']],
        body: tableBody,
        startY: 40,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [2, 132, 199] }, // brand-600
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Summary Table Data
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumo por Restaurante", 14, finalY + 15);

    const summaryHead = [['Restaurante', ...summaryStats.platforms, 'Total']];
    const summaryBody = Object.entries(summaryStats.stats).map(([restName, data]) => {
        const stats = data as RestaurantStats;
        const row = [restName];
        summaryStats.platforms.forEach(p => row.push(String(stats[p] || 0)));
        row.push(String(stats.total));
        return row;
    });

    autoTable(doc, {
        head: summaryHead,
        body: summaryBody,
        startY: finalY + 20,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [55, 65, 81] }, // gray-700
        theme: 'grid'
    });

    doc.save(`Relatorio_Pedidos_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Arquivos Analisados</p>
            <p className="text-2xl font-bold text-gray-900">{results.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-full">
            <Hash size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total de Pedidos</p>
            <div className="flex items-baseline gap-2">
               <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
               {selectedRestaurants.length > 0 && (
                 <span className="text-sm text-gray-400">de {allOrders.length}</span>
               )}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Status da IA</p>
            <p className="text-lg font-bold text-gray-900">Operacional</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header with Filter and Download */}
        <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">Relatório de Pedidos Extraídos</h2>
            <span className="text-xs text-gray-500">
              Mostrando campos: ID, Restaurante, Data, Horário, Cliente
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {/* Filter UI */}
              {uniqueRestaurants.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mr-2">
                        <Filter size={16} />
                        <span>Filtro:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueRestaurants.map(restaurant => {
                            const isSelected = selectedRestaurants.includes(restaurant);
                            return (
                                <button
                                    key={restaurant}
                                    onClick={() => toggleRestaurant(restaurant)}
                                    className={`
                                        px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                                        ${isSelected 
                                            ? 'bg-brand-100 text-brand-700 border-brand-200' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                    `}
                                >
                                    {restaurant}
                                </button>
                            )
                        })}
                        {selectedRestaurants.length > 0 && (
                            <button 
                                onClick={() => setSelectedRestaurants([])}
                                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                title="Limpar filtros"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
              )}

              {/* Download Button */}
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
              >
                <Download size={16} />
                Download PDF
              </button>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-4">Plataforma</th>
                <th className="px-6 py-4">Pedido #</th>
                <th className="px-6 py-4">Restaurante</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Horário</th>
                <th className="px-6 py-4">Nome do Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, idx) => (
                  <tr key={`${order.orderNumber}-${idx}`} className="hover:bg-gray-50 transition-colors">
                     <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformStyle(order.platform)}`}>
                        {order.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-gray-400" />
                        {order.restaurantName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {order.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        {order.time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className={!order.customerName || order.customerName === 'N/A' ? 'text-gray-400 italic' : 'text-gray-700 font-medium'}>
                          {order.customerName || 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {allOrders.length > 0 
                        ? "Nenhum pedido encontrado para os filtros selecionados." 
                        : "Nenhum pedido encontrado nos documentos analisados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aggregated Stats Table */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 className="text-gray-500" size={20} />
            <h2 className="text-xl font-bold text-gray-800">Resumo por Restaurante e Plataforma</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Restaurante</th>
                  {summaryStats.platforms.map(p => (
                    <th key={p} className="px-6 py-4 text-center">{p}</th>
                  ))}
                  <th className="px-6 py-4 text-center font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(summaryStats.stats).map(([restaurant, stats]) => {
                  const statsData = stats as RestaurantStats;
                  return (
                  <tr key={restaurant} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{restaurant}</td>
                    {summaryStats.platforms.map(p => (
                      <td key={p} className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded-md ${statsData[p] > 0 ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-300'}`}>
                          {statsData[p] || 0}
                        </span>
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-brand-50 text-brand-700 font-bold rounded-md">
                        {statsData.total}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;