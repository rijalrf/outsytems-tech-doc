import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  AppWindow, 
  Calendar, 
  ArrowRight, 
  Trash2, 
  Edit3,
  Loader2, 
  FolderPlus, 
  Sparkles,
  AlertCircle,
  Building2,
  Cpu,
  FileCheck,
  X
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import type { ProjectSummary, ProjectCreate, ProjectUpdate } from '../types/api';

interface ProjectsViewProps {
  projects: ProjectSummary[];
  loading: boolean;
  onSelectProject: (project: ProjectSummary) => void;
  onCreateProject: (data: ProjectCreate) => Promise<void>;
  onUpdateProject?: (projectId: string, data: ProjectUpdate) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onRefresh: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  loading,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [platform, setPlatform] = useState('OutSystems 11');
  const [businessUnit, setBusinessUnit] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [technicalLeader, setTechnicalLeader] = useState('');
  const [startDate, setStartDate] = useState('');
  const [goLiveDate, setGoLiveDate] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docStatus, setDocStatus] = useState('Draft');
  const [background, setBackground] = useState('');
  const [objectives, setObjectives] = useState('');

  const [activeFormTab, setActiveFormTab] = useState<'general' | 'team' | 'scope'>('general');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const projectList = Array.isArray(projects) ? projects : [];
  const filteredProjects = projectList.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p?.name?.toLowerCase().includes(q) || p?.project_name?.toLowerCase().includes(q);
    const descMatch = p?.description?.toLowerCase().includes(q) || p?.background?.toLowerCase().includes(q);
    const buMatch = p?.business_unit?.toLowerCase().includes(q);
    const leadMatch = p?.technical_leader?.toLowerCase().includes(q) || p?.project_manager?.toLowerCase().includes(q);
    return nameMatch || descMatch || buMatch || leadMatch;
  });

  const resetForm = () => {
    setEditingProjectId(null);
    setProjectName('');
    setPlatform('OutSystems 11');
    setBusinessUnit('');
    setProjectManager('');
    setTechnicalLeader('');
    setStartDate('');
    setGoLiveDate('');
    setDocVersion('1.0');
    setDocStatus('Draft');
    setBackground('');
    setObjectives('');
    setModalError(null);
    setActiveFormTab('general');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, project: ProjectSummary) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setProjectName(project.project_name || project.name || '');
    setPlatform(project.platform || 'OutSystems 11');
    setBusinessUnit(project.business_unit || '');
    setProjectManager(project.project_manager || '');
    setTechnicalLeader(project.technical_leader || '');
    setStartDate(project.start_date || '');
    setGoLiveDate(project.go_live_date || '');
    setDocVersion(project.doc_version || '1.0');
    setDocStatus(project.doc_status || 'Draft');
    setBackground(project.background || project.description || '');
    setObjectives(project.objectives || '');
    setModalError(null);
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setModalError('Nama project wajib diisi');
      setActiveFormTab('general');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    const payload = {
      name: projectName.trim(),
      project_name: projectName.trim(),
      platform: platform.trim() || undefined,
      business_unit: businessUnit.trim() || undefined,
      project_manager: projectManager.trim() || undefined,
      technical_leader: technicalLeader.trim() || undefined,
      start_date: startDate || undefined,
      go_live_date: goLiveDate || undefined,
      doc_version: docVersion.trim() || '1.0',
      doc_status: docStatus || 'Draft',
      background: background.trim() || undefined,
      description: background.trim() || undefined,
      objectives: objectives.trim() || undefined,
    };

    try {
      if (editingProjectId && onUpdateProject) {
        await onUpdateProject(editingProjectId, payload);
      } else {
        await onCreateProject(payload);
      }
      setIsModalOpen(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan data project.');
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleRequestDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    setDeleteTarget({ id: projectId, name: projectName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteProject(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus project');
    } finally {
      setDeleting(false);
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
              <span>Project Architecture Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-on-background tracking-tight">
              Manajemen Project OutSystems
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-normal">
              Kelola master informasi, metadata tim, platform, dan ruang lingkup project OutSystems (.oap/.oml) untuk generasi dokumen teknis enterprise secara presisi.
            </p>
          </div>

          {/* Create Project Button */}
          <button
            onClick={handleOpenCreateModal}
            className="h-12 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer"
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
            placeholder="Cari project berdasarkan nama, BU, PM, atau lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>Total Project Terdaftar:</span>
          <span className="px-3 py-1 rounded-pill bg-surface-soft text-primary border border-blue-200">
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
            onClick={handleOpenCreateModal}
            className="h-10 px-5 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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
                {/* Top Row: Icon, Badges, Actions */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-pill bg-blue-50 border border-blue-200/60 text-[11px] font-bold text-primary">
                      <AppWindow className="w-3 h-3" />
                      <span>{project.total_applications || 0} App</span>
                    </div>

                    <button
                      onClick={(e) => handleOpenEditModal(e, project)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors"
                      title="Edit Master Project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleRequestDelete(e, project.id, project.project_name || project.name)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Project Title */}
                <h3 className="text-base sm:text-lg font-black text-on-background group-hover:text-primary transition-colors leading-snug mb-2">
                  {project.project_name || project.name}
                </h3>

                {/* Meta Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.platform && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      <Cpu className="w-3 h-3 text-slate-500" />
                      {project.platform}
                    </span>
                  )}
                  {project.business_unit && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {project.business_unit}
                    </span>
                  )}
                  {project.doc_status && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      project.doc_status === 'Final' || project.doc_status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : project.doc_status === 'In Review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <FileCheck className="w-3 h-3" />
                      v{project.doc_version || '1.0'} • {project.doc_status}
                    </span>
                  )}
                </div>

                {/* Description / Background Preview */}
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-4">
                  {project.background || project.description || 'Belum ada ringkasan latar belakang proyek.'}
                </p>

                {/* Team Info (PM & Tech Lead) */}
                {(project.project_manager || project.technical_leader) && (
                  <div className="mb-4 pt-2.5 border-t border-dashed border-outline/70 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    {project.project_manager && (
                      <div className="truncate">
                        <span className="font-semibold text-gray-700 block">PM:</span>
                        <span className="truncate">{project.project_manager}</span>
                      </div>
                    )}
                    {project.technical_leader && (
                      <div className="truncate">
                        <span className="font-semibold text-gray-700 block">Tech Lead:</span>
                        <span className="truncate">{project.technical_leader}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row: Date & Action CTA */}
              <div className="pt-3 border-t border-outline/70 flex items-center justify-between text-xs">
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

      {/* Modal Add / Edit Project */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface w-full max-w-2xl rounded-panel border border-outline shadow-2xl p-6 sm:p-8 relative my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-outline">
              <div>
                <h3 className="text-xl font-black text-on-background">
                  {editingProjectId ? 'Edit Informasi Master Project' : 'Buat Project Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lengkapi informasi arsitektur dan tata kelola untuk mengisi dokumen spesifikasi teknis otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 pt-3 pb-4 border-b border-outline text-xs font-bold text-gray-600">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFormTab === 'general'
                    ? 'bg-primary-soft text-primary font-black shadow-xs'
                    : 'hover:bg-slate-100 text-gray-600'
                }`}
              >
                1. Identitas & Platform
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('team')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFormTab === 'team'
                    ? 'bg-primary-soft text-primary font-black shadow-xs'
                    : 'hover:bg-slate-100 text-gray-600'
                }`}
              >
                2. Tim & Jadwal
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('scope')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFormTab === 'scope'
                    ? 'bg-primary-soft text-primary font-black shadow-xs'
                    : 'hover:bg-slate-100 text-gray-600'
                }`}
              >
                3. Ruang Lingkup & Latar Belakang
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="flex-grow overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* TAB 1: IDENTITAS & PLATFORM */}
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nama Project <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Hotel Booking System / Core Banking System"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Platform OutSystems
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: OutSystems 11 / ODC / Reactive"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Business Unit / Klien
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Divisi Digital Banking / PT XYZ"
                        value={businessUnit}
                        onChange={(e) => setBusinessUnit(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Versi Dokumen
                      </label>
                      <input
                        type="text"
                        placeholder="1.0"
                        value={docVersion}
                        onChange={(e) => setDocVersion(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Status Dokumen
                      </label>
                      <select
                        value={docStatus}
                        onChange={(e) => setDocStatus(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      >
                        <option value="Draft">Draft</option>
                        <option value="In Review">In Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIM & JADWAL */}
              {activeFormTab === 'team' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Project Manager (PM)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Budi Santoso"
                        value={projectManager}
                        onChange={(e) => setProjectManager(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Technical Leader
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bayu Pratama"
                        value={technicalLeader}
                        onChange={(e) => setTechnicalLeader(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Tanggal Mulai Project
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Target Tanggal Go-Live
                      </label>
                      <input
                        type="date"
                        value={goLiveDate}
                        onChange={(e) => setGoLiveDate(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RUANG LINGKUP & LATAR BELAKANG */}
              {activeFormTab === 'scope' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Latar Belakang Masalah Bisnis (Background)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Jelaskan masalah bisnis, proses manual saat ini, dan urgensi pembangunan aplikasi..."
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Tujuan & Sasaran Aplikasi (Objectives)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Poin-poin tujuan utama (misal: Efisiensi reservasi 80%, transparansi data real-time, integrasi payment gateway)..."
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-outline text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-outline flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>Bagian {activeFormTab === 'general' ? '1' : activeFormTab === 'team' ? '2' : '3'} dari 3</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={submitting}
                    className="h-10 px-4 rounded-pill border border-outline text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingProjectId ? 'Perbarui Project' : 'Simpan Project'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modern Confirm Modal (Zero Native Alert) */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Hapus Project "${deleteTarget?.name}"?`}
        message="Seluruh aplikasi (.oap / .oml), modul, dan seluruh response data parsing di dalamnya akan ikut terhapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        isDanger={true}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
};
