import React, { useState } from 'react';
import { Search, Database, Columns, KeyRound, ShieldCheck, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ensureArray, formatBoolean } from '../../utils/helpers';
import { exportEntitiesToDocx } from '../../utils/docxExporter';

interface ModuleEntitiesTabProps {
  moduleName?: string;
  rawData: Record<string, any> | null;
}

export const ModuleEntitiesTab: React.FC<ModuleEntitiesTabProps> = ({ moduleName = 'Module', rawData }) => {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const entitiesRaw = rawData?.Entities?.Entity;
  const entitiesList = ensureArray(entitiesRaw);

  // Filter regular entities (non-static)
  const regularEntities = entitiesList.filter(
    (e: any) => e?.IsStaticEntity !== 'Yes' && e?.isStaticEntity !== true
  );

  const filteredEntities = regularEntities.filter((e: any) => {
    const nameMatch = e?.Name?.toLowerCase().includes(search.toLowerCase());
    const attrMatch = ensureArray(e?.Attributes?.Attribute).some((a: any) =>
      a?.Name?.toLowerCase().includes(search.toLowerCase())
    );
    return nameMatch || attrMatch;
  });

  const handleExportDocx = async () => {
    if (regularEntities.length === 0) {
      toast.error('Tidak ada data entity untuk diekspor.');
      return;
    }
    setExporting(true);
    try {
      await exportEntitiesToDocx(
        moduleName,
        filteredEntities.length > 0 ? filteredEntities : regularEntities
      );
      toast.success(`Berhasil mengekspor Database Entities ke .docx!`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor dokumen .docx');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari entity atau atribut kolom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs font-bold text-gray-500">
            Total: <span className="text-primary font-black">{regularEntities.length}</span> Database Entities
          </div>

          <button
            onClick={handleExportDocx}
            disabled={exporting || regularEntities.length === 0}
            className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            title="Export Database Entities ke format Microsoft Word (.docx)"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>Export Docx</span>
          </button>
        </div>
      </div>

      {/* Entities List */}
      {filteredEntities.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <Database className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Database Entity ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak memiliki database entity biasa atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEntities.map((entity: any, idx: number) => {
            const attributes = ensureArray(entity?.Attributes?.Attribute);
            const isPublic = entity.Public === 'Yes' || entity.ExposeReadOnly === 'Yes';

            return (
              <div
                key={entity?.Key || idx}
                className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden"
              >
                {/* Entity Header */}
                <div className="p-4 sm:p-5 bg-background border-b border-outline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-primary flex items-center justify-center font-bold shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-on-background">
                          {entity.Name}
                        </h4>
                        {isPublic && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Public
                          </span>
                        )}
                        {entity.ExposeReadOnly === 'Yes' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Read Only
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Key: {entity.Key} • {attributes.length} Attributes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 self-end sm:self-auto">
                    <Columns className="w-3.5 h-3.5 text-primary" />
                    <span>{attributes.length} Kolom</span>
                  </div>
                </div>

                {/* Attributes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-outline/70 text-[11px] font-black text-gray-600 uppercase tracking-wider">
                        <th className="py-3 px-4 w-1/4">Attribute Name</th>
                        <th className="py-3 px-4 w-1/5">Data Type</th>
                        <th className="py-3 px-4 w-1/8">Length</th>
                        <th className="py-3 px-4 w-1/6">Delete Rule</th>
                        <th className="py-3 px-4 w-1/8 text-center">Mandatory</th>
                        <th className="py-3 px-4 w-1/8 text-center">Auto Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/50 text-xs">
                      {attributes.map((attr: any, i: number) => {
                        const isMandatory = formatBoolean(attr.IsMandatory);
                        const isAutoNumber = formatBoolean(attr.IsAutoNumber);
                        const isId = attr.Name?.toLowerCase() === 'id' || isAutoNumber;

                        return (
                          <tr key={attr?.Key || i} className="hover:bg-slate-50/60 transition-colors">
                            {/* Attribute Name */}
                            <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-1.5">
                              {isId ? (
                                <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 ml-1 mr-1" />
                              )}
                              <span>{attr.Name}</span>
                            </td>

                            {/* Data Type */}
                            <td className="py-3 px-4 font-mono text-[11px] text-gray-700">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                {attr.DataType || '-'}
                              </span>
                            </td>

                            {/* Length */}
                            <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                              {attr.Length || '-'}
                            </td>

                            {/* Delete Rule */}
                            <td className="py-3 px-4 text-gray-600">
                              {attr.DeleteRule ? (
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                                  {attr.DeleteRule}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </td>

                            {/* Mandatory */}
                            <td className="py-3 px-4 text-center">
                              {isMandatory ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium text-[11px]">No</span>
                              )}
                            </td>

                            {/* Auto Number */}
                            <td className="py-3 px-4 text-center">
                              {isAutoNumber ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
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
            );
          })}
        </div>
      )}
    </div>
  );
};
