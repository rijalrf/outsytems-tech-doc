import React, { useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { ensureArray, formatBoolean } from '../../utils/helpers';

interface ModuleSitePropertiesTabProps {
  rawData: Record<string, any> | null;
}

export const ModuleSitePropertiesTab: React.FC<ModuleSitePropertiesTabProps> = ({ rawData }) => {
  const [search, setSearch] = useState('');

  const sitePropsRaw = rawData?.SiteProperties?.SiteProperty;
  const siteProperties = ensureArray(sitePropsRaw);

  const filteredProps = siteProperties.filter((prop: any) => {
    const nameMatch = prop?.Name?.toLowerCase().includes(search.toLowerCase());
    const descMatch = prop?.Description?.toLowerCase().includes(search.toLowerCase());
    return nameMatch || descMatch;
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari site property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>
        <div className="text-xs font-bold text-gray-500">
          Total: <span className="text-primary font-black">{siteProperties.length}</span> Site Properties
        </div>
      </div>

      {/* Main Table */}
      {filteredProps.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <Settings2 className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Site Property ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak mendefinisikan site properties atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-outline text-[11px] font-black text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-1/4">Property Name</th>
                  <th className="py-3.5 px-4 w-1/4">Data Type</th>
                  <th className="py-3.5 px-4 w-1/2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60 text-xs">
                {filteredProps.map((prop: any, idx: number) => {
                  const isSystem = formatBoolean(prop.IsSystem);

                  return (
                    <tr key={prop?.Key || idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                            <Settings2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="break-all">{prop.Name}</span>
                            {isSystem && (
                              <span className="block mt-0.5 text-[9px] font-black uppercase text-gray-500">
                                System Property
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Data Type */}
                      <td className="py-3.5 px-4 align-top font-mono text-[11px] text-gray-700">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                          {prop.DataType || '-'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 align-top text-gray-600 leading-relaxed">
                        {prop.Description ? (
                          <span>{prop.Description}</span>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
