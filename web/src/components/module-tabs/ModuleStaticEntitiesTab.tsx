import React, { useState } from 'react';
import { Search, Database, ListOrdered, ShieldCheck, KeyRound } from 'lucide-react';
import { ensureArray, formatBoolean } from '../../utils/helpers';

interface ModuleStaticEntitiesTabProps {
  rawData: Record<string, any> | null;
}

export const ModuleStaticEntitiesTab: React.FC<ModuleStaticEntitiesTabProps> = ({ rawData }) => {
  const [search, setSearch] = useState('');

  const entitiesRaw = rawData?.Entities?.Entity;
  const entitiesList = ensureArray(entitiesRaw);

  // Filter static entities
  const staticEntities = entitiesList.filter(
    (e: any) => e?.IsStaticEntity === 'Yes' || e?.isStaticEntity === true
  );

  const filteredStaticEntities = staticEntities.filter((e: any) => {
    const nameMatch = e?.Name?.toLowerCase().includes(search.toLowerCase());
    const attrMatch = ensureArray(e?.Attributes?.Attribute).some((a: any) =>
      a?.Name?.toLowerCase().includes(search.toLowerCase())
    );
    const recordMatch = ensureArray(e?.StaticRecords?.StaticRecord).some((r: any) =>
      r?.Name?.toLowerCase().includes(search.toLowerCase())
    );
    return nameMatch || attrMatch || recordMatch;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari static entity, atribut, atau record..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>
        <div className="text-xs font-bold text-gray-500">
          Total: <span className="text-primary font-black">{staticEntities.length}</span> Static Entities
        </div>
      </div>

      {/* Static Entities List */}
      {filteredStaticEntities.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <Database className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Static Entity ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak memiliki static entity (enum/lookup tables) atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredStaticEntities.map((entity: any, idx: number) => {
            const attributes = ensureArray(entity?.Attributes?.Attribute);
            const staticRecords = ensureArray(entity?.StaticRecords?.StaticRecord);
            const isPublic = entity.Public === 'Yes' || entity.ExposeReadOnly === 'Yes';

            // Map attribute keys to attribute names for fast lookup
            const attrKeyToName: Record<string, string> = {};
            attributes.forEach((attr: any) => {
              if (attr?.Key) {
                attrKeyToName[attr.Key] = attr.Name;
              }
            });

            return (
              <div
                key={entity?.Key || idx}
                className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden"
              >
                {/* Entity Header */}
                <div className="p-4 sm:p-5 bg-background border-b border-outline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-on-background">
                          {entity.Name}
                        </h4>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Static Entity
                        </span>
                        {isPublic && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Public
                          </span>
                        )}
                        {entity.ExposeReadOnly === 'Yes' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-primary-strong">
                            Read Only
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Key: {entity.Key} • {attributes.length} Attributes • {staticRecords.length} Static Records
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 1: Attributes Table */}
                <div className="p-4 bg-slate-50/50 border-b border-outline">
                  <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>1. Attributes Definition</span>
                  </h5>
                  <div className="overflow-x-auto bg-surface rounded-xl border border-outline/70">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-outline/70 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Data Type</th>
                          <th className="py-2.5 px-3">Length</th>
                          <th className="py-2.5 px-3">Delete Rule</th>
                          <th className="py-2.5 px-3 text-center">Mandatory</th>
                          <th className="py-2.5 px-3 text-center">Auto Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/50 text-xs">
                        {attributes.map((attr: any, i: number) => {
                          const isMandatory = formatBoolean(attr.IsMandatory);
                          const isAutoNumber = formatBoolean(attr.IsAutoNumber);
                          const isId = attr.Name?.toLowerCase() === 'id' || isAutoNumber;

                          return (
                            <tr key={attr?.Key || i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-gray-900 flex items-center gap-1">
                                {isId ? (
                                  <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mr-1" />
                                )}
                                <span>{attr.Name}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                  {attr.DataType || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                                {attr.Length || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 text-[11px]">
                                {attr.DeleteRule || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isMandatory ? (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 font-black text-[9px] border border-rose-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium text-[11px]">No</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isAutoNumber ? (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-black text-[9px] border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium text-[11px]">No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Static Records Table */}
                <div className="p-4">
                  <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-primary" />
                    <span>2. Static Records ({staticRecords.length})</span>
                  </h5>
                  {staticRecords.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Tidak ada record statis terdefinisi.</p>
                  ) : (
                    <div className="overflow-x-auto bg-surface rounded-xl border border-outline/70">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-outline/70 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-1/4">Record Name</th>
                            {attributes.map((attr: any) => (
                              <th key={attr?.Key || attr?.Name} className="py-2.5 px-3">
                                {attr.Name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline/50 text-xs">
                          {staticRecords.map((rec: any, rIdx: number) => {
                            const valList = ensureArray(rec?.AttributeValues?.StaticRecordAttributeValue);
                            const valMap: Record<string, string> = {};
                            valList.forEach((v: any) => {
                              if (v?.Attribute) {
                                valMap[v.Attribute] = v.Value ?? '-';
                              }
                            });

                            return (
                              <tr key={rec?.Key || rIdx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-gray-900">
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                    {rec.Name}
                                  </span>
                                </td>
                                {attributes.map((attr: any) => {
                                  const rawVal = valMap[attr?.Key];
                                  const displayVal = rawVal !== undefined ? String(rawVal).replace(/^"(.*)"$/, '$1') : '-';
                                  return (
                                    <td key={attr?.Key || attr?.Name} className="py-2.5 px-3 font-mono text-[11px] text-gray-700">
                                      {displayVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
