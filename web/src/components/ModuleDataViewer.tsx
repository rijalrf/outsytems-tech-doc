import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ArrowLeft, 
  Cpu, 
  Loader2, 
  AlertCircle,
  FileJson
} from 'lucide-react';
import type { ModuleSummary } from '../types/api';
import { api } from '../services/api';

interface ModuleDataViewerProps {
  module: ModuleSummary;
  onBackToModules: () => void;
}

export const ModuleDataViewer: React.FC<ModuleDataViewerProps> = ({
  module,
  onBackToModules,
}) => {
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string>('all');

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getModuleData(module.id);
        setRawData(data);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat respon data mentah modul');
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [module.id]);

  const handleCopy = () => {
    if (!rawData) return;
    const contentToCopy = selectedSection === 'all' 
      ? JSON.stringify(rawData, null, 2) 
      : JSON.stringify(rawData[selectedSection] ?? {}, null, 2);
    
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!rawData) return;
    const content = selectedSection === 'all'
      ? JSON.stringify(rawData, null, 2)
      : JSON.stringify(rawData[selectedSection] ?? {}, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module.module_name}_${selectedSection}_raw.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Available sections extracted from OutSystems JSON
  const availableSections = ['all'];
  if (rawData && typeof rawData === 'object') {
    Object.keys(rawData).forEach((key) => {
      if (key !== 'Key' && key !== 'Name') {
        availableSections.push(key);
      }
    });
  }

  const getDisplayedData = () => {
    if (!rawData) return null;
    if (selectedSection === 'all') return rawData;
    return rawData[selectedSection] ?? { message: `Section '${selectedSection}' tidak memiliki data.` };
  };

  const formattedJsonString = rawData ? JSON.stringify(getDisplayedData(), null, 2) : '';

  return (
    <div className="space-y-6">
      
      {/* Top Header & Breadcrumb Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToModules}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary transition-colors bg-surface px-4 py-2 rounded-pill border border-outline w-fit shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Kembali ke Modul {module.module_name}</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleCopy}
            disabled={!rawData || loading}
            className="h-10 px-4 rounded-pill bg-surface hover:bg-surface-soft border border-outline text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Salin Raw JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!rawData || loading}
            className="h-10 px-4 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Module Overview Card */}
      <div className="bg-surface rounded-card-lg border border-outline p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-on-background">{module.module_name}</h2>
              {module.module_suffix && (
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-primary-strong">
                  _{module.module_suffix}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              ESpace Key: {module.espace_key || 'N/A'} • Module ID: {module.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-pill bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            Status: {module.status || 'PARSED'}
          </span>
        </div>
      </div>

      {/* Main Terminal / Dark Raw JSON Panel */}
      <div 
        className="rounded-panel p-6 sm:p-8 text-white shadow-panel-dark border border-slate-700/80 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #172033 0%, #0f172a 58%, #111827 100%)' }}
      >
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Terminal Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-700/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-xs text-slate-200 font-bold">
                OUTSYSTEMS RAW RESPONSE JSON INSPECTOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              {loading ? 'Fetching JSON...' : `${formattedJsonString.length} chars`}
            </span>
          </div>
        </div>

        {/* Section Filter Pills */}
        {availableSections.length > 1 && (
          <div className="relative z-10 py-4 flex flex-wrap items-center gap-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Section:</span>
            {availableSections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1 rounded-pill text-xs font-mono font-bold transition-all ${
                  selectedSection === sec
                    ? 'bg-primary text-white shadow-md border border-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                {sec === 'all' ? 'All (Full Raw JSON)' : sec}
              </button>
            ))}
          </div>
        )}

        {/* Terminal Content Body */}
        <div className="relative z-10 pt-4">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Mengambil respon mentah data modul dari database...</p>
            </div>
          ) : error ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-rose-300 font-mono">{error}</p>
            </div>
          ) : !rawData || Object.keys(rawData).length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <FileJson className="w-8 h-8 text-slate-500" />
              <p className="text-xs text-slate-400 font-mono">Data modul masih kosong atau belum diproses.</p>
            </div>
          ) : (
            <pre className="p-4 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800/90 font-mono text-xs sm:text-[13px] text-emerald-400 leading-relaxed overflow-x-auto max-h-[600px] select-text shadow-inner">
              <code>{formattedJsonString}</code>
            </pre>
          )}
        </div>

      </div>

    </div>
  );
};
