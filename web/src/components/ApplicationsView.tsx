import React, { useState } from 'react';
import { 
  AppWindow, 
  UploadCloud, 
  Search, 
  Cpu, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  FileBox, 
  ArrowLeft,
  PackageCheck
} from 'lucide-react';
import type { ProjectSummary, ApplicationSummary } from '../types/api';
import { FileUploadModal } from './FileUploadModal';

interface ApplicationsViewProps {
  project: ProjectSummary;
  applications: ApplicationSummary[];
  loading: boolean;
  onBackToProjects: () => void;
  onSelectApplication: (app: ApplicationSummary) => void;
  onUploadOap: (file: File) => Promise<void>;
  onRefresh: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  project,
  applications,
  loading,
  onBackToProjects,
  onSelectApplication,
  onUploadOap,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const appList = Array.isArray(applications) ? applications : [];
  const filteredApps = appList.filter((app) =>
    app?.name && app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      {/* Project Banner Header */}
      <div className="bg-surface rounded-card-lg border border-outline shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <button
              onClick={onBackToProjects}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Semua Project</span>
            </button>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                <AppWindow className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-on-background tracking-tight">
                {project.name}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 font-normal">
              {project.description || 'Daftar paket aplikasi OutSystems (.oap) yang terdaftar di dalam project ini.'}
            </p>
          </div>

          {/* Upload OAP CTA */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-12 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Aplikasi (.oap)</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aplikasi berdasarkan nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>Total Aplikasi:</span>
          <span className="px-2.5 py-1 rounded-pill bg-surface-soft text-primary border border-blue-200">
            {applications.length} Aplikasi
          </span>
        </div>
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Memuat aplikasi project...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="py-16 px-4 bg-surface rounded-card-lg border border-dashed border-outline flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-soft text-primary flex items-center justify-center">
            <FileBox className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-on-background">Belum ada Aplikasi di Project ini</h3>
            <p className="text-xs text-gray-500">
              Unggah file arsip aplikasi <span className="font-bold text-primary">.oap</span> untuk mengekstrak seluruh modul OML di dalamnya secara otomatis.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-10 px-5 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File .OAP Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => onSelectApplication(app)}
              className="bg-surface rounded-card border border-outline p-6 shadow-sm hover:shadow-card hover:border-primary/80 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header: Icon + Type Badge + Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-primary-strong">
                      {app.file_type ? `.${app.file_type}` : '.OAP'}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      app.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {app.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* App Name */}
                <h3 className="text-lg font-black text-on-background group-hover:text-primary transition-colors leading-snug mb-2">
                  {app.name}
                </h3>

                {/* Modules Stat Box */}
                <div className="p-3 rounded-xl bg-surface-soft border border-blue-100 flex items-center justify-between text-xs mb-4">
                  <span className="text-gray-600 font-medium">Modul Terurai:</span>
                  <div className="flex items-center gap-1.5 font-black text-primary">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{app.total_modules || 0} Modul OML</span>
                  </div>
                </div>
              </div>

              {/* Bottom: Date & Action CTA */}
              <div className="pt-4 border-t border-outline/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(app.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-primary group-hover:text-primary-strong">
                  <span>Buka Modul</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload OAP */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (file) => {
          await onUploadOap(file);
          onRefresh();
        }}
        acceptedExt=".oap"
        title="Upload Aplikasi OutSystems (.oap)"
        subtitle={`File aplikasi ini akan diekstrak dan modul-modulnya akan otomatis ditautkan ke project "${project.name}".`}
      />

    </div>
  );
};
