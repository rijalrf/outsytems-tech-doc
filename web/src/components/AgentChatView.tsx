import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw, 
  RotateCcw,
  FileText,
  Download,
  Eye,
  Code,
  Columns,
  FileDown,
  ArrowRight,
  X
} from 'lucide-react';

import { toast } from 'sonner';
import { api } from '../services/api';
import { MermaidRenderer } from './MermaidRenderer';
import { FSD_OUTLINE } from '../constants/fsdTemplate';
import { exportToDocx } from '../utils/exportDocx';
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

type LayoutMode = 'split' | 'chat-only' | 'doc-only';
type DocViewTab = 'preview' | 'editor';

const detectTargetSection = (content: string): string => {
  const lower = content.toLowerCase();
  if (lower.includes('erdiagram') || lower.includes('erd') || lower.includes('entity relationship')) {
    return '4.1 Entity Relationship Diagram (ERD)';
  }
  if (lower.includes('attribute name') || lower.includes('entities') || lower.includes('database information') || lower.includes('archiving strategy')) {
    return '4.2 Database Information & Entities';
  }
  if (lower.includes('3-layer') || lower.includes('architecture canvas') || lower.includes('end-user layer') || lower.includes('core layer')) {
    return '2.1 3-Layer Architecture Canvas';
  }
  if (lower.includes('module definition') || lower.includes('parent application')) {
    return '2.2 Application & Module Definitions';
  }
  if (lower.includes('consumed api') || lower.includes('rest/soap') || lower.includes('external api')) {
    return '3.2 Consumed APIs (REST/SOAP)';
  }
  if (lower.includes('exposed api') || lower.includes('service action')) {
    return '3.3 Exposed API (REST/SOAP)';
  }
  if (lower.includes('site propert')) {
    return '4.4 Site Properties';
  }
  if (lower.includes('role') || lower.includes('entitlement') || lower.includes('hak akses')) {
    return '5.2 Entitlement / Authorization (Custom Roles)';
  }
  if (lower.includes('authentication') || lower.includes('login flow') || lower.includes('saml')) {
    return '5.1 Authentication';
  }
  if (lower.includes('exception') || lower.includes('error handling')) {
    return '5.4 Global Exception & Error Handling';
  }
  if (lower.includes('deployment') || lower.includes('lifetime') || lower.includes('ci/cd')) {
    return '6. Deployment';
  }
  if (lower.includes('general information') || lower.includes('project name') || lower.includes('business unit') || lower.includes('technical leader')) {
    return '1.1 Project General Information';
  }
  if (lower.includes('background') || lower.includes('objective') || lower.includes('in-scope') || lower.includes('scope')) {
    return '1.2 Description and Project Scope';
  }
  return '1.2 Description and Project Scope';
};

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

  // UI & Layout States
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [docViewTab, setDocViewTab] = useState<DocViewTab>('preview');
  const [status, setStatus] = useState<AgentStatus | null>(null);

  // Document Markdown State (for export / raw editor)
  const [documentMarkdown, setDocumentMarkdown] = useState<string>('');
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [docCopied, setDocCopied] = useState<boolean>(false);

  // Per-section inserted content: key = section heading, value = markdown string
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});

  // Message Insertion States
  const [selectedDocSection, setSelectedDocSection] = useState<string | null>(null);
  const [insertedMsgIds, setInsertedMsgIds] = useState<Record<string, boolean>>({});
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Chat State
  const defaultWelcomeMessage: AgentChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `👋 **Halo! Saya OutSystems Technical Specification & FSD Assistant.**\n\nSaya siap membantu Anda menyusun **Dokumen Spesifikasi Teknis (FSD)** secara komprehensif merujuk pada template standar di panel sebelah kanan.\n\nSetiap jawaban yang saya berikan dapat Anda tinjau terlebih dahulu dan dimasukkan ke dokumen menggunakan tombol **"📥 Sisipkan ke Dokumen"** pada bubble respon.\n\nContoh yang dapat Anda tanyakan:\n- *"Isi section 1.1 Project General Information dan 1.2 Description & Scope"* \n- *"Buat diagram ERD dan jelaskan database entities untuk modul Core Service"* \n- *"Lengkapi seluruh dokumen spesifikasi teknis"*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<AgentChatMessage[]>([defaultWelcomeMessage]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const getDraftKey = useCallback((projId: string) => `outgen_fsd_draft_${projId || 'global'}`, []);

  // 1. Load Initial Projects, Status, and Technical Doc Template
  useEffect(() => {
    const loadInitialData = async () => {
      setDocLoading(true);
      try {
        const [projData, agentStatus] = await Promise.all([
          api.getProjects(),
          api.getAgentStatus().catch(() => null),
        ]);
        setProjects(projData);
        if (agentStatus) setStatus(agentStatus);
      } catch (err: any) {
        console.error('Failed to load initial data:', err);
      } finally {
        setDocLoading(false);
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

  // 2b. Restore project draft on project change / mount
  useEffect(() => {
    const key = getDraftKey(selectedProjectId);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sectionContents) setSectionContents(parsed.sectionContents);
        if (parsed.documentMarkdown) setDocumentMarkdown(parsed.documentMarkdown);
        if (parsed.insertedMsgIds) setInsertedMsgIds(parsed.insertedMsgIds);
        if (parsed.selectedDocSection) setSelectedDocSection(parsed.selectedDocSection);
        if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (parsed.savedAt) {
          setDraftSavedTime(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        // Reset when switching to a project without a draft
        setSectionContents({});
        setDocumentMarkdown('');
        setInsertedMsgIds({});
        setSelectedDocSection(null);
        setDraftSavedTime(null);
        setMessages([defaultWelcomeMessage]);
      }
    } catch (err) {
      console.error('Failed to load draft from localStorage:', err);
    }
  }, [selectedProjectId, getDraftKey]);

  // 2c. Auto-save draft to localStorage whenever contents/messages change
  useEffect(() => {
    const key = getDraftKey(selectedProjectId);
    const hasContent = Object.keys(sectionContents).length > 0;
    const hasCustomMessages = messages.length > 1;

    if (!hasContent && !hasCustomMessages) return;

    try {
      const now = new Date();
      const payload = {
        sectionContents,
        documentMarkdown,
        insertedMsgIds,
        selectedDocSection,
        messages,
        savedAt: now.toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
      setDraftSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to auto-save draft to localStorage:', err);
    }
  }, [selectedProjectId, sectionContents, documentMarkdown, insertedMsgIds, selectedDocSection, messages, getDraftKey]);

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

  // Auto-scroll chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Function to scroll preview container to a specific section
  const scrollToSection = useCallback((targetSection: string) => {
    setTimeout(() => {
      if (!previewContainerRef.current) return;
      const clean = targetSection.toLowerCase().replace(/[^a-z0-9]/g, '');
      const headings = previewContainerRef.current.querySelectorAll('h2, h3, h4');
      for (const h of headings) {
        const text = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (text.includes(clean) || clean.includes(text)) {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          h.classList.add('bg-yellow-200', 'transition-colors', 'duration-1000');
          setTimeout(() => h.classList.remove('bg-yellow-200'), 2500);
          break;
        }
      }
    }, 150);
  }, []);

  // Helper to insert content into a specific section by its heading
  const applyDocumentPatch = useCallback((sectionOrPlaceholder: string, newContent: string) => {
    const cleanContent = newContent
      .replace(/^(?:Tentu|Baik|Berikut|Berikut adalah|Ini adalah|Halo)[^\n]*\n+/i, '')
      .trim();

    // Find the best matching section heading from FSD_OUTLINE
    const matchedSection = FSD_OUTLINE.find((sec) => {
      const a = sec.heading.toLowerCase().replace(/[^a-z0-9]/g, '');
      const b = sectionOrPlaceholder.toLowerCase().replace(/[^a-z0-9]/g, '');
      return a === b || a.includes(b) || b.includes(a);
    });

    const targetKey = matchedSection ? matchedSection.heading : sectionOrPlaceholder;

    setSectionContents((prev) => {
      const updated = { ...prev, [targetKey]: cleanContent };
      // Also update documentMarkdown for raw editor / export
      const exportMd = FSD_OUTLINE.map((sec) => {
        const hasChildren = FSD_OUTLINE.some((item) => item.parentId === sec.id);
        if (sec.level === 'parent' && hasChildren) return `## ${sec.heading}`;
        const content = updated[sec.heading];
        const prefix = sec.level === 'parent' ? `## ${sec.heading}` : `### ${sec.heading}`;
        if (!content) return `${prefix}\n\n*Belum diisi*`;
        return `${prefix}\n\n${content}`;
      }).join('\n\n');
      setDocumentMarkdown(exportMd);
      return updated;
    });

    toast.success(`Disisipkan ke: ${targetKey}`);
    scrollToSection(targetKey);
  }, [scrollToSection]);

  // Send Message to AI Assistant
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

    const currentTargetSection = selectedDocSection || undefined;

    const userMsg: AgentChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      targetSection: currentTargetSection,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

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
        targetSection: currentTargetSection,
        tool_calls: response.tool_calls,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // 1. Process explicit update_document_section tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        response.tool_calls.forEach((trace: ToolCallTrace) => {
          if (trace.tool_name === 'update_document_section' && trace.arguments) {
            const secTitle = trace.arguments.section_title;
            const content = trace.arguments.content;
            const targetPlaceholder = trace.arguments.placeholder_target;
            if (targetPlaceholder) {
              applyDocumentPatch(targetPlaceholder, content);
            } else if (secTitle) {
              applyDocumentPatch(secTitle, content);
            }
          }
        });
      }

      // 2. Auto-sync project information to General Information & Scope table
      const activeProj = projects.find((p) => p.id === selectedProjectId);
      if (activeProj) {
        setDocumentMarkdown((doc) => {
          let updated = doc;
          if (activeProj.project_name || activeProj.name) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> project_name[^\]]*\]/g, activeProj.project_name || activeProj.name);
          }
          if (activeProj.platform) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> platform[^\]]*\]/g, activeProj.platform);
          }
          if (activeProj.business_unit) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> business_unit[^\]]*\]/g, activeProj.business_unit);
          }
          if (activeProj.project_manager) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> project_manager[^\]]*\]/g, activeProj.project_manager);
          }
          if (activeProj.technical_leader) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> technical_leader[^\]]*\]/g, activeProj.technical_leader);
          }
          if (activeProj.start_date) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> start_date[^\]]*\]/g, activeProj.start_date);
          }
          if (activeProj.go_live_date) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> go_live_date[^\]]*\]/g, activeProj.go_live_date);
          }
          if (activeProj.doc_version) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> doc_version[^\]]*\]/g, activeProj.doc_version);
          }
          if (activeProj.doc_status) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> doc_status[^\]]*\]/g, activeProj.doc_status);
          }
          if (activeProj.background) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> background[^\]]*\]/g, activeProj.background);
          }
          if (activeProj.objectives) {
            updated = updated.replace(/\[AI Generated \| Function: get_project_detail\(project_id\) -> objectives[^\]]*\]/g, activeProj.objectives);
          }
          return updated;
        });
      }

    } catch (err: any) {
      toast.error(err.message || 'Gagal berkomunikasi dengan AI');
      const errorMsg: AgentChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Terjadi Kesalahan:** ${err.message || 'Gagal memproses permintaan.'}\n\nPastikan OpenAI API Key sudah diatur pada backend.`,
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
        content: `Percakapan telah direset. Silakan pilih section FSD atau tanyakan hal teknis yang ingin Anda lengkapi pada dokumen.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.info('Riwayat percakapan dibersihkan');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(documentMarkdown);
    setDocCopied(true);
    toast.success('Konten Markdown FSD berhasil disalin ke clipboard');
    setTimeout(() => setDocCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    const activeProj = projects.find((p) => p.id === selectedProjectId);
    const projName = activeProj?.name || 'OutSystems';
    const version = activeProj?.doc_version || '1.0';
    if (!Object.keys(sectionContents).length) {
      toast.error('Belum ada konten yang disisipkan. Isi minimal satu section sebelum mengekspor.');
      return;
    }
    toast.promise(
      exportToDocx(sectionContents, projName, version),
      {
        loading: 'Membuat file DOCX...',
        success: `Berhasil diekspor: ${projName}_Technical_Specification_v${version}.docx`,
        error: 'Gagal membuat DOCX. Silakan coba lagi.',
      }
    );
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

  // Markdown rendering helper with support for interactive placeholders, tables, Mermaid diagrams, and code
  const renderMarkdownContent = (text: string, isDocumentPreview = false) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];
    let inMermaid = false;
    let mermaidLines: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLang = '';

    const flushTable = (keyIndex: number) => {
      if (inTable && tableHeader.length > 0) {
        elements.push(
          <div key={`table_${keyIndex}`} className="overflow-x-auto my-3.5 rounded-xl border border-outline bg-white shadow-xs">
            <table className="min-w-full divide-y divide-outline text-xs text-left">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="px-3.5 py-2.5 border-r border-outline last:border-r-0 tracking-tight">
                      {renderFormattedInline(h.trim(), isDocumentPreview)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40 hover:bg-indigo-50/20 transition-colors'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 border-r border-outline last:border-r-0 text-slate-800 leading-normal align-top">
                        {renderFormattedInline(cell.trim(), isDocumentPreview)}
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

    const flushMermaid = (keyIndex: number) => {
      if (inMermaid) {
        const diagramCode = mermaidLines.join('\n');
        elements.push(
          <div key={`mermaid_${keyIndex}`} className="my-4">
            <MermaidRenderer code={diagramCode} />
          </div>
        );
        inMermaid = false;
        mermaidLines = [];
      }
    };

    const flushCodeBlock = (keyIndex: number) => {
      if (inCodeBlock) {
        elements.push(
          <div key={`code_${keyIndex}`} className="my-3 rounded-xl bg-slate-900 text-emerald-300 p-4 font-mono text-xs overflow-x-auto shadow-sm">
            <pre className={codeLang ? `language-${codeLang}` : ''}>{codeLines.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeLines = [];
        codeLang = '';
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check Mermaid block start/end
      if (trimmed.startsWith('```mermaid')) {
        if (inTable) flushTable(idx);
        inMermaid = true;
        mermaidLines = [];
        return;
      }
      if (inMermaid) {
        if (trimmed.startsWith('```')) {
          flushMermaid(idx);
        } else {
          mermaidLines.push(line);
        }
        return;
      }

      // Check Generic Code block
      if (trimmed.startsWith('```')) {
        if (inTable) flushTable(idx);
        if (inCodeBlock) {
          flushCodeBlock(idx);
        } else {
          inCodeBlock = true;
          codeLang = trimmed.replace('```', '');
          codeLines = [];
        }
        return;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Check Table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        
        // Skip table separator line (e.g. |---|---|)
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

      // Blockquotes (Alerts / Pedoman)
      if (trimmed.startsWith('> ')) {
        const quoteContent = trimmed.slice(2);
        elements.push(
          <div key={idx} className="my-2.5 p-3.5 rounded-xl bg-indigo-50/70 border-l-4 border-primary text-xs text-indigo-950 leading-relaxed shadow-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">{renderFormattedInline(quoteContent, isDocumentPreview)}</div>
          </div>
        );
        return;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace('### ', '');
        const isSelected = selectedDocSection === headingText;
        elements.push(
          <div 
            key={idx} 
            className={`flex flex-wrap items-center justify-between gap-2 mt-6 mb-2.5 pb-1.5 border-b transition-all ${
              isSelected 
                ? 'border-primary bg-indigo-50/80 px-3.5 py-2 rounded-xl shadow-2xs border-l-4' 
                : 'border-slate-200/80 hover:border-indigo-300'
            }`}
          >
            <h4 id={`sec-${idx}`} className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className={`w-1.5 h-3.5 rounded-full inline-block ${isSelected ? 'bg-primary animate-pulse' : 'bg-primary'}`} />
              <span className={isSelected ? 'text-primary font-black' : 'text-slate-900'}>{headingText}</span>
            </h4>
            {isDocumentPreview && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDocSection(headingText);
                  setInputText(`Lengkapi konten untuk section "${headingText}" secara komprehensif menggunakan data spesifikasi OutSystems.`);
                  inputRef.current?.focus();
                  toast.info(`Section aktif untuk AI: ${headingText}`);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  isSelected
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
                    : 'bg-indigo-50 hover:bg-primary hover:text-white text-primary border border-indigo-200'
                }`}
                title="Pilih sub-section ini untuk diisi oleh AI"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isSelected ? '✓ Section Terpilih' : '✨ Pilih Section'}</span>
              </button>
            )}
          </div>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        const headingText = trimmed.replace('## ', '');
        elements.push(
          <div key={idx} className="flex items-center justify-between mt-8 mb-3.5 pb-2 border-b-2 border-indigo-200">
            <h3 id={`sec-${idx}`} className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-4 bg-gradient-to-b from-primary to-indigo-700 rounded-sm inline-block" />
              <span>{headingText}</span>
            </h3>
          </div>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        elements.push(
          <div key={idx} className="mt-2 mb-4 pb-3 border-b-2 border-primary">
            <h2 className="font-black text-xl text-primary tracking-tight">
              {trimmed.replace('# ', '')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">OutSystems Functional & Technical Specification Document (Auto-generated)</p>
          </div>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.slice(2);
        elements.push(
          <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-xs text-slate-800 leading-relaxed">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div className="flex-1">{renderFormattedInline(itemContent, isDocumentPreview)}</div>
          </div>
        );
        return;
      }

      // Horizontal Rule
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={idx} className="my-5 border-slate-200" />);
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={idx} className="text-xs text-slate-800 leading-relaxed my-1.5">
          {renderFormattedInline(line, isDocumentPreview)}
        </p>
      );
    });

    if (inTable) flushTable(lines.length);
    if (inMermaid) flushMermaid(lines.length);
    if (inCodeBlock) flushCodeBlock(lines.length);

    return elements;
  };

  // Helper for inline bold, code backticks, and CLICKABLE AI PLACEHOLDERS
  const renderFormattedInline = (text: string, isDocumentPreview = false) => {
    // Regex for [AI Generated | Function: ...]
    const placeholderRegex = /(\[AI Generated \| [^\]]+\])/g;
    const parts = text.split(placeholderRegex);

    return parts.map((part, i) => {
      if (part.startsWith('[AI Generated |') && part.endsWith(']')) {
        const innerInfo = part.slice(1, -1);
        return (
          <span
            key={`placeholder_${i}`}
            onClick={() => {
              if (isDocumentPreview) {
                handleSendMessage(`Eksekusi tool call untuk mengisi placeholder dokumen: "${part}". Ambil data faktual yang diperlukan dari database.`);
              }
            }}
            title={isDocumentPreview ? 'Klik untuk meminta AI mengeksekusi function call dan mengisi placeholder ini' : undefined}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 mx-1 rounded-md text-[11px] font-mono font-medium border transition-all ${
              isDocumentPreview
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-primary hover:text-white hover:border-primary cursor-pointer shadow-xs animate-pulse hover:animate-none'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-600 group-hover:text-white shrink-0" />
            <span className="truncate max-w-[320px]">{innerInfo}</span>
            {isDocumentPreview && <ArrowRight className="w-2.5 h-2.5 ml-0.5 shrink-0 opacity-70" />}
          </span>
        );
      }

      // Format bold and backticks
      const subParts = part.split(/(\*\*.*?\*\*|`.*?`)/g);
      return subParts.map((sub, j) => {
        if (sub.startsWith('**') && sub.endsWith('**')) {
          return <strong key={`${i}_${j}`} className="font-bold text-slate-900">{sub.slice(2, -2)}</strong>;
        }
        if (sub.startsWith('`') && sub.endsWith('`')) {
          return (
            <code key={`${i}_${j}`} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 border border-slate-200 text-primary font-mono text-[11px]">
              {sub.slice(1, -1)}
            </code>
          );
        }
        return sub;
      });
    });
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const activeApp = applications.find((a) => a.id === selectedAppId);
  const activeMod = modules.find((m) => m.id === selectedModuleId);

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] bg-slate-100 overflow-hidden font-roboto">
      
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="bg-surface border-b border-outline px-4 sm:px-6 py-2.5 shadow-xs flex-shrink-0">
        <div className="max-w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Context Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Konteks FSD:
            </span>

            {/* Project Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-outline rounded-lg px-2.5 py-1 text-xs">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">Pilih Proyek (Wajib)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Application Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-outline rounded-lg px-2.5 py-1 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                disabled={!selectedProjectId && applications.length === 0}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Semua Aplikasi (.OAP)</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-outline rounded-lg px-2.5 py-1 text-xs">
              <Box className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                disabled={!selectedAppId && modules.length === 0}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Semua Modul (.OML)</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.module_name} {m.module_suffix ? `(${m.module_suffix})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Layout Switcher & Document Actions */}
          <div className="flex items-center gap-2">
            
            {/* LLM Status Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[10px] text-primary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{status?.is_configured ? (status.active_model || 'LLM Ready') : 'OpenAI Agent'}</span>
            </div>

            {/* View Mode Toggle: Split / Chat Only / Doc Only */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                  layoutMode === 'split' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split Screen (Chat + Live Preview)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split 50:50</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('chat-only')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                  layoutMode === 'chat-only' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Fokus Chat Assistant"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('doc-only')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                  layoutMode === 'doc-only' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Fokus Dokumen Preview"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dokumen FSD</span>
              </button>
            </div>

            {/* Quick Export Button */}
            <button
              type="button"
              onClick={handleExportDocx}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Download FSD Dokumen Word (.docx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export DOCX</span>
            </button>

          </div>

        </div>
      </div>

      {/* 2. MAIN SPLIT CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================================================================= */}
        {/* LEFT PANE: AI CHAT ASSISTANT & FUNCTION EXECUTION */}
        {/* ================================================================= */}
        {(layoutMode === 'split' || layoutMode === 'chat-only') && (
          <div className={`flex flex-col bg-white border-r border-outline h-full overflow-hidden ${
            layoutMode === 'split' ? 'w-full lg:w-1/2' : 'w-full'
          }`}>
            
            {/* Chat Pane Header */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-outline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-none">FSD Documentation AI Assistant</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Automated Tool Calling & OutSystems Parser</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors"
                  title="Bersihkan chat"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-xs flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs relative group ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-xs'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-slate-800 rounded-tl-xs'
                      : 'bg-white border border-outline text-slate-800 rounded-tl-xs'
                  }`}>
                    
                    {/* Header bubble */}
                    <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-black/5 text-[11px]">
                      <span className={`font-bold ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-600'}`}>
                        {msg.role === 'user' ? 'Anda' : 'OutSystems AI Assistant'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {msg.timestamp}
                        </span>
                        {msg.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id || '', msg.content)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity"
                            title="Salin jawaban"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tool Call Traces Visualization */}
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          <span>{msg.tool_calls.length} Tools Function Call Dieksekusi:</span>
                        </div>
                        {msg.tool_calls.map((trace: ToolCallTrace, tIdx: number) => {
                          const traceKey = `${msg.id}_t_${tIdx}`;
                          const isExpanded = expandedTools[traceKey];
                          return (
                            <div
                              key={traceKey}
                              className="text-[11px] rounded-lg border border-outline bg-slate-50 overflow-hidden"
                            >
                              <div
                                onClick={() => toggleToolExpand(traceKey)}
                                className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-1.5 font-mono text-slate-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span className="font-bold text-primary">{trace.tool_name}</span>
                                  <span className="text-slate-400">({Object.keys(trace.arguments || {}).join(', ')})</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                              </div>

                              {isExpanded && (
                                <div className="p-2 border-t border-outline bg-white font-mono text-[10px] space-y-1">
                                  <div>
                                    <span className="font-bold text-slate-500">Arguments: </span>
                                    <span className="text-slate-800">{JSON.stringify(trace.arguments, null, 2)}</span>
                                  </div>
                                  {trace.result_preview && (
                                    <div>
                                      <span className="font-bold text-slate-500">Result Preview: </span>
                                      <span className="text-slate-600 break-all">{trace.result_preview}</span>
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
                      {msg.role === 'user' ? msg.content : renderMarkdownContent(msg.content, false)}
                    </div>

                    {/* Insert to Document Action Bar for Assistant Messages (No Dropdown) */}
                    {msg.role === 'assistant' && msg.id !== 'welcome' && !msg.isError && (() => {
                      const targetSec = msg.targetSection || selectedDocSection || detectTargetSection(msg.content);
                      const isInserted = !!insertedMsgIds[msg.id || ''];
                      return (
                        <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
                          
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Target Section:</span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-primary shadow-2xs">
                              {targetSec}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              applyDocumentPatch(targetSec, msg.content);
                              setInsertedMsgIds(prev => ({ ...prev, [msg.id || '']: true }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                              isInserted
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-primary hover:bg-primary-strong text-white'
                            }`}
                            title={`Sisipkan respon ini ke ${targetSec} pada live preview dokumen`}
                          >
                            {isInserted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>✓ Telah Disisipkan</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>📥 Sisipkan ke Dokumen</span>
                              </>
                            )}
                          </button>

                        </div>
                      );
                    })()}

                  </div>

                  {/* User Avatar */}
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-xs flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                    <Bot className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="bg-white border border-outline rounded-2xl px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>AI sedang mengambil data arsitektur & mengisi spesifikasi teknis...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input & Section Action Chips */}
            <div className="p-3 bg-white border-t border-outline space-y-2">
              
              {/* Selected Section Indicator Banner */}
              {selectedDocSection ? (
                <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
                    <span className="font-bold text-primary text-[10px] uppercase tracking-wider shrink-0">Section Aktif:</span>
                    <span className="font-bold text-slate-800 text-xs truncate">{selectedDocSection}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocSection(null);
                      setInputText('');
                    }}
                    className="p-1 rounded-md hover:bg-indigo-200/60 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-[11px] font-medium shrink-0 ml-2"
                    title="Batalkan pilihan section"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Ganti</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Pilih tombol <strong>[✨ Pilih Section]</strong> pada preview dokumen di kanan untuk mengisi bagian tertentu.</span>
                </div>
              )}

              {/* Textarea Input */}
              <div className="flex items-end gap-2 bg-slate-50 border border-outline rounded-2xl p-2 focus-within:border-primary focus-within:bg-white transition-all shadow-inner">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedDocSection 
                      ? `Ketik instruksi tambahan untuk ${selectedDocSection}...`
                      : "Instruksikan AI untuk mengisi atau merancang spesifikasi teknis..."
                  }
                  disabled={loading}
                  className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none px-2 py-1 leading-relaxed"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || loading}
                  className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-strong disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
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

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Tekan <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono">Enter</kbd> kirim, <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono">Shift+Enter</kbd> baris baru.</span>
                <span>Didukung OpenAI Function Calling & OutSystems Parser</span>
              </div>

            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* RIGHT PANE: LIVE FSD DOCUMENT PREVIEW & RAW MARKDOWN EDITOR */}
        {/* ================================================================= */}
        {(layoutMode === 'split' || layoutMode === 'doc-only') && (
          <div className={`flex flex-col bg-white h-full overflow-hidden ${
            layoutMode === 'split' ? 'w-full lg:w-1/2' : 'w-full'
          }`}>
            
            {/* Document Header Toolbar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-outline flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 leading-none">
                    <span>{activeProject?.name || 'OutSystems'} Technical Specification Document</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-primary border border-indigo-200">
                      v{activeProject?.doc_version || '1.0'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Template: Technical_Specification_Template-v2.md {activeApp ? `| App: ${activeApp.name}` : ''} {activeMod ? `| Modul: ${activeMod.module_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Switch between Live Rendered Preview and Raw Markdown Editor */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setDocViewTab('preview')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-[11px] font-bold transition-all ${
                      docViewTab === 'preview' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Live Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewTab('editor')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-[11px] font-bold transition-all ${
                      docViewTab === 'editor' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Raw Markdown</span>
                  </button>
                </div>

                {/* Copy Markdown */}
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors"
                  title="Salin seluruh isi Markdown"
                >
                  {docCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Auto-saved draft indicator */}
                {draftSavedTime && (
                  <div className="hidden lg:flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-medium" title="Perubahan disimpan otomatis di browser dan tidak akan hilang saat reload">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Tersimpan {draftSavedTime}</span>
                  </div>
                )}

                {/* Export DOCX */}
                <button
                  type="button"
                  onClick={handleExportDocx}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors shadow-sm"
                  title="Export ke Microsoft Word (.docx)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export DOCX</span>
                </button>

                {/* Reset Sections */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset semua konten yang telah disisipkan? Draft yang tersimpan akan dihapus.')) {
                      const key = getDraftKey(selectedProjectId);
                      localStorage.removeItem(key);
                      setSectionContents({});
                      setDocumentMarkdown('');
                      setInsertedMsgIds({});
                      setSelectedDocSection(null);
                      setDraftSavedTime(null);
                      setMessages([defaultWelcomeMessage]);
                      toast.success('Dokumen & draft berhasil direset');
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors flex items-center gap-1 text-[11px] font-medium"
                  title="Hapus semua konten yang telah disisipkan & hapus draft tersimpan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[10px]">Reset</span>
                </button>
              </div>
            </div>

            {/* Document Content View — FSD Section Outline */}
            <div ref={previewContainerRef} className="flex-1 overflow-y-auto bg-slate-50">
              {docLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">Memuat data...</span>
                </div>
              ) : docViewTab === 'editor' ? (
                <div className="h-full flex flex-col space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>Editor Markdown (seluruh konten yang telah disisipkan):</span>
                    <span>{documentMarkdown.split('\n').length} baris</span>
                  </div>
                  <textarea
                    value={documentMarkdown}
                    onChange={(e) => setDocumentMarkdown(e.target.value)}
                    className="flex-1 w-full p-4 font-mono text-xs text-slate-800 bg-white border border-outline rounded-xl resize-none focus:outline-none focus:border-primary leading-relaxed shadow-inner"
                  />
                </div>
              ) : (
                <div className="p-4 space-y-1.5 max-w-full">
                  {/* Doc Title */}
                  <div className="pb-3 mb-4 border-b-2 border-primary flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-black text-base text-primary tracking-tight">
                        {activeProject?.name || 'OutSystems'} — Technical Specification Document
                      </h2>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        v{activeProject?.doc_version || '1.0'} · Klik <strong>[✨ Pilih Section]</strong> pada setiap bagian untuk melengkapi spesifikasi
                      </p>
                    </div>
                    {draftSavedTime && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                        ● Auto-saved
                      </span>
                    )}
                  </div>

                  {FSD_OUTLINE.map((sec) => {
                    const hasChildren = FSD_OUTLINE.some((item) => item.parentId === sec.id);

                    // Parent category divider (for sections that contain sub-sections)
                    if (sec.level === 'parent' && hasChildren) {
                      return (
                        <div key={sec.id} className="mt-6 mb-1">
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-600/5 border-l-4 border-primary rounded-r-lg">
                            <span className="w-2 h-4 bg-gradient-to-b from-primary to-indigo-700 rounded-sm inline-block shrink-0" />
                            <h3 className="font-black text-sm text-slate-900 tracking-tight">{sec.heading}</h3>
                          </div>
                        </div>
                      );
                    }

                    // Sub-section OR Standalone parent section (e.g. 6. Deployment, 7. Appendix)
                    const isSelected = selectedDocSection === sec.heading;
                    const content = sectionContents[sec.heading];
                    const isStandaloneParent = sec.level === 'parent' && !hasChildren;

                    return (
                      <div
                        key={sec.id}
                        id={`outline-sec-${sec.id}`}
                        className={`${isStandaloneParent ? 'mt-5' : 'ml-4'} rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? 'border-primary bg-indigo-50/70 shadow-sm ring-1 ring-primary'
                            : content
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : isStandaloneParent
                                ? 'border-slate-300 bg-white shadow-2xs'
                                : 'border-slate-200/70 bg-white'
                        }`}
                      >
                        {/* Section header row */}
                        <div className={`flex items-center justify-between gap-2 px-3 py-2 ${content ? 'border-b border-slate-200/60' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-3 rounded-full shrink-0 ${content ? 'bg-emerald-500' : isStandaloneParent ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-primary font-black' : content ? 'text-emerald-800' : isStandaloneParent ? 'text-slate-900' : 'text-slate-700'}`}>
                              {sec.heading}
                            </h4>
                            {content && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                ✓ Terisi
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocSection(sec.heading);
                              setInputText(`Lengkapi konten untuk section "${sec.heading}" secara komprehensif menggunakan data spesifikasi OutSystems.`);
                              inputRef.current?.focus();
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                              isSelected
                                ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
                                : 'bg-slate-100 hover:bg-primary hover:text-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{isSelected ? '✓ Terpilih' : '✨ Pilih Section'}</span>
                          </button>
                        </div>

                        {/* Inserted content area */}
                        {content && (
                          <div className="px-4 py-3 text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto">
                            {renderMarkdownContent(content, false)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Status Bar */}
            <div className="px-4 py-1.5 bg-slate-50 border-t border-outline flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Terisi: <strong className="text-primary font-semibold">{Object.keys(sectionContents).length}</strong> dari {FSD_OUTLINE.filter(s => s.level === 'sub' || !FSD_OUTLINE.some(c => c.parentId === s.id)).length} section
              </span>
              <span>
                {selectedDocSection ? (
                  <span className="text-primary font-bold">● Aktif: {selectedDocSection}</span>
                ) : (
                  'Pilih section dari panel kanan'
                )}
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
