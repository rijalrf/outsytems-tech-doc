import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Code2, Eye, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  className?: string;
}

let mermaidInitialized = false;

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'code'>('diagram');
  const [copied, setCopied] = useState<boolean>(false);
  const [rendering, setRendering] = useState<boolean>(true);

  // Initialize mermaid configuration once
  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Segoe UI", Roboto',
        themeVariables: {
          primaryColor: '#e0e7ff',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#6366f1',
          lineColor: '#475569',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#ffffff',
          noteBkgColor: '#fef3c7',
          noteTextColor: '#92400e',
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
        },
        er: {
          useMaxWidth: true,
        },
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: true,
        },
      });
      mermaidInitialized = true;
    }
  }, []);

  // Clean diagram code (remove markdown backticks or weird leading/trailing tags if any)
  const cleanCode = React.useMemo(() => {
    let text = code.trim();
    if (text.startsWith('```mermaid')) {
      text = text.replace(/^```mermaid\s*/i, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '');
    }
    if (text.endsWith('```')) {
      text = text.replace(/```$/, '');
    }
    return text.trim();
  }, [code]);

  // Render diagram SVG
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!cleanCode) {
        setSvgContent('');
        setRendering(false);
        return;
      }

      setRendering(true);
      setError(null);

      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
      try {
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        console.warn('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Gagal memproses sintaks diagram');
        }
      } finally {
        if (isMounted) {
          setRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [cleanCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs text-slate-700">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Diagram Visual Architecture</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                viewMode === 'diagram' ? 'bg-white text-primary font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                viewMode === 'code' ? 'bg-white text-primary font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Code</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors"
            title="Salin kode diagram"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'code' ? (
        <div className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>{cleanCode}</pre>
        </div>
      ) : (
        <div className="p-5 bg-gradient-to-b from-white to-slate-50/40 flex flex-col items-center justify-center min-h-[160px] overflow-x-auto">
          {rendering ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span>Memproses render diagram...</span>
            </div>
          ) : error ? (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Diagram tidak dapat dirender secara visual. Menampilkan kode sumber diagram:</span>
              </div>
              <pre className="p-3.5 bg-slate-900 text-emerald-300 rounded-xl font-mono text-xs overflow-x-auto">
                {cleanCode}
              </pre>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full flex justify-center items-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};
