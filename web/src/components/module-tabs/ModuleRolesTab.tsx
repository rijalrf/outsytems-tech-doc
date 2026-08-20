import React, { useState } from 'react';
import { Search, ShieldAlert, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ensureArray } from '../../utils/helpers';
import { exportRolesToDocx } from '../../utils/docxExporter';

interface ModuleRolesTabProps {
  moduleName?: string;
  rawData: Record<string, any> | null;
}

export const ModuleRolesTab: React.FC<ModuleRolesTabProps> = ({ moduleName = 'Module', rawData }) => {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const systemRoles = ensureArray(rawData?.SystemRoles?.SystemRole);
  const customRoles = ensureArray(rawData?.Roles?.Role);
  const allRoles = [...systemRoles, ...customRoles];

  const filteredRoles = allRoles.filter((role: any) => {
    const nameMatch = role?.Name?.toLowerCase().includes(search.toLowerCase());
    const descMatch = role?.Description?.toLowerCase().includes(search.toLowerCase());
    return nameMatch || descMatch;
  });

  const handleExportDocx = async () => {
    if (allRoles.length === 0) {
      toast.error('Tidak ada data roles untuk diekspor.');
      return;
    }
    setExporting(true);
    try {
      await exportRolesToDocx(
        moduleName,
        filteredRoles.length > 0 ? filteredRoles : allRoles
      );
      toast.success(`Berhasil mengekspor Roles ke .docx!`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor dokumen .docx');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari role berdasarkan nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs font-bold text-gray-500">
            Total: <span className="text-primary font-black">{allRoles.length}</span> Roles
          </div>

          <button
            onClick={handleExportDocx}
            disabled={exporting || allRoles.length === 0}
            className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            title="Export Roles ke format Microsoft Word (.docx)"
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

      {/* Main Table */}
      {filteredRoles.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Role ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak mendefinisikan roles atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-outline text-[11px] font-black text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-1/3">Role Name</th>
                  <th className="py-3.5 px-4 w-2/3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60 text-xs">
                {filteredRoles.map((role: any, idx: number) => (
                  <tr key={role?.Key || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0 border border-blue-100">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span>{role.Name}</span>
                        {role.Key && (
                          <p className="text-[10px] text-gray-400 font-mono font-normal">
                            {role.Key}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-gray-600 leading-relaxed">
                      {role.Description ? (
                        <span>{role.Description}</span>
                      ) : (
                        <span className="text-gray-400 italic">No description provided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
