import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, FileJson, Search } from 'lucide-react';

interface ModuleRawJsonTabProps {
  moduleName: string;
  rawData: Record<string, any> | null;
}

export const ModuleRawJsonTab: React.FC<ModuleRawJsonTabProps> = ({ moduleName, rawData }) => {
  const [copied, setCopied] = useState(false);
  const [selectedSection, setSelectedSection] = useState('all');
  const [search, setSearch] = useState('');

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
    let data = selectedSection === 'all' ? rawData : rawData[selectedSection] ?? { message: `Section '${selectedSection}' tidak memiliki data.` };
    return data;
  };

  const formattedJsonString = rawData ? JSON.stringify(getDisplayedData(), null, 2) : '';

  // Filter lines if search query is entered
  const displayedJsonText = search.trim()
    ? formattedJsonString
        .split('\n')
        .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
        .join('\n')
    : formattedJsonString;

  const handleCopy = () => {
    if (!rawData) return;
    navigator.clipboard.writeText(formattedJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!rawData) return;
    const blob = new Blob([formattedJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName}_${selectedSection}_raw.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kunci atau nilai dalam JSON..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleCopy}
            disabled={!rawData}
            className="h-10 px-3.5 rounded-xl bg-surface hover:bg-surface-soft border border-outline text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Salin JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!rawData}
            className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      {availableSections.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {availableSections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1 rounded-pill text-xs font-mono font-bold transition-all ${
                selectedSection === sec
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-surface hover:bg-surface-soft text-gray-700 border border-outline'
              }`}
            >
              {sec === 'all' ? 'All (Full JSON)' : sec}
            </button>
          ))}
        </div>
      )}

      {/* Terminal Display */}
      <div
        className="rounded-2xl p-4 sm:p-6 text-white border border-slate-700/80 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #172033 0%, #0f172a 58%, #111827 100%)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs text-slate-200 font-bold">
              RAW JSON VIEWER ({displayedJsonText.length} chars)
            </span>
          </div>
          {search && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              Filter: "{search}"
            </span>
          )}
        </div>

        {!rawData ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
            <FileJson className="w-6 h-6 text-slate-500" />
            <p className="text-xs font-mono">Data JSON belum tersedia.</p>
          </div>
        ) : (
          <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto max-h-[500px] select-text shadow-inner">
            <code>{displayedJsonText}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
