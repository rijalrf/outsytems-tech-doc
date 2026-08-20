import React, { useState } from 'react';
import { Search, Layers, ShieldCheck, User, Calendar, Columns, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ensureArray, formatBoolean } from '../../utils/helpers';
import { exportStructuresToDocx } from '../../utils/docxExporter';

interface ModuleStructuresTabProps {
  moduleName?: string;
  rawData: Record<string, any> | null;
}

export const ModuleStructuresTab: React.FC<ModuleStructuresTabProps> = ({ moduleName = 'Module', rawData }) => {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const structuresRaw = rawData?.Structures?.Structure;
  const structuresList = ensureArray(structuresRaw);

  const filteredStructures = structuresList.filter((s: any) => {
    const nameMatch = s?.Name?.toLowerCase().includes(search.toLowerCase());
    const attrMatch = ensureArray(s?.Attributes?.Attribute).some((a: any) =>
      a?.Name?.toLowerCase().includes(search.toLowerCase())
    );
    return nameMatch || attrMatch;
  });

  const handleExportDocx = async () => {
    if (structuresList.length === 0) {
      toast.error('Tidak ada data structure untuk diekspor.');
      return;
    }
    setExporting(true);
    try {
      await exportStructuresToDocx(
        moduleName,
        filteredStructures.length > 0 ? filteredStructures : structuresList
      );
      toast.success(`Berhasil mengekspor Structures ke .docx!`);
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
            placeholder="Cari structure atau atribut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs font-bold text-gray-500">
            Total: <span className="text-primary font-black">{structuresList.length}</span> Structures
          </div>

          <button
            onClick={handleExportDocx}
            disabled={exporting || structuresList.length === 0}
            className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            title="Export Structures ke format Microsoft Word (.docx)"
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

      {/* Structures List */}
      {filteredStructures.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <Layers className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Structure ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak mendefinisikan Data Structure kustom atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredStructures.map((structure: any, idx: number) => {
            const attributes = ensureArray(structure?.Attributes?.Attribute);
            const isPublic = structure.Public === 'Yes';

            return (
              <div
                key={structure?.Key || idx}
                className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden"
              >
                {/* Structure Header */}
                <div className="p-4 sm:p-5 bg-background border-b border-outline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-on-background">
                          {structure.Name}
                        </h4>
                        {isPublic && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Public
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Key: {structure.Key} • {attributes.length} Attributes
                        {structure.LastModifiedBy && ` • Modified by: ${structure.LastModifiedBy}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 self-end sm:self-auto">
                    <Columns className="w-3.5 h-3.5 text-primary" />
                    <span>{attributes.length} Atribut</span>
                  </div>
                </div>

                {/* Attributes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-outline/70 text-[11px] font-black text-gray-600 uppercase tracking-wider">
                        <th className="py-3 px-4 w-1/4">Attribute Name</th>
                        <th className="py-3 px-4 w-1/4">Data Type</th>
                        <th className="py-3 px-4 w-1/8 text-center">Mandatory</th>
                        <th className="py-3 px-4 w-1/6">Last Modified By</th>
                        <th className="py-3 px-4 w-1/6">Last Modified Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/50 text-xs">
                      {attributes.map((attr: any, i: number) => {
                        const isMandatory = formatBoolean(attr.IsMandatory);

                        return (
                          <tr key={attr?.Key || i} className="hover:bg-slate-50/60 transition-colors">
                            {/* Attribute Name */}
                            <td className="py-3 px-4 font-bold text-gray-900">
                              <span>{attr.Name}</span>
                            </td>

                            {/* Data Type */}
                            <td className="py-3 px-4 font-mono text-[11px] text-gray-700">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                {attr.DataType || '-'}
                              </span>
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

                            {/* Last Modified By */}
                            <td className="py-3 px-4 text-gray-700">
                              {attr.LastModifiedBy ? (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span>{attr.LastModifiedBy}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </td>

                            {/* Last Modified Date */}
                            <td className="py-3 px-4 text-gray-600">
                              {attr.LastModifiedDate ? (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span>{attr.LastModifiedDate}</span>
                                </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
};
