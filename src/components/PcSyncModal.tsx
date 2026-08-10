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
          <div className="flex items-center justify-between pb-4 border-b border-stone-300/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-stone-900 text-white shadow-xs">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 leading-tight">
                  Синхронізація з папкою ПК
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Автоматичне збереження у вибрану папку вашого комп'ютера
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="py-4 space-y-4">
            <p className="text-xs leading-relaxed text-stone-600">
              Виберіть папку на вашому комп'ютері (через File System Access API). Всі зміни та нотатки будуть автоматично зберігатися безпосередньо у цій папці у файлі <code className="font-mono bg-stone-200 px-1 py-0.5 rounded text-stone-900">board_data.json</code>.
            </p>

            {/* Folder Connection Card */}
            <div className="p-4 rounded-2xl bg-[#eae2d3] border border-stone-300/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Стан підключення
                </span>
                {folderName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-stone-900 text-white">
                    <FolderCheck className="w-3.5 h-3.5" />
                    <span>{folderName}</span>
                  </span>
                )}
              </div>

              {folderName ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Статус:</span>
                    {syncStatus === 'synced' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Синхронізовано
                      </span>
                    )}
                    {syncStatus === 'syncing' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        Збереження на ПК...
                      </span>
                    )}
                    {syncStatus === 'need_permission' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        Потрібен дозвіл
                      </span>
                    )}
                    {syncStatus === 'error' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                        Помилка синхронізації
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Останнє оновлення:</span>
                    <span className="font-mono text-stone-800">{formattedTime}</span>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium leading-normal">
                      {errorMessage}
                    </div>
                  )}

                  {syncStatus === 'need_permission' && (
                    <button
                      onClick={onRequestPermission}
                      className="w-full mt-2 py-2 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Надати доступ браузера до папки ПК</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-stone-300/60 flex items-center justify-center text-stone-600">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-stone-600 font-medium">
                    Папка на ПК ще не вибрана.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={onSelectFolder}
                className="w-full py-2.5 px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{folderName ? 'Змінити папку на ПК' : 'Вибрати папку на ПК'}</span>
              </button>

              {folderName && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onSyncNow}
                    disabled={syncStatus === 'syncing'}
                    className="py-2 px-3 rounded-full border border-stone-300 bg-[#efe8db] hover:bg-[#e4dccf] text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    <span>Синхронізувати</span>
                  </button>

                  <button
                    onClick={onDisconnectFolder}
                    className="py-2 px-3 rounded-full border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Відключити</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-stone-200/60 border border-stone-300/60 text-[11px] text-stone-600 leading-relaxed space-y-1">
              <div className="font-semibold text-stone-800 flex items-center gap-1">
                <ArrowRight className="w-3 h-3 text-stone-700" />
                Як це працює:
              </div>
              <p>
                Браузер зберігає файл <code className="font-mono bg-stone-300/80 px-1 rounded text-stone-900">board_data.json</code> у вибрану папку і автоматично підтягує дані з вашого дискe при запуску.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
