import React, { useState } from 'react';
import { Search, Zap, User, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { ensureArray, formatBoolean } from '../../utils/helpers';

interface ModuleActionsTabProps {
  rawData: Record<string, any> | null;
}

export const ModuleActionsTab: React.FC<ModuleActionsTabProps> = ({ rawData }) => {
  const [search, setSearch] = useState('');

  const actionsRaw = rawData?.Actions?.Action;
  const actions = ensureArray(actionsRaw);

  const filteredActions = actions.filter((act: any) => {
    const nameMatch = act?.Name?.toLowerCase().includes(search.toLowerCase());
    const descMatch = act?.Description?.toLowerCase().includes(search.toLowerCase());
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
            placeholder="Cari action berdasarkan nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>
        <div className="text-xs font-bold text-gray-500">
          Total: <span className="text-primary font-black">{actions.length}</span> Server Actions
        </div>
      </div>

      {/* Main Table */}
      {filteredActions.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <Zap className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Server Action ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak memiliki server actions atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-outline text-[11px] font-black text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-1/5">Name</th>
                  <th className="py-3.5 px-4 w-1/4">Description</th>
                  <th className="py-3.5 px-4 w-1/6">Last Modified</th>
                  <th className="py-3.5 px-4 w-1/5">Input Parameters</th>
                  <th className="py-3.5 px-4 w-1/5">Output Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60 text-xs">
                {filteredActions.map((act: any, idx: number) => {
                  const inputParams = ensureArray(act?.InputParameters?.InputParameter);
                  const outputParams = ensureArray(act?.OutputParameters?.OutputParameter);

                  return (
                    <tr key={act?.Key || idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="break-all">{act.Name}</span>
                        </div>
                        {act.Function === 'Yes' && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Function
                          </span>
                        )}
                        {act.Public === 'Yes' && (
                          <span className="inline-block mt-1 ml-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Public
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 align-top text-gray-600 leading-relaxed">
                        {act.Description ? (
                          <span>{act.Description}</span>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>

                      {/* Last Modified */}
                      <td className="py-3.5 px-4 align-top text-gray-600">
                        {act.LastModifiedBy ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 font-medium text-gray-800">
                              <User className="w-3 h-3 text-gray-400" />
                              <span>{act.LastModifiedBy}</span>
                            </div>
                            {act.LastModifiedDate && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>{act.LastModifiedDate}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>

                      {/* Input Parameters */}
                      <td className="py-3.5 px-4 align-top">
                        {inputParams.length === 0 ? (
                          <span className="text-gray-400 italic text-[11px]">No inputs</span>
                        ) : (
                          <div className="space-y-2">
                            {inputParams.map((ip: any, i: number) => (
                              <div
                                key={ip?.Key || i}
                                className="p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-blue-900 flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3 text-blue-600 shrink-0" />
                                    {ip.Name}
                                  </span>
                                  {formatBoolean(ip.IsMandatory) && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-600 font-mono text-[10px] break-all">
                                  Type: <span className="font-semibold text-gray-800">{ip.DataType}</span>
                                </div>
                                {ip.Description && (
                                  <div className="text-[10px] text-gray-500 italic">{ip.Description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Output Parameters */}
                      <td className="py-3.5 px-4 align-top">
                        {outputParams.length === 0 ? (
                          <span className="text-gray-400 italic text-[11px]">No outputs</span>
                        ) : (
                          <div className="space-y-2">
                            {outputParams.map((op: any, i: number) => (
                              <div
                                key={op?.Key || i}
                                className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />
                                    {op.Name}
                                  </span>
                                  {formatBoolean(op.IsMandatory) && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-600 font-mono text-[10px] break-all">
                                  Type: <span className="font-semibold text-gray-800">{op.DataType}</span>
                                </div>
                                {op.Description && (
                                  <div className="text-[10px] text-gray-500 italic">{op.Description}</div>
                                )}
                              </div>
                            ))}
                          </div>
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
