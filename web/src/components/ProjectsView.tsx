import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  AppWindow, 
  Calendar, 
  ArrowRight, 
  Trash2, 
  Loader2, 
  FolderPlus, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { ProjectSummary, ProjectCreate } from '../types/api';

interface ProjectsViewProps {
  projects: ProjectSummary[];
  loading: boolean;
  onSelectProject: (project: ProjectSummary) => void;
  onCreateProject: (data: ProjectCreate) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onRefresh: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  loading,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const projectList = Array.isArray(projects) ? projects : [];
  const filteredProjects = projectList.filter((p) =>
    (p?.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p?.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Nama project wajib diisi');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      await onCreateProject({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Gagal membuat project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (window.confirm(`Yakin ingin menghapus project "${projectName}"?`)) {
      await onDeleteProject(projectId);
      onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner / Hero Card */}
      <div className="bg-surface rounded-card-lg border border-outline shadow-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-primary-soft text-primary text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Project Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-on-background tracking-tight">
              Manajemen Project OutSystems
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-normal">
              Kelola arsitektur aplikasi OutSystems (.oap) dan modul OML secara terpusat untuk inspeksi dokumentasi teknis.
            </p>
          </div>

          {/* Create Project Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Project Baru</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari project berdasarkan nama atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>Total Project:</span>
          <span className="px-2.5 py-1 rounded-pill bg-surface-soft text-primary border border-blue-200">
            {projects.length} Project
          </span>
        </div>
      </div>

      {/* Projects List Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Memuat data project...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 px-4 bg-surface rounded-card-lg border border-dashed border-outline flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-soft text-primary flex items-center justify-center">
            <FolderPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-on-background">Belum ada Project</h3>
            <p className="text-xs text-gray-500">
              Mulai dengan membuat project baru untuk mengelompokkan aplikasi (.oap) dan modul OutSystems Anda.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-5 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Project Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-surface rounded-card border border-outline p-6 shadow-sm hover:shadow-card hover:border-primary/80 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Icon, Total Apps Badge, Delete */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-blue-50 border border-blue-200/60 text-xs font-bold text-primary">
                      <AppWindow className="w-3.5 h-3.5" />
                      <span>{project.total_applications || 0} App</span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, project.id, project.name)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Project Title */}
                <h3 className="text-lg font-black text-on-background group-hover:text-primary transition-colors leading-snug mb-2">
                  {project.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-4">
                  {project.description || 'Tidak ada deskripsi untuk project ini.'}
                </p>
              </div>

              {/* Bottom Row: Date & Action CTA */}
              <div className="pt-4 border-t border-outline/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(project.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-primary group-hover:text-primary-strong">
                  <span>Lihat Aplikasi</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Project */}
      {isModalOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface w-full max-w-md rounded-panel border border-outline shadow-2xl p-6 sm:p-8 relative my-auto">
            <h3 className="text-xl font-black text-on-background mb-1">Buat Project Baru</h3>
            <p className="text-xs text-gray-500 mb-6">
              Masukkan nama dan deskripsi ringkas untuk project OutSystems Anda.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nama Project <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Core Banking System"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan ringkas tentang ruang lingkup atau arsitektur project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="h-10 px-4 rounded-pill border border-outline text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
