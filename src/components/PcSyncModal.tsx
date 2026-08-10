import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, FolderCheck, FolderPlus, RefreshCw, X, Check, ShieldAlert, FolderSync, Trash2, ArrowRight } from 'lucide-react';

interface PcSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'need_permission' | 'error';
  lastSyncTime: number | null;
  errorMessage?: string;
  onSelectFolder: () => void;
  onRequestPermission: () => void;
  onSyncNow: () => void;
  onDisconnectFolder: () => void;
}

export const PcSyncModal: React.FC<PcSyncModalProps> = ({
  isOpen,
  onClose,
  folderName,
  syncStatus,
  lastSyncTime,
  errorMessage,
  onSelectFolder,
  onRequestPermission,
  onSyncNow,
  onDisconnectFolder,
}) => {
  if (!isOpen) return null;

  const formattedTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Ще не збережено';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-md bg-[#f5f0e6] border border-stone-300 rounded-3xl p-6 shadow-2xl text-stone-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-stone-800 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-stone-900 leading-tight">
                  Синхронізація з папкою ПК
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-stone-500 hover:text-stone-900 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="py-2 space-y-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              Автоматичне збереження нотаток у файл <code className="font-mono bg-stone-200/80 px-1 py-0.5 rounded text-stone-900">board_data.json</code> у вибрану папку вашого ПК.
            </p>

            {/* Folder Connection Info Row */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-stone-600 font-medium">Стан підключення:</span>
              <span className="font-medium text-stone-900 truncate max-w-[180px]">
                {folderName ? folderName : 'Папка не вибрана'}
              </span>
            </div>

            {folderName && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-stone-600">Останнє оновлення:</span>
                <span className="font-mono text-stone-800">{formattedTime}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-stone-200/70 text-xs text-stone-800">
                <ShieldAlert className="w-4 h-4 shrink-0 text-stone-700" />
                <span className="flex-1 truncate">{errorMessage}</span>
              </div>
            )}

            {syncStatus === 'need_permission' && (
              <button
                onClick={onRequestPermission}
                className="w-full py-2 px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Надати доступ браузера до папки</span>
              </button>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={onSelectFolder}
                className="w-full py-2.5 px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{folderName ? 'Змінити папку на ПК' : 'Вибрати папку на ПК'}</span>
              </button>

              {folderName && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSyncNow}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 py-2 px-3 rounded-full border border-stone-300 hover:bg-stone-200/60 text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FolderSync className="w-4 h-4" />
                    <span>Синхронізувати</span>
                  </button>

                  <button
                    onClick={onDisconnectFolder}
                    className="py-2 px-4 rounded-full border border-stone-300 hover:bg-stone-200/60 text-stone-700 hover:text-stone-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Відключити</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
