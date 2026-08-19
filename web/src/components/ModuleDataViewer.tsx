import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Zap,
  Globe,
  Database,
  ListOrdered,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Settings2,
  Code
} from 'lucide-react';
import type { ModuleSummary } from '../types/api';
import { api } from '../services/api';
import { ensureArray } from '../utils/helpers';

import { ModuleInfoCard } from './module-tabs/ModuleInfoCard';
import { ModuleActionsTab } from './module-tabs/ModuleActionsTab';
import { ModuleServiceActionsTab } from './module-tabs/ModuleServiceActionsTab';
import { ModuleEntitiesTab } from './module-tabs/ModuleEntitiesTab';
import { ModuleStaticEntitiesTab } from './module-tabs/ModuleStaticEntitiesTab';
import { ModuleExceptionsTab } from './module-tabs/ModuleExceptionsTab';
import { ModuleStructuresTab } from './module-tabs/ModuleStructuresTab';
import { ModuleRolesTab } from './module-tabs/ModuleRolesTab';
import { ModuleSitePropertiesTab } from './module-tabs/ModuleSitePropertiesTab';
import { ModuleRawJsonTab } from './module-tabs/ModuleRawJsonTab';

interface ModuleDataViewerProps {
  module: ModuleSummary;
  onBackToModules: () => void;
}

type TabType =
  | 'actions'
  | 'service-actions'
  | 'entities'
  | 'static-entities'
  | 'exceptions'
  | 'structures'
  | 'roles'
  | 'site-properties'
  | 'raw-json';

export const ModuleDataViewer: React.FC<ModuleDataViewerProps> = ({
  module,
  onBackToModules,
}) => {
  const [rawData, setRawData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('actions');

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getModuleData(module.id);
        setRawData(data);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data modul');
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [module.id]);

  // Compute counts for tab badges
  const actionsCount = ensureArray(rawData?.Actions?.Action).length;
  const serviceActionsCount = ensureArray(
    rawData?.ServiceAPIMethods?.ServiceAction ||
    rawData?.ServiceAPIMethods?.ServiceApiMethod ||
    rawData?.ServiceActions?.ServiceAction
  ).length;
  
  const allEntities = ensureArray(rawData?.Entities?.Entity);
  const entitiesCount = allEntities.filter(
    (e: any) => e?.IsStaticEntity !== 'Yes' && e?.isStaticEntity !== true
  ).length;
  const staticEntitiesCount = allEntities.filter(
    (e: any) => e?.IsStaticEntity === 'Yes' || e?.isStaticEntity === true
  ).length;

  let exceptionsCount = 0;
  if (rawData?.Exceptions && typeof rawData.Exceptions === 'object') {
    Object.values(rawData.Exceptions).forEach((val) => {
      exceptionsCount += ensureArray(val).length;
    });
  }

  const structuresCount = ensureArray(rawData?.Structures?.Structure).length;
  const rolesCount =
    ensureArray(rawData?.SystemRoles?.SystemRole).length +
    ensureArray(rawData?.Roles?.Role).length;
  const sitePropsCount = ensureArray(rawData?.SiteProperties?.SiteProperty).length;

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'actions', label: 'Action', icon: Zap, count: actionsCount },
    { id: 'service-actions', label: 'Service Action', icon: Globe, count: serviceActionsCount },
    { id: 'entities', label: 'Entities', icon: Database, count: entitiesCount },
    { id: 'static-entities', label: 'Static Entities', icon: ListOrdered, count: staticEntitiesCount },
    { id: 'exceptions', label: 'Exception', icon: AlertTriangle, count: exceptionsCount },
    { id: 'structures', label: 'Structures', icon: Layers, count: structuresCount },
    { id: 'roles', label: 'Roles', icon: ShieldAlert, count: rolesCount },
    { id: 'site-properties', label: 'Site Properties', icon: Settings2, count: sitePropsCount },
    { id: 'raw-json', label: 'Raw JSON', icon: Code },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Breadcrumb Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToModules}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary transition-colors bg-surface px-4 py-2 rounded-pill border border-outline w-fit shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Kembali ke Modul {module.module_name}</span>
        </button>
      </div>

      {/* 1. Module Info Top Card */}
      <ModuleInfoCard module={module} rawData={rawData} />

      {/* Loading & Error States */}
      {loading ? (
        <div className="py-24 bg-surface rounded-card border border-outline shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Memuat data modul OutSystems...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-surface rounded-card border border-rose-200 text-center space-y-3 shadow-2xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-pill bg-rose-100 text-rose-800 text-xs font-bold hover:bg-rose-200 transition-colors"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 2. Tabs Navigation */}
          <div className="bg-surface rounded-card border border-outline p-1.5 shadow-2xs overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-primary hover:bg-surface-soft'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tab Content View */}
          <div className="pt-2">
            {activeTab === 'actions' && <ModuleActionsTab rawData={rawData} />}
            {activeTab === 'service-actions' && <ModuleServiceActionsTab rawData={rawData} />}
            {activeTab === 'entities' && <ModuleEntitiesTab rawData={rawData} />}
            {activeTab === 'static-entities' && <ModuleStaticEntitiesTab rawData={rawData} />}
            {activeTab === 'exceptions' && <ModuleExceptionsTab rawData={rawData} />}
            {activeTab === 'structures' && <ModuleStructuresTab rawData={rawData} />}
            {activeTab === 'roles' && <ModuleRolesTab rawData={rawData} />}
            {activeTab === 'site-properties' && <ModuleSitePropertiesTab rawData={rawData} />}
            {activeTab === 'raw-json' && (
              <ModuleRawJsonTab moduleName={module.module_name} rawData={rawData} />
            )}
          </div>
        </div>
      )}

    </div>
  );
};
