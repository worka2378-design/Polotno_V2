import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CloudUpload,
  CloudDownload,
  Search,
  FileText,
  FileImage,
  Film,
  File,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cloud,
  ShieldCheck,
  Download,
  Upload,
  Calendar as CalendarIcon,
  Clock,
  CalendarPlus,
  Trash2
} from 'lucide-react';
import {
  DriveFileItem,
  saveBoardToDrive,
  loadBoardFromDrive,
  listDriveFiles,
  findDriveBackup,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  initDriveAuth,
  getCurrentDriveUser,
  isAIStudioEnvironment,
  formatAuthError,
} from '../utils/googleDrive';
import {
  CalendarEvent,
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from '../utils/googleCalendar';
import { User } from 'firebase/auth';
import { Note, Attachment } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardState: {
    notes: Note[];
    offset: { x: number; y: number };
    scale: number;
  };
  onRestoreBoard: (restoredData: any) => void;
  selectedNoteId: string | null;
  onAttachFileToNote: (noteId: string, attachment: Attachment) => void;
  onCreateNoteWithAttachment: (attachment: Attachment) => void;
  onCreateNoteFromCalendarEvent?: (event: CalendarEvent) => void;
  autoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  lastSyncTime: number | null;
  onSyncComplete: (timestamp: number) => void;
  onOpenVaultModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenImportModal?: () => void;
  initialTab?: 'backup' | 'files' | 'calendar';
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  boardState,
  onRestoreBoard,
  selectedNoteId,
  onAttachFileToNote,
  onCreateNoteWithAttachment,
  onCreateNoteFromCalendarEvent,
  autoSaveEnabled,
  onToggleAutoSave,
  lastSyncTime,
  onSyncComplete,
  onOpenVaultModal,
  onOpenExportModal,
  onOpenImportModal,
  initialTab = 'backup',
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'files' | 'calendar'>(initialTab);
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentDriveUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Backup state
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [driveBackupFileId, setDriveBackupFileId] = useState<string | null>(null);

  // Files state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'documents' | 'images' | 'media'>('all');

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarSuccessMsg, setCalendarSuccessMsg] = useState<string | null>(null);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartDate, setEventStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndDate, setEventEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => unsubscribe();
  }, []);

  const fetchCalendarEvents = async () => {
    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const events = await listCalendarEvents();
      setCalendarEvents(events);
    } catch (err: any) {
      setCalendarError(formatAuthError(err));
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'calendar') {
      fetchCalendarEvents();
    }
  }, [isOpen, activeTab]);

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSummary.trim()) return;
    setIsCreatingEvent(true);
    setCalendarError(null);
    setCalendarSuccessMsg(null);
    try {
      const startIso = `${eventStartDate}T${eventStartTime}:00`;
      const endIso = `${eventEndDate}T${eventEndTime}:00`;
      await createCalendarEvent({
        summary: eventSummary.trim(),
        description: eventDescription.trim(),
        startDateTime: startIso,
        endDateTime: endIso,
      });
      setCalendarSuccessMsg('Подію додано у Google Calendar!');
      setEventSummary('');
      setEventDescription('');
      setShowCreateEventForm(false);
      fetchCalendarEvents();
    } catch (err: any) {
      setCalendarError(formatAuthError(err));
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Видалити цю подію з Google Calendar?')) return;
    try {
      await deleteCalendarEvent(eventId);
      setCalendarEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setCalendarSuccessMsg('Подію видалено з Google Calendar');
    } catch (err: any) {
      setCalendarError(formatAuthError(err));
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setBackupError(null);
    setFilesError(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res?.user) {
        setCurrentUser(res.user);
        if (activeTab === 'files') {
          fetchFiles();
        }
      }
    } catch (err: any) {
      setBackupError(formatAuthError(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await signOutGoogleDrive();
    setCurrentUser(null);
  };

  // Check backup status on open
  useEffect(() => {
    if (isOpen) {
      checkExistingBackup();
    }
  }, [isOpen]);

  // Load files when tab or filters change
  useEffect(() => {
    if (isOpen && activeTab === 'files') {
      fetchFiles();
    }
  }, [isOpen, activeTab, searchQuery, categoryFilter]);

  const checkExistingBackup = async () => {
    try {
      const backup = await findDriveBackup();
      if (backup) {
        setDriveBackupFileId(backup.fileId);
      }
    } catch (err) {
      console.error('Error checking backup:', err);
    }
  };

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    setFilesError(null);
    try {
      const driveFiles = await listDriveFiles(searchQuery, categoryFilter);
      setFiles(driveFiles);
    } catch (err: any) {
      setFilesError(formatAuthError(err));
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    setBackupError(null);
    setBackupSuccessMsg(null);
    try {
      const res = await saveBoardToDrive(boardState, driveBackupFileId || undefined);
      setDriveBackupFileId(res.fileId);
      const now = Date.now();
      onSyncComplete(now);
      setBackupSuccessMsg('Борд збережено в Google Drive');
      setTimeout(() => setBackupSuccessMsg(null), 3000);
    } catch (err: any) {
      setBackupError(formatAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Завантажити збережений борд з Google Drive? Незбережені зміни будуть замінені.')) {
      return;
    }
    setIsRestoring(true);
    setBackupError(null);
    try {
      const data = await loadBoardFromDrive(driveBackupFileId || undefined);
      if (data && data.notes) {
        onRestoreBoard(data);
        setBackupSuccessMsg('Борд успішно відновлено');
        setTimeout(() => setBackupSuccessMsg(null), 3000);
      } else {
        throw new Error('Файл бекапу порожній');
      }
    } catch (err: any) {
      setBackupError(formatAuthError(err));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleAttachDriveFile = (file: DriveFileItem) => {
    const parseSize = file.size ? parseInt(file.size, 10) : 0;
    const attachment: Attachment = {
      id: `drive-${file.id}-${Date.now()}`,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
      url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      size: parseSize,
    };

    if (selectedNoteId) {
      onAttachFileToNote(selectedNoteId, attachment);
    } else {
      onCreateNoteWithAttachment(attachment);
    }
    onClose();
  };

  const renderFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <FileImage className="w-4 h-4 text-zinc-400 shrink-0" />;
    if (mimeType.includes('video') || mimeType.includes('audio')) return <Film className="w-4 h-4 text-zinc-400 shrink-0" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-4 h-4 text-zinc-400 shrink-0" />;
    }
    return <File className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md p-5 bg-[#ede5d8] border border-stone-300 rounded-3xl text-stone-900 flex flex-col gap-4 max-h-[85vh] overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 flex items-center justify-center shrink-0 text-stone-700">
                <Cloud className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900">Google Сервіси</h3>
                <p className="text-xs text-stone-600">Google Drive та Календар</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Account status or Google Sign-In button */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3.5 py-2 border border-stone-300 rounded-full bg-[#e2d8c7]/50">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    {currentUser.photoURL && currentUser.photoURL !== '' ? (
                      <img src={currentUser.photoURL} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-stone-300 flex items-center justify-center text-[10px] text-stone-800 font-semibold shrink-0">
                        {currentUser.email ? currentUser.email[0].toUpperCase() : 'G'}
                      </div>
                    )}
                    <span className="text-xs text-stone-800 truncate">
                      {currentUser.email || currentUser.displayName || 'Увійшли в Google'}
                    </span>
                  </div>
                  <button
                    onClick={handleGoogleLogout}
                    className="text-[11px] text-stone-600 hover:text-stone-900 transition-colors cursor-pointer rounded-full px-2 py-0.5 ml-2 shrink-0"
                  >
                    Вийти
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-stone-600">
                    {isAIStudioEnvironment() ? 'AI Studio OAuth' : 'Google OAuth'}
                  </span>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-medium rounded-full cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5" />
                    )}
                    <span>Увійти в Google</span>
                  </button>
                </div>
              )}
            </div>

            {!isAIStudioEnvironment() && !currentUser && (
              <p className="text-[11px] text-stone-500 px-2 leading-relaxed">
                Поза середовищем AI Studio авторизація Google залежить від дозволених доменів вашого Firebase проєкту.
              </p>
            )}
          </div>

          {/* Navigation Tabs (Seamless flat text tabs without divider line) */}
          <div className="flex items-center gap-3 pt-1 border-b border-stone-300/40 pb-2">
            <button
              onClick={() => setActiveTab('backup')}
              className={`text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'backup'
                  ? 'text-stone-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Автозбереження</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'text-stone-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Файли Drive</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'text-stone-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Календар</span>
            </button>
          </div>

          {/* Tab 1: Backup & Auto-Save */}
          {activeTab === 'backup' && (
            <div className="flex flex-col gap-3 pt-2">
              {/* Auto-save toggle row */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-stone-900">Автозбереження в хмару</span>
                  <span className="text-xs text-stone-600">
                    {lastSyncTime
                      ? `Остання синхронізація: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Автоматичний запис кожні 10 секунд'}
                  </span>
                </div>
                <button
                  onClick={() => onToggleAutoSave(!autoSaveEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    autoSaveEnabled ? 'bg-stone-800' : 'bg-stone-400'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      autoSaveEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status messages */}
              {backupSuccessMsg && (
                <div className="flex items-center gap-2 py-1 text-xs text-stone-800">
                  <CheckCircle2 className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>{backupSuccessMsg}</span>
                </div>
              )}

              {backupError && (
                <div className="flex items-center gap-2 py-1 text-xs text-stone-600">
                  <AlertCircle className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>{backupError}</span>
                </div>
              )}

              {/* Action buttons (Clean option rows, borderless) */}
              <div className="flex flex-col gap-1 pt-1">
                <button
                  onClick={handleManualSave}
                  disabled={isSaving || isRestoring}
                  className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 text-stone-600 animate-spin shrink-0" />
                  ) : (
                    <CloudUpload className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 transition-colors shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                      Зберегти резервну копію зараз
                    </span>
                  </div>
                </button>

                <button
                  onClick={handleRestore}
                  disabled={isSaving || isRestoring}
                  className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
                >
                  {isRestoring ? (
                    <RefreshCw className="w-4 h-4 text-stone-600 animate-spin shrink-0" />
                  ) : (
                    <CloudDownload className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 transition-colors shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                      Відновити борд з Google Drive
                    </span>
                  </div>
                </button>

                {onOpenVaultModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenVaultModal();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
                  >
                    <ShieldCheck className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                        Захист паролем (Сховище)
                      </span>
                    </div>
                  </button>
                )}

                {onOpenExportModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenExportModal();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
                  >
                    <Download className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                        Експорт файлу
                      </span>
                    </div>
                  </button>
                )}

                {onOpenImportModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenImportModal();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors group/opt w-full cursor-pointer rounded-full"
                  >
                    <Upload className="w-4 h-4 text-stone-600 group-hover/opt:text-stone-900 transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors">
                        Імпорт бекапу (.json)
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Drive Files Picker */}
          {activeTab === 'files' && (
            <div className="flex flex-col gap-3 overflow-hidden flex-1 pt-1">
              {/* Search & Categories */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Пошук у Google Drive..."
                    className="w-full pl-9 pr-4 py-1.5 bg-[#e2d8c7] border border-stone-300 rounded-full text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-stone-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['all', 'documents', 'images', 'media'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'text-stone-900 border border-stone-400 font-semibold bg-stone-300/60'
                          : 'text-stone-600 hover:text-stone-900 border border-transparent'
                      }`}
                    >
                      {cat === 'all' && 'Усі'}
                      {cat === 'documents' && 'Документи'}
                      {cat === 'images' && 'Зображення'}
                      {cat === 'media' && 'Медіа'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Files List (Borderless rows) */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-[180px] max-h-[280px] pt-1">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-stone-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Завантаження...</span>
                  </div>
                ) : filesError ? (
                  <div className="py-6 text-center text-xs text-stone-500">
                    <span>{filesError}</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">
                    <span>Файлів не знайдено</span>
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between py-2 px-2 group/opt rounded-full transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {renderFileIcon(file.mimeType)}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-stone-700 group-hover/opt:text-stone-900 transition-colors truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {file.size ? `${(parseInt(file.size, 10) / 1024).toFixed(0)} KB` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors"
                            title="Переглянути"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleAttachDriveFile(file)}
                          className="px-2.5 py-1 rounded-full text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{selectedNoteId ? "Додати" : "Нотатка"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Google Calendar Events & Creation */}
          {activeTab === 'calendar' && (
            <div className="flex flex-col gap-3 overflow-hidden flex-1 pt-1">
              {/* Toolbar header in Calendar Tab */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                  Майбутні події
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCalendarEvents}
                    disabled={isLoadingCalendar}
                    className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                    title="Оновити список подій"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowCreateEventForm(!showCreateEventForm)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-medium rounded-full cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>{showCreateEventForm ? 'Сховати форму' : 'Створити подію'}</span>
                  </button>
                </div>
              </div>

              {/* Success / Error Messages */}
              {calendarSuccessMsg && (
                <div className="flex items-center gap-2 py-1 text-xs text-stone-800 bg-stone-300/40 px-3 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                  <span>{calendarSuccessMsg}</span>
                </div>
              )}
              {calendarError && (
                <div className="flex items-center gap-2 py-1 text-xs text-stone-600 bg-red-100/50 px-3 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{calendarError}</span>
                </div>
              )}

              {/* Create Event Form */}
              {showCreateEventForm && (
                <form
                  onSubmit={handleCreateEventSubmit}
                  className="flex flex-col gap-2 p-3 border border-stone-300 rounded-2xl bg-[#e2d8c7]/60 text-xs"
                >
                  <input
                    type="text"
                    value={eventSummary}
                    onChange={(e) => setEventSummary(e.target.value)}
                    placeholder="Назва події *"
                    required
                    className="w-full px-3 py-1.5 bg-[#ede5d8] border border-stone-300 rounded-full text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-stone-600"
                  />
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Опис події (опціонально)"
                    rows={2}
                    className="w-full px-3 py-1.5 bg-[#ede5d8] border border-stone-300 rounded-2xl text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-stone-600 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-stone-600 font-medium">Початок</label>
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={eventStartDate}
                          onChange={(e) => setEventStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-[#ede5d8] border border-stone-300 rounded-full text-[11px] text-stone-900 focus:outline-none"
                        />
                        <input
                          type="time"
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className="w-16 px-1.5 py-1 bg-[#ede5d8] border border-stone-300 rounded-full text-[11px] text-stone-900 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-stone-600 font-medium">Завершення</label>
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={eventEndDate}
                          onChange={(e) => setEventEndDate(e.target.value)}
                          className="w-full px-2 py-1 bg-[#ede5d8] border border-stone-300 rounded-full text-[11px] text-stone-900 focus:outline-none"
                        />
                        <input
                          type="time"
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className="w-16 px-1.5 py-1 bg-[#ede5d8] border border-stone-300 rounded-full text-[11px] text-stone-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreateEventForm(false)}
                      className="px-3 py-1 text-stone-600 hover:text-stone-900 rounded-full transition-colors cursor-pointer text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingEvent}
                      className="px-4 py-1 bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-full transition-colors font-medium text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isCreatingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                      <span>Створити у Календарі</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Calendar Events List */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-[180px] max-h-[280px] pt-1">
                {isLoadingCalendar ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-stone-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Завантаження подій...</span>
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-stone-400" />
                    <span>Майбутніх подій у Google Calendar не знайдено</span>
                  </div>
                ) : (
                  calendarEvents.map((event) => {
                    const startFormatted = event.start?.dateTime
                      ? new Date(event.start.dateTime).toLocaleString('uk-UA', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : event.start?.date || '';

                    return (
                      <div
                        key={event.id}
                        className="flex items-start justify-between py-2 px-2.5 group/opt rounded-2xl hover:bg-stone-300/30 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="p-1.5 rounded-full bg-stone-300/60 text-stone-700 shrink-0 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-stone-800 group-hover/opt:text-stone-900 transition-colors truncate">
                              {event.summary}
                            </span>
                            {startFormatted && (
                              <span className="text-[10px] text-stone-500 font-mono">
                                {startFormatted}
                              </span>
                            )}
                            {event.description && (
                              <span className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                                {event.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors"
                              title="Відкрити в Google Календарі"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onCreateNoteFromCalendarEvent && (
                            <button
                              onClick={() => onCreateNoteFromCalendarEvent(event)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium text-stone-700 hover:text-stone-900 bg-stone-300/50 hover:bg-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Імпортувати як нотатку на дошку"
                            >
                              <Plus className="w-3 h-3" />
                              <span>На борд</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1 rounded-full text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Видалити подію з Календаря"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
