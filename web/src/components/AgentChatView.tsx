import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Layers, 
  FolderKanban, 
  Box, 
  CheckCircle2, 
  Copy, 
  Check, 
  Cpu,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

import { toast } from 'sonner';
import { api } from '../services/api';
import type { 
  AgentChatMessage, 
  AgentStatus, 
  ProjectSummary, 
  ApplicationSummary, 
  ModuleSummary,
  ToolCallTrace
} from '../types/api';

interface AgentChatViewProps {
  initialProject?: ProjectSummary | null;
  initialApp?: ApplicationSummary | null;
  initialModule?: ModuleSummary | null;
}

export const AgentChatView: React.FC<AgentChatViewProps> = ({
  initialProject = null,
  initialApp = null,
  initialModule = null,
}) => {
  // Context Selection States
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [modules, setModules] = useState<ModuleSummary[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProject?.id || '');
  const [selectedAppId, setSelectedAppId] = useState<string>(initialApp?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModule?.id || '');

  // Agent State
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Halo! Saya OutSystems Architecture & Documentation AI Assistant.**\n\nSaya dapat membantu Anda mengeksplorasi arsitektur, modul, database entity, logic actions, site properties, security roles, hingga error exceptions dari file **.OAP** dan **.OML** yang telah diparse.\n\nSilakan pilih konteks aplikasi/modul di atas atau langsung tanyakan apa saja!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load Initial Projects and Agent Status
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [projData, agentStatus] = await Promise.all([
          api.getProjects(),
          api.getAgentStatus().catch(() => null),
        ]);
        setProjects(projData);
        if (agentStatus) setStatus(agentStatus);
      } catch (err: any) {
        console.error('Failed to load initial data for agent:', err);
      }
    };
    loadInitialData();
  }, []);

  // 2. Load Applications when Project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setApplications([]);
      setSelectedAppId('');
      return;
    }
    const fetchApps = async () => {
      try {
        const apps = await api.getProjectApplications(selectedProjectId);
        setApplications(apps);
      } catch (err: any) {
        console.error('Failed to load project applications:', err);
      }
    };
    fetchApps();
  }, [selectedProjectId]);

  // 3. Load Modules when Application changes
  useEffect(() => {
    if (!selectedAppId) {
      setModules([]);
      setSelectedModuleId('');
      return;
    }
    const fetchMods = async () => {
      try {
        const mods = await api.getApplicationModules(selectedAppId);
        setModules(mods);
      } catch (err: any) {
        console.error('Failed to load application modules:', err);
      }
    };
    fetchMods();
  }, [selectedAppId]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send Message Handler
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

    const userMsg: AgentChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Build context info
    const currentApp = applications.find((a) => a.id === selectedAppId);
    const currentMod = modules.find((m) => m.id === selectedModuleId);

    const contextPayload = {
      project_id: selectedProjectId || undefined,
      application_id: selectedAppId || undefined,
      application_name: currentApp?.name || undefined,
      module_id: selectedModuleId || undefined,
      module_name: currentMod?.module_name || undefined,
    };

    try {
      // Filter previous messages for payload
      const historyPayload = messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      historyPayload.push({
        role: 'user',
        content: textToSend,
      });

      const response = await api.sendAgentChat({
        messages: historyPayload,
        context: contextPayload,
      });

      const assistantMsg: AgentChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || 'Gagal berkomunikasi dengan AI');
      const errorMsg: AgentChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Terjadi Kesalahan:** ${err.message || 'Gagal memproses permintaan.'}\n\nPastikan konfigurasi API Key atau model LLM backend sudah terhubung dengan benar.`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: `Percakapan telah direset. Silakan tanyakan hal lain seputar arsitektur dan data modul OutSystems.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.info('Riwayat percakapan dibersihkan');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleToolExpand = (traceId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [traceId]: !prev[traceId],
    }));
  };

  // Quick Prompt Suggestions
  const quickPrompts = [
    {
      title: 'Daftar Aplikasi & Modul',
      prompt: 'Aplikasi apa saja yang sudah di-upload dan modul apa saja yang ada di dalamnya beserta layer suffix-nya?',
    },
    {
      title: 'Struktur Database / Entities',
      prompt: 'Tampilkan seluruh Database Entities dan atribut/kolom penting yang ada di aplikasi ini.',
    },
    {
      title: 'Server Actions & Logic',
      prompt: 'Ada Server Actions atau Client Actions apa saja di modul ini? Jelaskan fungsi dan parameternya.',
    },
    {
      title: 'Security Roles & Exceptions',
      prompt: 'Jelaskan System Roles (hak akses) dan User Defined Exceptions yang terdaftar pada modul ini.',
    },
  ];

  // Helper Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];

    const flushTable = (keyIndex: number) => {
      if (inTable && tableHeader.length > 0) {
        elements.push(
          <div key={`table_${keyIndex}`} className="overflow-x-auto my-3 rounded-lg border border-outline shadow-sm">
            <table className="min-w-full divide-y divide-outline text-xs text-left bg-white">
              <thead className="bg-surface-soft font-bold text-gray-700">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="px-3 py-2 border-r border-outline last:border-r-0">
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 border-r border-outline last:border-r-0 text-gray-800">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
        tableHeader = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check Table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        
        // Skip separator line (e.g. |---|---|)
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeader = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(idx);
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="font-bold text-sm text-gray-900 mt-3 mb-1 flex items-center gap-1.5">
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="font-black text-base text-gray-900 mt-4 mb-2">
            {trimmed.replace('## ', '')}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={idx} className="font-black text-lg text-primary mt-4 mb-2">
            {trimmed.replace('# ', '')}
          </h2>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.slice(2);
        elements.push(
          <div key={idx} className="flex items-start gap-2 ml-2 my-0.5 text-xs text-gray-800 leading-relaxed">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>{renderFormattedInline(itemContent)}</span>
          </div>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={idx} className="text-xs text-gray-800 leading-relaxed my-1">
          {renderFormattedInline(line)}
        </p>
      );
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  // Helper for inline bold, code backticks
  const renderFormattedInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-primary font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-background">
      
      {/* 1. TOP BAR: CONTEXT & FILTER BAR */}
      <div className="bg-surface border-b border-outline px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-container mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Context Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Konteks Fokus:
            </span>

            {/* Project Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-outline rounded-lg px-2.5 py-1">
              <FolderKanban className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">Semua Proyek (Global)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Application Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-outline rounded-lg px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                disabled={!selectedProjectId && applications.length === 0}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Semua Aplikasi</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-outline rounded-lg px-2.5 py-1">
              <Box className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                disabled={!selectedAppId && modules.length === 0}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Semua Modul</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.module_name} {m.module_suffix ? `(${m.module_suffix})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary/20 text-[11px] font-bold">
              <Cpu className="w-3 h-3" />
              <span>{status?.active_model || 'gpt-4o-mini'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted text-success border border-emerald-200 text-[11px] font-bold">
              <Wrench className="w-3 h-3" />
              <span>{status?.total_tools_available || 13} Tools Active</span>
            </div>

            <button
              onClick={handleClearChat}
              title="Bersihkan Percakapan"
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-outline transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 2. CHAT MESSAGES SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-container mx-auto space-y-4">
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-sm flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div className={`max-w-3xl rounded-card p-4 shadow-sm relative group ${
                msg.role === 'user'
                  ? 'bg-primary text-white ml-12 rounded-tr-sm'
                  : msg.isError
                  ? 'bg-rose-50 border border-rose-200 text-gray-800 rounded-tl-sm'
                  : 'bg-surface border border-outline text-gray-800 rounded-tl-sm'
              }`}>

                {/* Header Bubble */}
                <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-black/5 dark:border-white/10 text-[11px]">
                  <span className={`font-bold ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {msg.role === 'user' ? 'Anda' : 'OutSystems AI Assistant'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyText(msg.id || '', msg.content)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary transition-opacity"
                        title="Salin Teks"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tool Call Traces Visualization */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span>{msg.tool_calls.length} Tools Dieksekusi:</span>
                    </div>
                    {msg.tool_calls.map((trace: ToolCallTrace, tIdx: number) => {
                      const traceKey = `${msg.id}_t_${tIdx}`;
                      const isExpanded = expandedTools[traceKey];
                      return (
                        <div
                          key={traceKey}
                          className="text-[11px] rounded-lg border border-outline bg-gray-50/90 overflow-hidden"
                        >
                          <div
                            onClick={() => toggleToolExpand(traceKey)}
                            className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 font-mono text-gray-700">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              <span className="font-bold text-primary">{trace.tool_name}</span>
                              <span className="text-gray-400">({Object.keys(trace.arguments || {}).join(', ')})</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                          </div>

                          {isExpanded && (
                            <div className="p-2 border-t border-outline bg-white font-mono text-[10px] space-y-1">
                              <div>
                                <span className="font-bold text-gray-500">Arguments: </span>
                                <span className="text-gray-800">{JSON.stringify(trace.arguments, null, 2)}</span>
                              </div>
                              {trace.result_preview && (
                                <div>
                                  <span className="font-bold text-gray-500">Result Preview: </span>
                                  <span className="text-gray-600 break-all">{trace.result_preview}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message Body */}
                <div className={msg.role === 'user' ? 'text-white text-xs whitespace-pre-wrap leading-relaxed' : ''}>
                  {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                </div>

              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-white shadow-sm flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-surface border border-outline rounded-card px-4 py-3 shadow-sm flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                <span>AI sedang menganalisis data modul & mengeksekusi function calls...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. QUICK SUGGESTIONS & INPUT BOX */}
      <div className="bg-surface border-t border-outline px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-container mx-auto space-y-2.5">
          
          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 flex-shrink-0">
              <HelpCircle className="w-3 h-3 text-primary" />
              Saran:
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full bg-surface-soft hover:bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {q.title}
              </button>
            ))}
          </div>

          {/* Textarea Input Container */}
          <div className="flex items-end gap-2 bg-gray-50 border border-outline rounded-2xl p-2 focus-within:border-primary focus-within:bg-white transition-all shadow-inner">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan informasi modul, database entity, logic actions, roles, atau arsitektur aplikasi..."
              disabled={loading}
              className="flex-1 bg-transparent border-0 resize-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none px-2 py-1 leading-relaxed"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-strong disabled:bg-gray-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all flex-shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Kirim</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span>Tekan <kbd className="px-1 py-0.5 bg-gray-100 border rounded font-mono">Enter</kbd> untuk mengirim, <kbd className="px-1 py-0.5 bg-gray-100 border rounded font-mono">Shift + Enter</kbd> untuk baris baru.</span>
            <span>Didukung OpenAI Function Calling & OutSystems Parser.</span>
          </div>

        </div>
      </div>

    </div>
  );
};
