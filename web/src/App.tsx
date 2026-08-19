import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Breadcrumbs } from './components/Breadcrumbs';
import { ProjectsView } from './components/ProjectsView';
import { ApplicationsView } from './components/ApplicationsView';
import { ModulesView } from './components/ModulesView';
import { ModuleDataViewer } from './components/ModuleDataViewer';
import { api } from './services/api';
import type { 
  ProjectSummary, 
  ApplicationSummary, 
  ModuleSummary, 
  ProjectCreate 
} from './types/api';

type ViewMode = 'projects' | 'applications' | 'modules' | 'module-detail';

export const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('projects');
  
  // Data State
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  
  // Selection State
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationSummary | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleSummary | null>(null);

  // Loading & Global Notification State
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Fetch All Projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal memuat daftar project');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Applications for a Project
  const loadApplications = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const data = await api.getProjectApplications(projectId);
      setApplications(data);
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal memuat aplikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Modules for an Application
  const loadModules = useCallback(async (appId: string) => {
    setLoading(true);
    try {
      const data = await api.getApplicationModules(appId);
      setModules(data);
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal memuat modul');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Navigation Handlers
  const handleSelectProject = async (project: ProjectSummary) => {
    setSelectedProject(project);
    setSelectedApp(null);
    setSelectedModule(null);
    setView('applications');
    await loadApplications(project.id);
  };

  const handleSelectApp = async (app: ApplicationSummary) => {
    setSelectedApp(app);
    setSelectedModule(null);
    setView('modules');
    await loadModules(app.id);
  };

  const handleSelectModule = (mod: ModuleSummary) => {
    setSelectedModule(mod);
    setView('module-detail');
  };

  const handleGoToProjects = () => {
    setSelectedProject(null);
    setSelectedApp(null);
    setSelectedModule(null);
    setView('projects');
    loadProjects();
  };

  const handleGoToApplications = () => {
    if (selectedProject) {
      setSelectedApp(null);
      setSelectedModule(null);
      setView('applications');
      loadApplications(selectedProject.id);
    } else {
      handleGoToProjects();
    }
  };

  const handleGoToModules = () => {
    if (selectedApp) {
      setSelectedModule(null);
      setView('modules');
      loadModules(selectedApp.id);
    } else if (selectedProject) {
      handleGoToApplications();
    } else {
      handleGoToProjects();
    }
  };

  // Actions
  const handleCreateProject = async (data: ProjectCreate) => {
    try {
      await api.createProject(data);
      showNotification('success', `Project "${data.name}" berhasil dibuat!`);
      await loadProjects();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal membuat project');
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.deleteProject(projectId);
      showNotification('success', 'Project berhasil dihapus.');
      await loadProjects();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal menghapus project');
    }
  };

  const handleUploadOap = async (file: File) => {
    if (!selectedProject) return;
    try {
      const res = await api.uploadFile(file, selectedProject.id);
      showNotification('success', res.message || 'File .oap berhasil diunggah dan diekstrak!');
      await loadApplications(selectedProject.id);
      await loadProjects();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengunggah file .oap');
      throw err;
    }
  };

  const handleUploadOml = async (file: File) => {
    try {
      const res = await api.uploadFile(file, selectedProject?.id);
      showNotification('success', res.message || 'File .oml berhasil diunggah dan diproses!');
      if (selectedApp) {
        await loadModules(selectedApp.id);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengunggah file .oml');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-roboto selection:bg-primary-soft selection:text-primary">
      
      {/* 1. Global Navigation Bar */}
      <Header onGoHome={handleGoToProjects} />

      {/* Main Container */}
      <main className="flex-grow max-w-container w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Toast Notification */}
        {notification && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-700 ml-4">✕</button>
          </div>
        )}

        {/* 2. Hierarchical Breadcrumbs Navigation */}
        <Breadcrumbs
          currentProject={selectedProject}
          currentApp={selectedApp}
          currentModule={selectedModule}
          onNavigateToProjects={handleGoToProjects}
          onNavigateToApplications={handleGoToApplications}
          onNavigateToModules={handleGoToModules}
        />

        {/* 3. Dynamic Page View */}
        {view === 'projects' && (
          <ProjectsView
            projects={projects}
            loading={loading}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onRefresh={loadProjects}
          />
        )}

        {view === 'applications' && selectedProject && (
          <ApplicationsView
            project={selectedProject}
            applications={applications}
            loading={loading}
            onBackToProjects={handleGoToProjects}
            onSelectApplication={handleSelectApp}
            onUploadOap={handleUploadOap}
            onRefresh={() => loadApplications(selectedProject.id)}
          />
        )}

        {view === 'modules' && selectedApp && (
          <ModulesView
            project={selectedProject}
            application={selectedApp}
            modules={modules}
            loading={loading}
            onBackToApps={handleGoToApplications}
            onSelectModule={handleSelectModule}
            onUploadOml={handleUploadOml}
            onRefresh={() => loadModules(selectedApp.id)}
          />
        )}

        {view === 'module-detail' && selectedModule && (
          <ModuleDataViewer
            module={selectedModule}
            onBackToModules={handleGoToModules}
          />
        )}

      </main>

      {/* Global Footer */}
      <footer className="bg-surface border-t border-outline py-6 text-xs text-gray-500 mt-auto">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} OutSystems Documentation & Architecture Generator.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <span>FastAPI Backend Connected</span>
            <span>•</span>
            <span>REST API v1</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
