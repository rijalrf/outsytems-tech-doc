import React, { useState, useRef } from 'react';
import { UploadCloud, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  acceptedExt: '.oap' | '.oml';
  title: string;
  subtitle: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  acceptedExt,
  title,
  subtitle,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setError(null);
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(acceptedExt)) {
      setError(`Format file tidak valid! Harap pilih file dengan ekstensi ${acceptedExt} saja.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError(`Harap pilih file ${acceptedExt} terlebih dahulu.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah dan memproses file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface w-full max-w-lg rounded-panel border border-outline shadow-2xl p-6 sm:p-8 relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Subtitle */}
        <div className="mb-6 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-primary-soft text-primary text-[11px] font-black uppercase tracking-wider">
            <span>Upload & Parse</span>
          </div>
          <h3 className="text-xl font-black text-on-background">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>

        {/* Form & Upload Area */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-card-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary-soft/40 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-outline hover:border-primary/60 hover:bg-surface-soft/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedExt}
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 break-all">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <p className="text-[11px] text-primary font-bold">Klik untuk mengganti file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Tarik & lepaskan file <span className="text-primary font-black">{acceptedExt}</span> di sini
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">atau klik untuk menelusuri komputer</p>
                </div>
                <div className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-primary-strong">
                  Strictly file {acceptedExt} only
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="h-10 px-4 rounded-pill border border-outline text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="h-10 px-6 rounded-pill bg-primary hover:bg-primary-strong text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses & Mengekstrak...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Unggah & Parse</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
