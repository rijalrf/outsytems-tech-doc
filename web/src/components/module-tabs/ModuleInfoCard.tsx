import React from 'react';
import { Cpu, Cookie, Box, MoveRight, UserCheck, Monitor } from 'lucide-react';
import type { ModuleSummary } from '../../types/api';

interface ModuleInfoCardProps {
  module: ModuleSummary;
  rawData: Record<string, any> | null;
}

export const ModuleInfoCard: React.FC<ModuleInfoCardProps> = ({ module, rawData }) => {
  const name = rawData?.Name || module.module_name;
  const useCookies = rawData?.UseCookies ?? 'N/A';
  const moduleType = rawData?.ModuleType ?? 'N/A';
  const defaultTransition = rawData?.DefaultTransition ?? 'N/A';
  const userProviderEspace = rawData?.UserProviderEspace ?? 'N/A';
  const webScreenRenderingMode = rawData?.WebScreenRenderingMode ?? 'N/A';

  const infoItems = [
    {
      label: 'Name',
      value: name,
      icon: Cpu,
      badge: module.module_suffix ? `_${module.module_suffix}` : undefined,
    },
    {
      label: 'Use Cookies',
      value: useCookies,
      icon: Cookie,
      isHighlight: useCookies === 'Yes',
    },
    {
      label: 'Module Type',
      value: moduleType,
      icon: Box,
    },
    {
      label: 'Default Transition',
      value: defaultTransition,
      icon: MoveRight,
    },
    {
      label: 'User Provider ESpace',
      value: userProviderEspace,
      icon: UserCheck,
    },
    {
      label: 'Web Screen Rendering Mode',
      value: webScreenRenderingMode,
      icon: Monitor,
    },
  ];

  return (
    <div className="bg-surface rounded-card border border-outline p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-outline/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-on-background uppercase tracking-wide">
              Module Info
            </h3>
            <p className="text-[11px] text-gray-500 font-mono">
              Key: {rawData?.Key || module.espace_key || 'N/A'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-pill bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
          Status: {module.status || 'PARSED'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {infoItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="p-3.5 rounded-xl bg-background border border-outline/60 flex items-start gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-surface text-primary border border-outline/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {item.label}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-on-background truncate">
                    {item.value}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-blue-100 text-primary-strong">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
