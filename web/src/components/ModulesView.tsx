import React, { useState } from 'react';
import { 
  Cpu, 
  UploadCloud, 
  Search, 
  Key, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  FileCode, 
  ArrowLeft,
  Terminal
} from 'lucide-react';
import type { ProjectSummary, ApplicationSummary, ModuleSummary } from '../types/api';
import { FileUploadModal } from './FileUploadModal';

interface ModulesViewProps {
  project: ProjectSummary | null;
  application: ApplicationSummary;
  modules: ModuleSummary[];
  loading: boolean;
  onBackToApps: () => void;
  onSelectModule: (module: ModuleSummary) => void;
  onUploadOml: (file: File) => Promise<void>;
  onRefresh: () => void;
}

export const ModulesView: React.FC<ModulesViewProps> = ({
  project,
  application,
  modules,
  loading,
  onBackToApps,
  onSelectModule,
  onUploadOml,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const modList = Array.isArray(modules) ? modules : [];
  const filteredModules = modList.filter((mod) =>
    (mod?.module_name && mod.module_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (mod?.module_suffix && mod.module_suffix.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSuffixBadgeColor = (suffix: string | null) => {
    if (!suffix) return 'bg-gray-100 text-gray-700 border-gray-200';
    const upper = suffix.toUpperCase();
    if (upper.includes('CS') || upper.includes('CORE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (upper.includes('WEB') || upper.includes('UI')) {
      return 'bg-blue-50 text-primary border-blue-200';
    }
    if (upper.includes('BL') || upper.includes('LOGIC')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (upper.includes('IS') || upper.includes('INT')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="space-y-8">
      
      {/* Application Banner Header */}
      <div className="bg-surface rounded-card-lg border border-outline shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <button
              onClick={onBackToApps}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar Aplikasi</span>
            </button>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-on-background tracking-tight">
                  {application.name}
                </h1>
                {project && (
                  <p className="text-xs text-gray-500 font-medium">
                    Project: <span className="text-primary font-bold">{project.name}</span>
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 font-normal">
              Daftar modul OML yang diekstrak dari aplikasi ini. Klik modul untuk menginspeksi respon data mentah OutSystems.
            </p>
          </div>

          {/* Upload OML CTA */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-12 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Modul (.oml)</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari modul atau suffix (CS, WEB, BL, IS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>Total Modul:</span>
          <span className="px-2.5 py-1 rounded-pill bg-indigo-50 text-indigo-700 border border-indigo-200">
            {modules.length} Modul OML
          </span>
        </div>
      </div>

      {/* Modules List Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Memuat modul OML...</p>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="py-16 px-4 bg-surface rounded-card-lg border border-dashed border-outline flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileCode className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-on-background">Belum ada Modul OML</h3>
            <p className="text-xs text-gray-500">
              Unggah file modul tunggal <span className="font-bold text-primary">.oml</span> ke aplikasi ini untuk mem-parsing data arsitekturnya.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-10 px-5 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File .OML Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => onSelectModule(mod)}
              className="bg-surface rounded-card border border-outline p-6 shadow-sm hover:shadow-card hover:border-indigo-400 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header: Suffix Badge & Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-pill border ${getSuffixBadgeColor(mod.module_suffix)}`}>
                      {mod.module_suffix ? `_${mod.module_suffix}` : 'OML MODULE'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    mod.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {mod.status || 'PARSED'}
                  </span>
                </div>

                {/* Module Name */}
                <h3 className="text-lg font-black text-on-background group-hover:text-indigo-600 transition-colors leading-snug mb-3">
                  {mod.module_name}
                </h3>

                {/* ESpace Key Info */}
                {mod.espace_key && (
                  <div className="p-2.5 rounded-xl bg-background border border-outline flex items-center gap-2 text-[11px] text-gray-600 mb-4 font-mono truncate">
                    <Key className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{mod.espace_key}</span>
                  </div>
                )}
              </div>

              {/* Bottom: Date & Raw Data CTA */}
              <div className="pt-4 border-t border-outline/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(mod.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-primary group-hover:text-indigo-600">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Lihat Respon Mentah</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload OML */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (file) => {
          await onUploadOml(file);
          onRefresh();
        }}
        acceptedExt=".oml"
        title="Upload Modul OutSystems (.oml)"
        subtitle={`Unggah file modul tunggal .oml untuk diproses dan ditautkan ke project "${project?.name || application.name}".`}
      />

    </div>
  );
};
