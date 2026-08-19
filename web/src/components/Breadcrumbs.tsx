import React from 'react';
import { ChevronRight, FolderKanban, AppWindow, Cpu } from 'lucide-react';
import type { ProjectSummary, ApplicationSummary, ModuleSummary } from '../types/api';

interface BreadcrumbsProps {
  currentProject: ProjectSummary | null;
  currentApp: ApplicationSummary | null;
  currentModule: ModuleSummary | null;
  onNavigateToProjects: () => void;
  onNavigateToApplications: () => void;
  onNavigateToModules: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentProject,
  currentApp,
  currentModule,
  onNavigateToProjects,
  onNavigateToApplications,
  onNavigateToModules,
}) => {
  return (
    <nav className="flex items-center gap-2 py-3 px-4 sm:px-6 bg-surface rounded-xl border border-outline text-xs font-semibold text-gray-500 overflow-x-auto shadow-sm">
      
      {/* Root / Projects */}
      <button
        onClick={onNavigateToProjects}
        className="flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap"
      >
        <FolderKanban className="w-3.5 h-3.5 text-primary" />
        <span>Projects</span>
      </button>

      {/* Project Item */}
      {currentProject && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <button
            onClick={onNavigateToApplications}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              !currentApp ? 'text-primary font-bold' : 'hover:text-primary'
            }`}
          >
            <span>{currentProject.name}</span>
          </button>
        </>
      )}

      {/* Application Item */}
      {currentApp && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <button
            onClick={onNavigateToModules}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              !currentModule ? 'text-primary font-bold' : 'hover:text-primary'
            }`}
          >
            <AppWindow className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{currentApp.name}</span>
          </button>
        </>
      )}

      {/* Module Item */}
      {currentModule && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-primary font-bold whitespace-nowrap">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{currentModule.module_name}</span>
          </div>
        </>
      )}

    </nav>
  );
};
