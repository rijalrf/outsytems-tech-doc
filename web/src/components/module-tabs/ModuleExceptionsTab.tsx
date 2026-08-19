import React, { useState } from 'react';
import { Search, AlertTriangle, User, Calendar } from 'lucide-react';
import { ensureArray } from '../../utils/helpers';

interface ModuleExceptionsTabProps {
  rawData: Record<string, any> | null;
}

export const ModuleExceptionsTab: React.FC<ModuleExceptionsTabProps> = ({ rawData }) => {
  const [search, setSearch] = useState('');

  const exceptionsData = rawData?.Exceptions || {};
  const allExceptions: Array<{
    category: string;
    Key: string;
    Name: string;
    LastModifiedBy?: string;
    LastModifiedDate?: string;
  }> = [];

  Object.entries(exceptionsData).forEach(([category, val]) => {
    const list = ensureArray(val);
    list.forEach((item: any) => {
      if (item && typeof item === 'object') {
        allExceptions.push({
          category,
          Key: item.Key || '',
          Name: item.Name || 'Unnamed Exception',
          LastModifiedBy: item.LastModifiedBy,
          LastModifiedDate: item.LastModifiedDate,
        });
      }
    });
  });

  const filteredExceptions = allExceptions.filter(
    (ex) =>
      ex.Name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase()) ||
      (ex.LastModifiedBy && ex.LastModifiedBy.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari exception berdasarkan nama atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-outline text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>
        <div className="text-xs font-bold text-gray-500">
          Total: <span className="text-primary font-black">{allExceptions.length}</span> Exceptions
        </div>
      </div>

      {/* Main Table */}
      {filteredExceptions.length === 0 ? (
        <div className="py-12 px-4 bg-surface rounded-card border border-dashed border-outline text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">Tidak ada Exception ditemukan</p>
          <p className="text-xs text-gray-500">Modul ini tidak memiliki custom exceptions atau tidak cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-outline shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-outline text-[11px] font-black text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-1/3">Exception Name</th>
                  <th className="py-3.5 px-4 w-1/4">Category</th>
                  <th className="py-3.5 px-4 w-1/3">Last Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/60 text-xs">
                {filteredExceptions.map((ex, idx) => (
                  <tr key={ex.Key || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span>{ex.Name}</span>
                        {ex.Key && (
                          <p className="text-[10px] text-gray-400 font-mono font-normal">
                            {ex.Key}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-pill bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                        {ex.category}
                      </span>
                    </td>

                    {/* Last Modified */}
                    <td className="py-3.5 px-4 text-gray-600">
                      {ex.LastModifiedBy ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-medium text-gray-800">
                            <User className="w-3 h-3 text-gray-400" />
                            <span>{ex.LastModifiedBy}</span>
                          </div>
                          {ex.LastModifiedDate && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{ex.LastModifiedDate}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
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
