import React from 'react';
import { Download, FileCode, Shield, FileText, X, Upload, HardDrive } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportEncryptedJSON: () => void;
  onExportStandaloneHTML: () => void;
  onExportPlainJSON: () => void;
  onExportTXT: () => void;
  onOpenImportModal?: () => void;
  onOpenPcSyncModal?: () => void;
  pcFolderName?: string | null;
  pcSyncStatus?: 'idle' | 'syncing' | 'synced' | 'need_permission' | 'error';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportEncryptedJSON,
  onExportStandaloneHTML,
  onExportPlainJSON,
  onExportTXT,
  onOpenImportModal,
  onOpenPcSyncModal,
  pcFolderName,
  pcSyncStatus = 'idle',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-md p-5 bg-[#ede5d8] border border-stone-300 rounded-3xl relative animate-in zoom-in-95 duration-200 text-stone-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <Download className="w-4 h-4 text-stone-700" />
          <div>
            <h3 className="text-base font-semibold text-stone-900">Export & Download</h3>
            <p className="text-xs text-stone-600">Save your notepad file locally</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {/* Option 1: Standalone HTML File */}
          <button
            onClick={() => {
              onExportStandaloneHTML();
              onClose();
            }}
            className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
          >
            <FileCode className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 shrink-0 mt-0.5 transition-colors" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">Standalone HTML (.html)</span>
              <p className="text-xs text-stone-500 group-hover/opt:text-stone-800 mt-0.5 transition-colors">
                Download as a complete self-contained HTML file that opens offline in any browser.
              </p>
            </div>
          </button>

          {/* Option 2: Encrypted Vault File */}
          <button
            onClick={() => {
              onExportEncryptedJSON();
              onClose();
            }}
            className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
          >
            <Shield className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 shrink-0 mt-0.5 transition-colors" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">Encrypted Vault Backup (.json)</span>
              <p className="text-xs text-stone-500 group-hover/opt:text-stone-800 mt-0.5 transition-colors">
                AES-256 encrypted backup requiring master password to decrypt.
              </p>
            </div>
          </button>

          {/* Option 3: Unencrypted JSON Export */}
          <button
            onClick={() => {
              onExportPlainJSON();
              onClose();
            }}
            className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
          >
            <FileCode className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 shrink-0 mt-0.5 transition-colors" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">Plain JSON Data Export</span>
              <p className="text-xs text-stone-500 group-hover/opt:text-stone-800 mt-0.5 transition-colors">
                Raw JSON backup containing notes state.
              </p>
            </div>
          </button>

          {/* Option 4: Plain Text Export (.txt) */}
          <button
            onClick={() => {
              onExportTXT();
              onClose();
            }}
            className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
          >
            <FileText className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 shrink-0 mt-0.5 transition-colors" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">Text Notes (.txt)</span>
              <p className="text-xs text-stone-500 group-hover/opt:text-stone-800 mt-0.5 transition-colors">
                Export all note contents as a clean formatted plain text file.
              </p>
            </div>
          </button>

          {/* Option 5: PC Folder Local Sync */}
          {onOpenPcSyncModal && (
            <div className="pt-2 mt-2 border-t border-stone-300">
              <button
                onClick={() => {
                  onClose();
                  onOpenPcSyncModal();
                }}
                className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full bg-stone-900/5 hover:bg-stone-900/10"
              >
                <HardDrive className="w-4 h-4 text-stone-900 shrink-0 mt-0.5 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-stone-900 transition-colors">
                      Авто-синхронізація з ПК
                    </span>
                    {pcFolderName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-stone-900 text-white shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          pcSyncStatus === 'synced' ? 'bg-emerald-400' : pcSyncStatus === 'syncing' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        <span className="truncate max-w-[90px]">{pcFolderName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 transition-colors">
                    {pcFolderName
                      ? `Підключено папку ПК: "${pcFolderName}". Натисніть для налаштувань.`
                      : 'Прив’язати папку вашого ПК для автоматичного збереження.'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Option 6: Import Backup */}
          {onOpenImportModal && (
            <div className="pt-2 mt-2 border-t border-stone-300">
              <button
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="flex items-start gap-3 px-3 py-2 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
              >
                <Upload className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 shrink-0 mt-0.5 transition-colors" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                    Імпортувати бекап (.json)
                  </span>
                  <p className="text-xs text-stone-500 group-hover/opt:text-stone-800 mt-0.5 transition-colors">
                    Завантажити та відновити нотатки з резервної копії або зашифрованого сховища.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
