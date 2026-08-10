import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Point, HistoryState, NoteColor, FontFamily, FontSize, TextAlign, Attachment, Folder, StandaloneLink, LinkFolder, LinkMetadata, StandaloneFile, FileFolder, FileMetadata } from './types';
import { NoteCard } from './components/NoteCard';
import { Toolbar } from './components/Toolbar';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import { screenToCanvas } from './utils/canvas';
import { createPlannerHTML } from './utils/planner';
import { createSwotHTML } from './utils/swot';
import { encryptVault } from './utils/crypto';
import { isUrl, createLinkCardHtml, escapeHtml } from './utils/linkUtils';
import { convertMarkdownToHtml } from './utils/markdownUtils';

import { LayersPanel } from './components/LayersPanel';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { Minimap } from './components/Minimap';
import { saveBoardToDrive, uploadFileToDrive, getCurrentDriveUser, initDriveAuth } from './utils/googleDrive';
import { saveAttachmentData, getAllAttachmentsData, deleteAttachmentData } from './utils/attachmentStorage';
import { AnimatePresence } from 'motion/react';

import { FrameCard } from './components/FrameCard';
import { TemplatePickerModal } from './components/TemplatePickerModal';
import { PcSyncModal } from './components/PcSyncModal';
import { NoteTemplate } from './utils/templates';
import { Cloud, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Sparkles, LayoutTemplate, HardDrive } from 'lucide-react';
import {
  selectLocalFolder,
  saveBoardToLocalFolder,
  loadBoardFromLocalFolder,
  getDirectoryHandle,
  clearDirectoryHandle,
  verifyFolderPermission,
  getLocalFolderLastModified,
} from './utils/localSync';

const STORAGE_KEY = 'infinite_notepad_vault_v1';

export default function App() {
  // Canvas Viewport State
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [gridStyle] = useState<'dots' | 'grid' | 'blank'>('grid');

  // Notes & Drawing State
  const [notes, setNotes] = useState<Note[]>([]);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const selectedNoteId = selectedNoteIds.length > 0 ? selectedNoteIds[0] : null;

  const centerOnNote = useCallback((note: { x: number; y: number; width?: number; height?: number }, targetScale = 1.0) => {
    const w = note.width || 280;
    const h = note.height || 220;
    const noteCenterX = note.x + w / 2;
    const noteCenterY = note.y + h / 2;
    const newX = window.innerWidth / 2 - noteCenterX * targetScale;
    const newY = window.innerHeight / 2 - noteCenterY * targetScale;
    setScale(targetScale);
    setOffset({ x: newX, y: newY });
  }, []);

  const setSelectedNoteId = useCallback((id: string | null, isShift = false) => {
    if (id === null) {
      setSelectedNoteIds([]);
      setSelectedFolderId(null);
    } else if (isShift) {
      setSelectedNoteIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedNoteIds([id]);
      const targetNote = notesRef.current.find((n) => n.id === id);
      if (targetNote) {
        centerOnNote(targetNote, 1.0);
      }
    }
  }, [centerOnNote]);

  // Marquee Box Selection State
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const isSelectingMarqueeRef = useRef(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const [maxZIndex, setMaxZIndex] = useState<number>(10);
  const maxZIndexRef = useRef(maxZIndex);
  maxZIndexRef.current = maxZIndex;

  // Undo / Redo System
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndexState, setHistoryIndexState] = useState<number>(-1);
  const historyIndexRef = useRef<number>(-1);

  const setHistoryIndex = useCallback((index: number) => {
    historyIndexRef.current = index;
    setHistoryIndexState(index);
  }, []);

  const historyIndex = historyIndexState;

  // Modals & Protection State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [shouldFocusSearchPanel, setShouldFocusSearchPanel] = useState<boolean>(false);
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false);
  const [activePanelTab, setActivePanelTab] = useState<'layers' | 'links' | 'files' | 'search' | 'ai'>('layers');
  const [standaloneLinks, setStandaloneLinks] = useState<StandaloneLink[]>([]);
  const [linkFolders, setLinkFolders] = useState<LinkFolder[]>([]);
  const [linkMetadata, setLinkMetadata] = useState<Record<string, LinkMetadata>>({});

  const [standaloneFiles, setStandaloneFiles] = useState<StandaloneFile[]>([]);
  const [fileFolders, setFileFolders] = useState<FileFolder[]>([]);
  const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});

  // Load link & file state from localStorage
  useEffect(() => {
    try {
      const savedSL = localStorage.getItem('infinite_notepad_standalone_links');
      if (savedSL) setStandaloneLinks(JSON.parse(savedSL));

      const savedLF = localStorage.getItem('infinite_notepad_link_folders');
      if (savedLF) setLinkFolders(JSON.parse(savedLF));

      const savedLM = localStorage.getItem('infinite_notepad_link_metadata');
      if (savedLM) setLinkMetadata(JSON.parse(savedLM));

      const savedSF = localStorage.getItem('infinite_notepad_standalone_files');
      if (savedSF) setStandaloneFiles(JSON.parse(savedSF));

      const savedFF = localStorage.getItem('infinite_notepad_file_folders');
      if (savedFF) setFileFolders(JSON.parse(savedFF));

      const savedFM = localStorage.getItem('infinite_notepad_file_metadata');
      if (savedFM) setFileMetadata(JSON.parse(savedFM));
    } catch (e) {
      console.error("Error loading link & file states:", e);
    }
  }, []);

  // Save link state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_standalone_links', JSON.stringify(standaloneLinks));
    } catch (e) {}
  }, [standaloneLinks]);

  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_link_folders', JSON.stringify(linkFolders));
    } catch (e) {}
  }, [linkFolders]);

  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_link_metadata', JSON.stringify(linkMetadata));
    } catch (e) {}
  }, [linkMetadata]);

  // Save file state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_standalone_files', JSON.stringify(standaloneFiles));
    } catch (e) {}
  }, [standaloneFiles]);

  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_file_folders', JSON.stringify(fileFolders));
    } catch (e) {}
  }, [fileFolders]);

  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_file_metadata', JSON.stringify(fileMetadata));
    } catch (e) {}
  }, [fileMetadata]);

  const handleAddStandaloneLink = useCallback((url: string, title?: string) => {
    try {
      let parsedUrl = url.trim();
      if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
        parsedUrl = `https://${parsedUrl}`;
      }
      const u = new URL(parsedUrl);
      const domain = u.hostname.replace(/^www\./, '');
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      const newLink: StandaloneLink = {
        id: `sl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: parsedUrl,
        title: title?.trim() || domain,
        domain,
        faviconUrl,
        createdAt: Date.now(),
        tags: [],
      };
      setStandaloneLinks((prev) => [newLink, ...prev]);
    } catch (e) {
      console.error("Invalid URL provided for standalone link:", url);
    }
  }, []);

  const handleDeleteStandaloneLink = useCallback((id: string) => {
    setStandaloneLinks((prev) => prev.filter((sl) => sl.id !== id));
  }, []);

  const handleUpdateStandaloneLink = useCallback((id: string, updates: Partial<StandaloneLink>) => {
    setStandaloneLinks((prev) =>
      prev.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl))
    );
  }, []);

  const handleCreateLinkFolder = useCallback(() => {
    setLinkFolders((prev) => [
      ...prev,
      {
        id: `lf_${Date.now()}`,
        name: `Папка посилань ${prev.length + 1}`,
        createdAt: Date.now(),
        collapsed: false,
        tags: [],
      },
    ]);
  }, []);

  const handleUpdateLinkFolder = useCallback((id: string, updates: Partial<LinkFolder>) => {
    setLinkFolders((prev) =>
      prev.map((lf) => (lf.id === id ? { ...lf, ...updates } : lf))
    );
  }, []);

  const handleDeleteLinkFolder = useCallback((id: string) => {
    setLinkFolders((prev) => prev.filter((lf) => lf.id !== id));
    setStandaloneLinks((prev) =>
      prev.map((sl) => (sl.folderId === id ? { ...sl, folderId: undefined } : sl))
    );
    setLinkMetadata((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key].folderId === id) {
          next[key] = { ...next[key], folderId: undefined };
        }
      });
      return next;
    });
  }, []);

  const handleUpdateLinkMetadata = useCallback((url: string, updates: Partial<LinkMetadata>) => {
    setLinkMetadata((prev) => ({
      ...prev,
      [url]: {
        ...(prev[url] || { tags: [] }),
        ...updates,
      },
    }));
  }, []);

  const handleAddStandaloneFile = useCallback(async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        let driveFileId: string | undefined;
        let driveThumbnail: string | undefined;

        // If user is connected to Google Drive, also attempt upload to Google Drive
        if (getCurrentDriveUser()) {
          try {
            const driveRes = await uploadFileToDrive(file);
            if (driveRes?.id) {
              driveFileId = driveRes.id;
              driveThumbnail = driveRes.thumbnailLink;
            }
          } catch (err) {
            console.warn("Drive upload fallback:", err);
          }
        }

        const newFileItem: StandaloneFile = {
          id: `sf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          url,
          size: file.size,
          createdAt: Date.now(),
          driveFileId,
          driveThumbnail,
          tags: [],
        };

        setStandaloneFiles((prev) => [newFileItem, ...prev]);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Error adding standalone file:", e);
    }
  }, []);

  const handleDeleteStandaloneFile = useCallback((id: string) => {
    setStandaloneFiles((prev) => prev.filter((sf) => sf.id !== id));
  }, []);

  const handleUpdateStandaloneFile = useCallback((id: string, updates: Partial<StandaloneFile>) => {
    setStandaloneFiles((prev) =>
      prev.map((sf) => (sf.id === id ? { ...sf, ...updates } : sf))
    );
  }, []);

  const handleCreateFileFolder = useCallback((name?: string) => {
    setFileFolders((prev) => [
      ...prev,
      {
        id: `ff_${Date.now()}`,
        name: name?.trim() || `Папка файлів ${prev.length + 1}`,
        createdAt: Date.now(),
        collapsed: false,
        tags: [],
      },
    ]);
  }, []);

  const handleUpdateFileFolder = useCallback((id: string, updates: Partial<FileFolder>) => {
    setFileFolders((prev) =>
      prev.map((ff) => (ff.id === id ? { ...ff, ...updates } : ff))
    );
  }, []);

  const handleDeleteFileFolder = useCallback((id: string) => {
    setFileFolders((prev) => prev.filter((ff) => ff.id !== id));
    setStandaloneFiles((prev) =>
      prev.map((sf) => (sf.folderId === id ? { ...sf, folderId: undefined } : sf))
    );
    setFileMetadata((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key].folderId === id) {
          next[key] = { ...next[key], folderId: undefined };
        }
      });
      return next;
    });
  }, []);

  const handleUpdateFileMetadata = useCallback((fileId: string, updates: Partial<FileMetadata>) => {
    setFileMetadata((prev) => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || { tags: [] }),
        ...updates,
      },
    }));
  }, []);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);

  // Local PC Folder Sync State
  const [pcFolderHandle, setPcFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [pcFolderName, setPcFolderName] = useState<string | null>(null);
  const [pcSyncStatus, setPcSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'need_permission' | 'error'>('idle');
  const [pcLastSyncTime, setPcLastSyncTime] = useState<number | null>(null);
  const [pcErrorMessage, setPcErrorMessage] = useState<string | undefined>(undefined);
  const [isPcSyncModalOpen, setIsPcSyncModalOpen] = useState<boolean>(false);

  // Google Drive & Network Integration State
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'signed_out'>('idle');
  const [autoSaveDrive, setAutoSaveDrive] = useState<boolean>(() => {
    return localStorage.getItem('google_drive_autosave') === 'true';
  });
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('google_drive_last_sync');
    return saved ? parseInt(saved, 10) : null;
  });

  const cachedDriveFileIdRef = useRef<string | null>(localStorage.getItem('gdrive_backup_file_id'));
  const isSavingToDriveRef = useRef<boolean>(false);
  const hasWarnedLoggedOutRef = useRef<boolean>(false);

  const handleToggleAutoSaveDrive = (enabled: boolean) => {
    setAutoSaveDrive(enabled);
    localStorage.setItem('google_drive_autosave', enabled ? 'true' : 'false');
  };

  const handleSyncComplete = (timestamp: number) => {
    setLastDriveSyncTime(timestamp);
    localStorage.setItem('google_drive_last_sync', timestamp.toString());
  };

  const handleAttachDriveFileToNote = (noteId: string, attachment: Attachment) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, attachments: [...(n.attachments || []), attachment], updatedAt: Date.now() }
          : n
      )
    );
  };

  const handleCreateNoteWithDriveAttachment = (attachment: Attachment) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      x: -offset.x + window.innerWidth / 2 - 130,
      y: -offset.y + window.innerHeight / 2 - 90,
      width: 260,
      height: 180,
      content: '',
      color: 'white',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: maxZIndex + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [attachment],
    };
    setMaxZIndex((prev) => prev + 1);
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
  };

  const handleCreateNoteFromCalendarEvent = (event: any) => {
    const eventDateStr = event.start?.dateTime
      ? new Date(event.start.dateTime).toLocaleString('uk-UA', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : event.start?.date || '';

    const summaryEscaped = escapeHtml(event.summary || 'Без назви');
    const dateEscaped = escapeHtml(eventDateStr);
    const descriptionEscaped = escapeHtml(event.description || '').replace(/\r?\n/g, '<br/>');
    const htmlLinkEscaped = escapeHtml(event.htmlLink || '');

    const contentParts = [
      `<div><strong>${summaryEscaped}</strong></div>`,
    ];

    if (dateEscaped) {
      contentParts.push(`<div className="text-xs text-stone-500 mt-1">${dateEscaped}</div>`);
    }

    if (descriptionEscaped) {
      contentParts.push(`<div style="margin-top: 6px;">${descriptionEscaped}</div>`);
    }

    if (htmlLinkEscaped) {
      contentParts.push(`<div style="margin-top: 6px;"><a href="${htmlLinkEscaped}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">Відкрити в Календарі</a></div>`);
    }

    const content = contentParts.join('');

    const newNote: Note = {
      id: `note_${Date.now()}`,
      x: -offset.x + window.innerWidth / 2 - 140,
      y: -offset.y + window.innerHeight / 2 - 100,
      width: 280,
      height: 200,
      content,
      color: 'white',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: maxZIndex + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMaxZIndex((prev) => prev + 1);
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    addToast('success', `Подію "${event.summary || 'Без назви'}" успішно додано на борд!`);
  };

  const handleRestoreBoardFromDrive = (restoredData: any) => {
    if (restoredData.notes) {
      const newNotes = restoredData.notes as Note[];
      const newAttIds = new Set<string>();
      newNotes.forEach((n) => n.attachments?.forEach((a) => a.id && newAttIds.add(a.id)));
      notes.forEach((n) => {
        n.attachments?.forEach((a) => {
          if (a.id && !newAttIds.has(a.id)) {
            deleteAttachmentData(a.id).catch(() => {});
          }
        });
      });
      setNotes(newNotes);
    }
    if (restoredData.canvasOffset) setOffset(restoredData.canvasOffset);
    if (restoredData.canvasScale) setScale(restoredData.canvasScale);
  };

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      type: 'info' | 'error' | 'warning' | 'success',
      message: string,
      title?: string,
      actionLabel?: string,
      onAction?: () => void
    ) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, type, message, title, actionLabel, onAction }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, actionLabel ? 8000 : 5000);
    },
    []
  );

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize Local PC Sync Folder handle from IndexedDB on startup
  useEffect(() => {
    async function initPcFolderSync() {
      try {
        const handle = await getDirectoryHandle();
        if (handle) {
          setPcFolderHandle(handle);
          setPcFolderName(handle.name);

          const hasPerm = await verifyFolderPermission(handle, false);
          if (hasPerm) {
            setPcSyncStatus('synced');
            try {
              const loadedData = await loadBoardFromLocalFolder(handle);
              if (loadedData && Array.isArray(loadedData.notes)) {
                if (loadedData.notes.length > 0) setNotes(loadedData.notes);
                if (Array.isArray(loadedData.folders)) setFolders(loadedData.folders);
                if (Array.isArray(loadedData.standaloneLinks)) setStandaloneLinks(loadedData.standaloneLinks);
                if (Array.isArray(loadedData.linkFolders)) setLinkFolders(loadedData.linkFolders);
                if (loadedData.linkMetadata) setLinkMetadata(loadedData.linkMetadata);
                if (Array.isArray(loadedData.standaloneFiles)) setStandaloneFiles(loadedData.standaloneFiles);
                if (Array.isArray(loadedData.fileFolders)) setFileFolders(loadedData.fileFolders);
                if (loadedData.fileMetadata) setFileMetadata(loadedData.fileMetadata);
                if (loadedData.canvasOffset) setOffset(loadedData.canvasOffset);
                if (loadedData.canvasScale) setScale(loadedData.canvasScale);
                if (loadedData.lastSavedAt) setPcLastSyncTime(loadedData.lastSavedAt);
                addToast('success', `Успішно завантажено дані з ПК папки "${handle.name}"`, 'ПК Локальний Сервер');
              }
            } catch (err: any) {
              console.warn("Auto-load from PC folder failed:", err);
            }
          } else {
            setPcSyncStatus('need_permission');
            setPcErrorMessage('Потрібно надати дозвіл браузера для автоматичної синхронізації з папкою ПК.');
          }
        }
      } catch (e: any) {
        console.error("Error initializing PC folder handle:", e);
      }
    }
    initPcFolderSync();
  }, [addToast]);

  // Auto-Save to Local PC Folder on state changes
  const pcAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingToPcRef = useRef(false);

  const performPcFolderSave = useCallback(async () => {
    if (!pcFolderHandle) return;
    if (isSavingToPcRef.current) return;

    try {
      isSavingToPcRef.current = true;
      setPcSyncStatus('syncing');

      const payload = {
        version: 1,
        notes: notesRef.current,
        folders: foldersRef.current,
        standaloneLinks,
        linkFolders,
        linkMetadata,
        standaloneFiles,
        fileFolders,
        fileMetadata,
        canvasOffset: offset,
        canvasScale: scale,
        maxZIndex,
      };

      const saveTime = await saveBoardToLocalFolder(pcFolderHandle, payload);
      setPcLastSyncTime(saveTime);
      setPcSyncStatus('synced');
      setPcErrorMessage(undefined);
    } catch (err: any) {
      console.error("Error saving to PC folder:", err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('дозвіл')) {
        setPcSyncStatus('need_permission');
        setPcErrorMessage('Браузер вимагає підтвердження дозволу для збереження в папку ПК.');
      } else {
        setPcSyncStatus('error');
        setPcErrorMessage(err?.message || 'Помилка запису в папку ПК.');
      }
    } finally {
      isSavingToPcRef.current = false;
    }
  }, [pcFolderHandle, standaloneLinks, linkFolders, linkMetadata, standaloneFiles, fileFolders, fileMetadata, offset, scale, maxZIndex]);

  useEffect(() => {
    if (!pcFolderHandle) return;
    if (pcSyncStatus === 'need_permission') return;

    if (pcAutoSaveTimeoutRef.current) {
      clearTimeout(pcAutoSaveTimeoutRef.current);
    }

    pcAutoSaveTimeoutRef.current = setTimeout(() => {
      performPcFolderSave();
    }, 1500);

    return () => {
      if (pcAutoSaveTimeoutRef.current) {
        clearTimeout(pcAutoSaveTimeoutRef.current);
      }
    };
  }, [notes, folders, standaloneLinks, linkFolders, linkMetadata, standaloneFiles, fileFolders, fileMetadata, pcFolderHandle, pcSyncStatus, performPcFolderSave]);

  // Periodically check if board_data.json on PC folder was modified
  useEffect(() => {
    if (!pcFolderHandle || pcSyncStatus === 'need_permission') return;

    const interval = setInterval(async () => {
      try {
        const lastMod = await getLocalFolderLastModified(pcFolderHandle);
        if (lastMod && pcLastSyncTime && lastMod > pcLastSyncTime + 2000) {
          const updated = await loadBoardFromLocalFolder(pcFolderHandle);
          if (updated && Array.isArray(updated.notes)) {
            setNotes(updated.notes);
            if (Array.isArray(updated.folders)) setFolders(updated.folders);
            if (Array.isArray(updated.standaloneLinks)) setStandaloneLinks(updated.standaloneLinks);
            if (Array.isArray(updated.linkFolders)) setLinkFolders(updated.linkFolders);
            if (updated.linkMetadata) setLinkMetadata(updated.linkMetadata);
            if (Array.isArray(updated.standaloneFiles)) setStandaloneFiles(updated.standaloneFiles);
            if (Array.isArray(updated.fileFolders)) setFileFolders(updated.fileFolders);
            if (updated.fileMetadata) setFileMetadata(updated.fileMetadata);
            setPcLastSyncTime(lastMod);
            addToast('info', 'Автоматично підтягнуто нові зміни з ПК папки', 'ПК Сервер');
          }
        }
      } catch (e) {
        console.warn("Polling PC folder lastModified failed:", e);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [pcFolderHandle, pcSyncStatus, pcLastSyncTime, addToast]);

  const handleSelectPcFolder = async () => {
    try {
      const res = await selectLocalFolder();
      if (res) {
        setPcFolderHandle(res.handle);
        setPcFolderName(res.folderName);
        setPcSyncStatus('synced');
        setPcErrorMessage(undefined);
        addToast('success', `Підключено папку "${res.folderName}" як локальний сервер`, 'ПК Сервер');

        const existingData = await loadBoardFromLocalFolder(res.handle);
        if (existingData && Array.isArray(existingData.notes) && existingData.notes.length > 0) {
          setNotes(existingData.notes);
          if (Array.isArray(existingData.folders)) setFolders(existingData.folders);
          if (Array.isArray(existingData.standaloneLinks)) setStandaloneLinks(existingData.standaloneLinks);
          if (Array.isArray(existingData.linkFolders)) setLinkFolders(existingData.linkFolders);
          if (existingData.linkMetadata) setLinkMetadata(existingData.linkMetadata);
          if (Array.isArray(existingData.standaloneFiles)) setStandaloneFiles(existingData.standaloneFiles);
          if (Array.isArray(existingData.fileFolders)) setFileFolders(existingData.fileFolders);
          if (existingData.fileMetadata) setFileMetadata(existingData.fileMetadata);
          if (existingData.canvasOffset) setOffset(existingData.canvasOffset);
          if (existingData.canvasScale) setScale(existingData.canvasScale);
          addToast('info', 'Завантажено дані з вибраної ПК папки', 'ПК Сервер');
        } else {
          performPcFolderSave();
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        addToast('error', err?.message || 'Не вдалося вибрати папку на ПК');
      }
    }
  };

  const handleRequestPcPermission = async () => {
    if (!pcFolderHandle) return;
    try {
      const granted = await verifyFolderPermission(pcFolderHandle, true);
      if (granted) {
        setPcSyncStatus('synced');
        setPcErrorMessage(undefined);
        addToast('success', 'Дозвіл надано. Синхронізація з ПК активна.', 'ПК Сервер');
        performPcFolderSave();
      } else {
        setPcSyncStatus('need_permission');
      }
    } catch (err: any) {
      addToast('error', 'Не вдалося отримати дозвіл на папку ПК');
    }
  };

  const handleDisconnectPcFolder = async () => {
    await clearDirectoryHandle();
    setPcFolderHandle(null);
    setPcFolderName(null);
    setPcSyncStatus('idle');
    setPcErrorMessage(undefined);
    addToast('info', 'Папку ПК відключено', 'ПК Сервер');
  };

  // Monitor Google Auth state to handle signed out status & notify on startup
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (_user) => {
        if (autoSaveDrive) {
          setSyncStatus('idle');
        }
      },
      () => {
        if (localStorage.getItem('google_drive_autosave') === 'true') {
          setSyncStatus('signed_out');
          if (!hasWarnedLoggedOutRef.current) {
            hasWarnedLoggedOutRef.current = true;
            addToast(
              'warning',
              'Автозбереження на Диск увімкнено, але ви не увійшли в акаунт Google',
              'Google Drive',
              'Увійдіть',
              () => setIsDriveModalOpen(true)
            );
          }
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [autoSaveDrive, addToast]);

  const performDriveSave = useCallback(async () => {
    if (!autoSaveDrive) return;
    if (notesRef.current.length === 0) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    const driveUser = getCurrentDriveUser();
    if (!driveUser) {
      setSyncStatus('signed_out');
      return;
    }

    if (isSavingToDriveRef.current) {
      return;
    }

    try {
      isSavingToDriveRef.current = true;
      setSyncStatus('syncing');

      const boardData = {
        notes: notesRef.current,
        canvasOffset: offset,
        canvasScale: scale,
        version: 1,
      };

      const res = await saveBoardToDrive(boardData, cachedDriveFileIdRef.current || undefined);
      if (res?.fileId) {
        cachedDriveFileIdRef.current = res.fileId;
        localStorage.setItem('gdrive_backup_file_id', res.fileId);
      }

      const now = Date.now();
      handleSyncComplete(now);
      setSyncStatus('synced');
    } catch (e: any) {
      console.error('Auto-save to Google Drive failed:', e);
      if (e?.isTokenExpired || e?.name === 'DriveTokenExpiredError' || e?.message?.includes('401')) {
        setSyncStatus('signed_out');
      } else {
        setSyncStatus('error');
      }
    } finally {
      isSavingToDriveRef.current = false;
    }
  }, [autoSaveDrive, offset, scale]);

  // Network Status and Automatic Offline-First Queue Handler
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoSaveDrive && notesRef.current.length > 0) {
        performDriveSave();
      } else {
        setSyncStatus('idle');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSaveDrive, performDriveSave]);

  // Debounced Auto-Save to Google Drive with Realtime Sync Status
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!autoSaveDrive) return;
    if (notes.length === 0) return;

    if (!getCurrentDriveUser()) {
      setSyncStatus('signed_out');
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performDriveSave();
    }, 8000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [notes, autoSaveDrive, performDriveSave]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load initial state from LocalStorage and rehydrate heavy attachments from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      let initialNotes: Note[] = [];
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.notes) initialNotes = parsed.notes;
          if (parsed.folders) setFolders(parsed.folders);
          if (parsed.offset) setOffset(parsed.offset);
          if (parsed.scale) setScale(parsed.scale);
        } else {
          // Default starter note
          const starterNote: Note = {
            id: 'welcome_1',
            x: window.innerWidth / 2 - 140,
            y: window.innerHeight / 2 - 110,
            width: 280,
            height: 220,
            content: '<p>Double-click anywhere to add a note.</p><p>Use the bottom dock buttons to cycle tools & formatting.</p>',
            color: 'white',
            fontFamily: 'sans',
            fontSize: 'base',
            textAlign: 'left',
            zIndex: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          initialNotes = [starterNote];
        }
      } catch (e) {
        console.error('Failed to load local storage:', e);
      }

      // Rehydrate attachment data URLs from IndexedDB & cleanup orphans
      try {
        const attMap = await getAllAttachmentsData();

        // Garbage collect orphaned attachments from IndexedDB
        const activeAttIds = new Set<string>();
        initialNotes.forEach((n) => {
          n.attachments?.forEach((att) => {
            if (att.id) activeAttIds.add(att.id);
          });
        });
        Object.keys(attMap).forEach((storedId) => {
          if (!activeAttIds.has(storedId)) {
            deleteAttachmentData(storedId).catch(() => {});
          }
        });

        if (Object.keys(attMap).length > 0 && initialNotes.length > 0) {
          initialNotes = initialNotes.map((note) => {
            if (!note.attachments || note.attachments.length === 0) return note;
            return {
              ...note,
              attachments: note.attachments.map((att) => {
                if ((!att.url || att.url === '') && attMap[att.id]) {
                  return { ...att, url: attMap[att.id] };
                }
                return att;
              }),
            };
          });
        }
      } catch (err) {
        console.error('Failed to rehydrate IndexedDB attachments:', err);
      }

      setNotes(initialNotes);
    }

    loadInitialData();
  }, []);

  // Save attachments to IndexedDB & save board state to LocalStorage (without silent data truncation)
  const isInitialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) {
      if (notes.length > 0) {
        isInitialLoadDoneRef.current = true;
      } else {
        return;
      }
    }

    // Persist attachments safely in IndexedDB
    notes.forEach((note) => {
      note.attachments?.forEach((att) => {
        if (att.id && att.url) {
          saveAttachmentData(att.id, att.url).catch(() => {});
        }
      });
    });

    const trySave = (data: unknown): boolean => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    };

    const stateToSave = {
      notes,
      folders,
      offset,
      scale,
    };

    // Attempt 1: Save full state
    if (trySave(stateToSave)) return;

    // Attempt 2: If LocalStorage is full (~5MB limit), offload base64 attachment URLs to IndexedDB
    // Note: State in memory is NOT modified, so current session data is never destroyed!
    const localStorageNotes = notes.map((n) => {
      if (!n.attachments || n.attachments.length === 0) return n;
      return {
        ...n,
        attachments: n.attachments.map((att) => {
          if (att.url && att.url.length > 10000 && att.url.startsWith('data:')) {
            return { ...att, url: '' }; // Offloaded to IndexedDB
          }
          return att;
        }),
      };
    });

    const lightState = {
      notes: localStorageNotes,
      folders,
      offset,
      scale,
    };

    if (trySave(lightState)) {
      addToast('info', 'Вкладення збережено в розширене сховище (IndexedDB) через обмеження LocalStorage.');
      return;
    }

    // Attempt 3: If LocalStorage remains full, alert user explicitly
    const minimalState = {
      notes: localStorageNotes.map((n) => ({
        ...n,
        attachments: n.attachments?.map((a) => ({ ...a, url: '' })),
      })),
      folders,
      offset,
      scale,
    };

    if (!trySave(minimalState)) {
      addToast('warning', 'Перевищено ліміт сховища браузера! Рекомендується зробити бекап бордів у файл.', 'Попередження сховища');
    }
  }, [notes, folders, offset, scale, addToast]);

  // Record History State Snapshot with text coalescing optimization
  const lastEditedNoteIdRef = useRef<string | null>(null);
  const lastEditTimestampRef = useRef<number>(0);

  const pushHistory = useCallback((newNotes: Note[], newFolders?: Folder[], isTextEdit = false) => {
    const currentFolders = newFolders !== undefined ? newFolders : foldersRef.current;
    const now = Date.now();

    setHistory((prev) => {
      const idx = historyIndexRef.current;
      const currentSnapshot = prev[idx];
      if (currentSnapshot) {
        if (currentSnapshot.notes === newNotes && (currentSnapshot.folders || []) === (currentFolders || [])) {
          return prev;
        }
      }

      // Coalesce continuous text typing within 3 seconds on the same note
      const shouldCoalesce = isTextEdit &&
        lastEditedNoteIdRef.current &&
        (now - lastEditTimestampRef.current < 3000) &&
        idx >= 0;

      if (shouldCoalesce) {
        lastEditTimestampRef.current = now;
        const updatedHistory = [...prev];
        updatedHistory[idx] = { notes: newNotes, folders: currentFolders };
        return updatedHistory;
      }

      if (!isTextEdit) {
        lastEditedNoteIdRef.current = null;
      } else {
        lastEditTimestampRef.current = now;
      }

      const updated = prev.slice(0, idx + 1);
      if (updated.length >= 100) updated.shift(); // Expanded history capacity to 100 steps
      const newHistory = [...updated, { notes: newNotes, folders: currentFolders }];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [setHistoryIndex]);

  const historyDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const commitHistory = useCallback((customNotes?: Note[], customFolders?: Folder[]) => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    pushHistory(customNotes || notesRef.current, customFolders || foldersRef.current, false);
  }, [pushHistory]);

  const commitHistoryDebounced = useCallback((isTextEdit = false) => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
    }
    historyDebounceTimerRef.current = setTimeout(() => {
      pushHistory(notesRef.current, foldersRef.current, isTextEdit);
      historyDebounceTimerRef.current = null;
    }, 600);
  }, [pushHistory]);

  const isHistoryInitializedRef = useRef(false);
  useEffect(() => {
    if (!isHistoryInitializedRef.current && (notes.length > 0 || folders.length > 0)) {
      setHistory([{ notes, folders }]);
      setHistoryIndex(0);
      isHistoryInitializedRef.current = true;
    }
  }, [notes, folders, setHistoryIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setNotes(previousState.notes);
      if (previousState.folders) setFolders(previousState.folders);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setHistoryIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNotes(nextState.notes);
      if (nextState.folders) setFolders(nextState.folders);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setHistoryIndex]);

  // Helper to find non-overlapping position in a strict 3-column grid
  const getNonOverlappingPos = useCallback((baseX: number, baseY: number, currentNotes: Note[], width = 280, height = 220) => {
    const gap = 24;
    const stepX = width + gap;
    const stepY = height + gap;

    const isOverlapping = (tx: number, ty: number) => {
      return currentNotes.some((n) => {
        if (n.hidden) return false;
        const nW = n.width || 280;
        const nH = n.height || 220;
        const overlapX = tx < n.x + nW + 8 && tx + width + 8 > n.x;
        const overlapY = ty < n.y + nH + 8 && ty + height + 8 > n.y;
        return overlapX && overlapY;
      });
    };

    let cols = 0;
    let rows = 0;
    const maxCols = 3; // Exactly 3 notes horizontally per row

    while (rows < 25) {
      const targetX = baseX + cols * stepX;
      const targetY = baseY + rows * stepY;

      if (!isOverlapping(targetX, targetY)) {
        return { x: targetX, y: targetY };
      }

      cols++;
      if (cols >= maxCols) {
        cols = 0;
        rows++;
      }
    }

    return { x: baseX + cols * stepX, y: baseY + rows * stepY };
  }, []);

  // Note CRUD Actions
  const handleAddNote = useCallback((atPosition?: Point, colorPreference: NoteColor = 'white') => {
    const centerPt = atPosition || screenToCanvas(
      window.innerWidth / 2,
      window.innerHeight / 2,
      offset,
      scale
    );

    const baseX = centerPt.x - 140;
    const baseY = centerPt.y - 110;

    const pos = getNonOverlappingPos(baseX, baseY, notes, 280, 220);

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);

    const newNote: Note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      x: pos.x,
      y: pos.y,
      width: 280,
      height: 220,
      content: '',
      color: colorPreference,
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: newZ,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setSelectedNoteId(newNote.id);
    centerOnNote(newNote, 1.0);
    pushHistory(updatedNotes);
  }, [offset, scale, maxZIndex, notes, pushHistory, getNonOverlappingPos, centerOnNote, setSelectedNoteId]);

  const handleAddNoteFromTemplate = useCallback((template: NoteTemplate) => {
    const centerPt = screenToCanvas(
      window.innerWidth / 2,
      window.innerHeight / 2,
      offset,
      scale
    );

    const baseX = centerPt.x - (template.width || 300) / 2;
    const baseY = centerPt.y - (template.height || 220) / 2;

    const pos = getNonOverlappingPos(baseX, baseY, notes, template.width || 300, template.height || 220);

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);

    const newNote: Note = {
      id: 'tmpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      x: pos.x,
      y: pos.y,
      width: template.width || 300,
      height: template.height || 220,
      content: template.content,
      color: template.color || 'white',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: newZ,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setSelectedNoteId(newNote.id);
    centerOnNote(newNote, 1.0);
    pushHistory(updatedNotes);
    addToast('success', `Створено з шаблону: ${template.name}`);
  }, [offset, scale, maxZIndex, notes, pushHistory, getNonOverlappingPos, centerOnNote, setSelectedNoteId, addToast]);

  const handleAddPlanner = useCallback((atPosition?: Point) => {
    const centerPt = atPosition || screenToCanvas(
      window.innerWidth / 2,
      window.innerHeight / 2,
      offset,
      scale
    );

    const baseX = centerPt.x - 140;
    const baseY = centerPt.y - 120;

    const pos = getNonOverlappingPos(baseX, baseY, notes, 300, 250);

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);

    const initialPlannerContent = createPlannerHTML('Планувальник', [
      { text: 'Завдання 1' },
      { text: 'Завдання 2' },
      { text: 'Завдання 3' },
    ]);

    const newNote: Note = {
      id: 'planner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      x: pos.x,
      y: pos.y,
      width: 300,
      height: 250,
      content: initialPlannerContent,
      color: 'slate',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: newZ,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setSelectedNoteId(newNote.id);
    centerOnNote(newNote, 1.0);
    pushHistory(updatedNotes);
  }, [offset, scale, maxZIndex, notes, pushHistory, getNonOverlappingPos, centerOnNote, setSelectedNoteId]);

  const handleCreateNoteFromAI = useCallback((title: string, content: string) => {
    const centerPt = screenToCanvas(
      window.innerWidth / 2,
      window.innerHeight / 2,
      offset,
      scale
    );
    const baseX = centerPt.x - 150;
    const baseY = centerPt.y - 110;
    const pos = getNonOverlappingPos(baseX, baseY, notes, 300, 220);

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);

    const newNote: Note = {
      id: 'ai_note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      title: title || 'AI Нотатка',
      x: pos.x,
      y: pos.y,
      width: 300,
      height: 220,
      content: convertMarkdownToHtml(content || ''),
      color: 'sage',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: newZ,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...notes, newNote];
    setNotes(updated);
    setSelectedNoteId(newNote.id);
    centerOnNote(newNote, 1.0);
    pushHistory(updated);
    addToast('success', `AI створив нотатку: ${title}`);
  }, [offset, scale, maxZIndex, notes, pushHistory, getNonOverlappingPos, centerOnNote, addToast]);

  // Folder Handlers
  const handleCreateFolder = useCallback((name = 'Нова папка') => {
    const newFolder: Folder = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name,
      collapsed: false,
      createdAt: Date.now(),
    };
    setFolders((prev) => {
      const updated = [...prev, newFolder];
      commitHistory(notesRef.current, updated);
      return updated;
    });
  }, [commitHistory]);

  const handleExecuteAiToolCall = useCallback((toolCall: { name: string; args: any }) => {
    const { name, args } = toolCall;
    if (!args) return;

    const centerPt = screenToCanvas(
      window.innerWidth / 2,
      window.innerHeight / 2,
      offset,
      scale
    );

    if (name === 'create_swot_analysis') {
      const { projectTitle, strengths, weaknesses, opportunities, threats, x, y } = args;
      const htmlContent = createSwotHTML(
        projectTitle || 'SWOT-аналіз',
        Array.isArray(strengths) ? strengths : [],
        Array.isArray(weaknesses) ? weaknesses : [],
        Array.isArray(opportunities) ? opportunities : [],
        Array.isArray(threats) ? threats : []
      );

      const w = 540;
      const h = 380;
      const baseX = typeof x === 'number' ? x : centerPt.x - w / 2;
      const baseY = typeof y === 'number' ? y : centerPt.y - h / 2;
      const pos = getNonOverlappingPos(baseX, baseY, notesRef.current, w, h);

      const newZ = maxZIndexRef.current + 1;
      setMaxZIndex(newZ);

      const swotNote: Note = {
        id: 'swot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        title: `SWOT: ${projectTitle || 'Проєкт'}`,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        content: htmlContent,
        color: 'cream',
        fontFamily: 'sans',
        fontSize: 'base',
        textAlign: 'left',
        zIndex: newZ,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated = [...notesRef.current, swotNote];
      setNotes(updated);
      setSelectedNoteId(swotNote.id);
      centerOnNote(swotNote, 1.0);
      commitHistory(updated, foldersRef.current);
      addToast('success', `Створено SWOT-аналіз для "${projectTitle || 'проєкту'}"`, 'AI Tools');
    } else if (name === 'create_note') {
      const { title, content, color, width, height, x, y } = args;
      const w = width || 300;
      const h = height || 220;
      const baseX = typeof x === 'number' ? x : centerPt.x - w / 2;
      const baseY = typeof y === 'number' ? y : centerPt.y - h / 2;
      const pos = getNonOverlappingPos(baseX, baseY, notesRef.current, w, h);

      const newZ = maxZIndexRef.current + 1;
      setMaxZIndex(newZ);

      const newNote: Note = {
        id: 'ai_note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        title: title || 'AI Нотатка',
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        content: convertMarkdownToHtml(content || ''),
        color: color || 'sage',
        fontFamily: 'sans',
        fontSize: 'base',
        textAlign: 'left',
        zIndex: newZ,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated = [...notesRef.current, newNote];
      setNotes(updated);
      setSelectedNoteId(newNote.id);
      centerOnNote(newNote, 1.0);
      commitHistory(updated, foldersRef.current);
      addToast('success', `Створено нотатку на полотні: ${title || 'AI Нотатка'}`);
    } else if (name === 'create_planner') {
      const { title, tasks, x, y } = args;
      const htmlContent = createPlannerHTML(
        title || 'Планувальник',
        Array.isArray(tasks) ? tasks : []
      );

      const w = 320;
      const h = 260;
      const baseX = typeof x === 'number' ? x : centerPt.x - w / 2;
      const baseY = typeof y === 'number' ? y : centerPt.y - h / 2;
      const pos = getNonOverlappingPos(baseX, baseY, notesRef.current, w, h);

      const newZ = maxZIndexRef.current + 1;
      setMaxZIndex(newZ);

      const plannerNote: Note = {
        id: 'planner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        title: title || 'Планувальник',
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        content: htmlContent,
        color: 'slate',
        fontFamily: 'sans',
        fontSize: 'base',
        textAlign: 'left',
        zIndex: newZ,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated = [...notesRef.current, plannerNote];
      setNotes(updated);
      setSelectedNoteId(plannerNote.id);
      centerOnNote(plannerNote, 1.0);
      commitHistory(updated, foldersRef.current);
      addToast('success', `Створено планувальник: ${title || 'Планувальник'}`);
    } else if (name === 'create_folder') {
      handleCreateFolder(args.name || 'Нова папка');
    }
  }, [offset, scale, getNonOverlappingPos, centerOnNote, commitHistory, addToast, handleCreateFolder]);

  const handleUpdateNote = useCallback((id: string, updates: Partial<Note>, isTextContent = false) => {
    if (isTextContent) {
      lastEditedNoteIdRef.current = id;
    }
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      return updated;
    });
    if (isTextContent) {
      commitHistoryDebounced(true);
    } else {
      commitHistory();
    }
  }, [commitHistory, commitHistoryDebounced]);

  const handleNavigateToNote = useCallback((id: string) => {
    const targetNote = notesRef.current.find((n) => n.id === id);
    if (targetNote) {
      if (targetNote.folderId) {
        setFolders((prev) =>
          prev.map((f) => (f.id === targetNote.folderId ? { ...f, collapsed: false } : f))
        );
      }
      const newZ = maxZIndexRef.current + 1;
      setMaxZIndex(newZ);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n))
      );
      setSelectedNoteIds([id]);
      centerOnNote(targetNote, 1.0);
      addToast('info', `Перехід до нотатки: ${targetNote.title || 'Нотатка'}`, 'Backlink');
    } else {
      addToast('warning', 'Пов\'язану нотатку не знайдено', 'Backlink');
    }
  }, [centerOnNote, addToast]);

  const checkAndAutoGroupNotes = useCallback((movedNoteIds: string[]) => {
    const idsToCheck = movedNoteIds.length > 0 ? movedNoteIds : notesRef.current.map((n) => n.id);
    if (idsToCheck.length === 0) return;
    let notesChanged = false;
    let updatedNotes = notesRef.current;
    let updatedFolders = foldersRef.current;
    let foldersChanged = false;

    idsToCheck.forEach((id) => {
      const note = updatedNotes.find((n) => n.id === id);
      if (!note) return;

      const noteCenterX = note.x + (note.width || 280) / 2;
      const noteCenterY = note.y + (note.height || 220) / 2;

      let matchedFolderId: string | undefined = undefined;

      updatedFolders.forEach((folder) => {
        const fx = folder.x ?? 100;
        const fy = folder.y ?? 100;
        const fw = folder.width ?? 420;
        const fh = folder.height ?? 320;

        if (
          noteCenterX >= fx &&
          noteCenterX <= fx + fw &&
          noteCenterY >= fy &&
          noteCenterY <= fy + fh
        ) {
          matchedFolderId = folder.id;
        }
      });

      if (note.folderId !== matchedFolderId) {
        notesChanged = true;
        updatedNotes = updatedNotes.map((n) => (n.id === id ? { ...n, folderId: matchedFolderId } : n));
      }
    });

    // Auto-fit folder bounds so all contained notes stay cleanly enclosed with harmonious padding
    updatedFolders = updatedFolders.map((folder) => {
      const folderNotes = updatedNotes.filter((n) => n.folderId === folder.id && !n.hidden);

      if (folderNotes.length === 0) return folder;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      folderNotes.forEach((n) => {
        const nw = n.width || 280;
        const nh = n.height || 220;
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + nw > maxX) maxX = n.x + nw;
        if (n.y + nh > maxY) maxY = n.y + nh;
      });

      if (minX === Infinity) return folder;

      const paddingLeft = 24;
      const paddingTop = 40;
      const paddingRight = 32;
      const paddingBottom = 32;

      const fx = folder.x ?? 100;
      const fy = folder.y ?? 100;
      const fw = folder.width ?? 380;
      const fh = folder.height ?? 280;

      const targetX = Math.min(fx, minX - paddingLeft);
      const targetY = Math.min(fy, minY - paddingTop);
      const targetW = Math.max(fw, maxX + paddingRight - targetX, 320);
      const targetH = Math.max(fh, maxY + paddingBottom - targetY, 240);

      if (
        targetX !== fx ||
        targetY !== fy ||
        targetW !== fw ||
        targetH !== fh
      ) {
        foldersChanged = true;
        return {
          ...folder,
          x: targetX,
          y: targetY,
          width: targetW,
          height: targetH,
        };
      }
      return folder;
    });

    if (notesChanged || foldersChanged) {
      setNotes(updatedNotes);
      setFolders(updatedFolders);
      commitHistory(updatedNotes, updatedFolders);
    }
  }, [commitHistory]);

  const handleUpdateEnd = useCallback(() => {
    checkAndAutoGroupNotes(selectedNoteIds);
    commitHistory();
  }, [commitHistory, checkAndAutoGroupNotes, selectedNoteIds]);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const targetNote = prev.find((n) => n.id === id);
      if (targetNote?.attachments && targetNote.attachments.length > 0) {
        targetNote.attachments.forEach((att) => {
          if (att.id) {
            deleteAttachmentData(att.id).catch(() => {});
          }
        });
      }
      const updated = prev.filter((n) => n.id !== id);
      pushHistory(updated);
      return updated;
    });
    setSelectedNoteIds((prev) => prev.filter((noteId) => noteId !== id));
  }, [pushHistory]);

  const handleDuplicateNote = useCallback((id: string) => {
    setNotes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target) return prev;

      const newZ = maxZIndexRef.current + 1;
      setMaxZIndex(newZ);

      const dupAttachments = target.attachments?.map((att) => {
        const newAttId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        if (att.url) {
          saveAttachmentData(newAttId, att.url).catch(() => {});
        }
        return { ...att, id: newAttId };
      });

      const dup: Note = {
        ...target,
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        x: target.x + 24,
        y: target.y + 24,
        zIndex: newZ,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...(dupAttachments ? { attachments: dupAttachments } : {}),
      };

      const updated = [...prev, dup];
      setSelectedNoteId(dup.id);
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  const handleBringToFront = useCallback((id: string) => {
    setMaxZIndex((prevZ) => {
      const newZ = prevZ + 1;
      setNotes((prevNotes) => {
        const target = prevNotes.find((n) => n.id === id);
        if (target?.folderId) {
          setFolders((prevFolders) => {
            const folder = prevFolders.find((f) => f.id === target.folderId);
            if (!folder) return prevFolders;
            return [...prevFolders.filter((f) => f.id !== target.folderId), folder];
          });
        }
        return prevNotes.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n));
      });
      return newZ;
    });
    commitHistory();
  }, [commitHistory]);

  const handleUpdateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      commitHistory(notesRef.current, updated);
      return updated;
    });
  }, [commitHistory]);

  const handleDeleteFolder = useCallback((id: string) => {
    const updatedNotes = notesRef.current.map((n) => (n.folderId === id ? { ...n, folderId: undefined } : n));
    const updatedFolders = foldersRef.current.filter((f) => f.id !== id);

    setNotes(updatedNotes);
    setFolders(updatedFolders);
    commitHistory(updatedNotes, updatedFolders);
  }, [commitHistory]);

  const handleArrangeFolderGrid = useCallback((targetFolderId: string) => {
    const folderNotes = notesRef.current.filter((n) => n.folderId === targetFolderId);

    if (folderNotes.length === 0) return;

    let anchorX = Infinity;
    let anchorY = Infinity;

    folderNotes.forEach((n) => {
      if (n.x < anchorX) anchorX = n.x;
      if (n.y < anchorY) anchorY = n.y;
    });

    if (anchorX === Infinity) anchorX = 100;
    if (anchorY === Infinity) anchorY = 100;

    const COLS = 3;
    const GAP_X = 310;
    const GAP_Y = 260;

    let itemIdx = 0;
    const notePosMap = new Map<string, { x: number; y: number }>();

    folderNotes.forEach((n) => {
      const col = itemIdx % COLS;
      const row = Math.floor(itemIdx / COLS);
      notePosMap.set(n.id, {
        x: anchorX + col * GAP_X,
        y: anchorY + row * GAP_Y,
      });
      itemIdx++;
    });

    let updatedNotes = notesRef.current;
    if (notePosMap.size > 0) {
      updatedNotes = notesRef.current.map((n) => {
        const pos = notePosMap.get(n.id);
        return pos ? { ...n, ...pos } : n;
      });
      setNotes(updatedNotes);
    }

    const gridCols = Math.min(COLS, Math.max(1, folderNotes.length));
    const gridRows = Math.ceil(Math.max(1, folderNotes.length) / COLS);
    const gridW = gridCols * GAP_X + 40;
    const gridH = gridRows * GAP_Y + 60;

    const updatedFolders = foldersRef.current.map((f) =>
      f.id === targetFolderId ? { ...f, width: gridW, height: gridH } : f
    );
    setFolders(updatedFolders);

    commitHistory(updatedNotes, updatedFolders);
  }, [commitHistory]);

  const handleMoveLayerToFolder = useCallback((layerId: string, layerType: 'note', folderId: string | null) => {
    let updatedNotes = notesRef.current;

    if (layerType === 'note') {
      updatedNotes = notesRef.current.map((n) => (n.id === layerId ? { ...n, folderId: folderId || undefined } : n));
      setNotes(updatedNotes);
    }

    commitHistory(updatedNotes, foldersRef.current);

    if (folderId) {
      setTimeout(() => {
        handleArrangeFolderGrid(folderId);
      }, 50);
    }
  }, [commitHistory, handleArrangeFolderGrid]);

  // Frame / Group Container Operations (Absolute 100% Smooth Dragging)
  const handleMoveFrameAbsolute = useCallback((
    folderId: string,
    startFolderPos: { x: number; y: number },
    startNotesPos: Array<{ id: string; x: number; y: number }>,
    totalDx: number,
    totalDy: number
  ) => {
    const updatedFolders = foldersRef.current.map((f) =>
      f.id === folderId ? { ...f, x: startFolderPos.x + totalDx, y: startFolderPos.y + totalDy } : f
    );

    const notesMap = new Map(startNotesPos.map((n) => [n.id, { x: n.x + totalDx, y: n.y + totalDy }]));
    const updatedNotes = notesRef.current.map((n) => {
      const pos = notesMap.get(n.id);
      return pos ? { ...n, ...pos } : n;
    });

    setFolders(updatedFolders);
    setNotes(updatedNotes);
  }, []);

  const handleResizeFrame = useCallback((folderId: string, newWidth: number, newHeight: number) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const folderNotes = notesRef.current.filter((n) => n.folderId === folderId && !n.hidden);

        let maxRight = (f.x ?? 100) + 200;
        let maxBottom = (f.y ?? 100) + 160;

        folderNotes.forEach((n) => {
          const nw = n.width || 280;
          const nh = n.height || 220;
          if (n.x + nw > maxRight) maxRight = n.x + nw;
          if (n.y + nh > maxBottom) maxBottom = n.y + nh;
        });

        const minW = Math.max(300, maxRight - (f.x ?? 100) + 32);
        const minH = Math.max(220, maxBottom - (f.y ?? 100) + 32);

        return {
          ...f,
          width: Math.max(newWidth, minW),
          height: Math.max(newHeight, minH),
        };
      })
    );
  }, []);

  const handleMoveFrameEnd = useCallback(() => {
    commitHistory(notesRef.current, foldersRef.current);
  }, [commitHistory]);

  const handleCreateFrameFromSelection = useCallback((targetNoteIds?: string[]) => {
    const idsToGroup = targetNoteIds || selectedNoteIds;
    const targetNotes = notesRef.current.filter((n) => idsToGroup.includes(n.id) && !n.hidden);

    const folderCount = foldersRef.current.length + 1;
    const newFolderId = `folder_${Date.now()}`;

    let fx = 100;
    let fy = 100;
    let fw = 420;
    let fh = 320;

    if (targetNotes.length > 0) {
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      targetNotes.forEach((n) => {
        const nw = n.width || 280;
        const nh = n.height || 220;
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + nw > maxX) maxX = n.x + nw;
        if (n.y + nh > maxY) maxY = n.y + nh;
      });

      const paddingX = 40;
      const paddingY = 60;

      fx = minX - paddingX;
      fy = minY - paddingY;
      fw = Math.max(360, (maxX - minX) + paddingX * 2);
      fh = Math.max(280, (maxY - minY) + paddingY * 2);
    } else {
      // Position empty frame in viewport center with offset
      const viewX = (-offset.x + window.innerWidth / 2) / scale - 210;
      const viewY = (-offset.y + window.innerHeight / 2) / scale - 160;
      const step = (foldersRef.current.length % 5) * 30;
      fx = viewX + step;
      fy = viewY + step;
    }

    const newFolder: Folder = {
      id: newFolderId,
      name: `Рамка ${folderCount}`,
      createdAt: Date.now(),
      x: fx,
      y: fy,
      width: fw,
      height: fh,
    };

    const updatedFolders = [...foldersRef.current, newFolder];
    setFolders(updatedFolders);

    let updatedNotes = notesRef.current;
    if (targetNotes.length > 0) {
      const targetSet = new Set(targetNotes.map((n) => n.id));
      updatedNotes = notesRef.current.map((n) =>
        targetSet.has(n.id) ? { ...n, folderId: newFolderId } : n
      );
      setNotes(updatedNotes);
      addToast('info', `Створено ${newFolder.name} з ${targetNotes.length} нотаток`);
    } else {
      addToast('info', `Створено нову ${newFolder.name}`);
    }

    commitHistory(updatedNotes, updatedFolders);
  }, [selectedNoteIds, offset, scale, commitHistory, addToast]);

  const handleAddNoteToFrame = useCallback((folderId: string, defaultX: number, defaultY: number) => {
    const newZ = maxZIndexRef.current + 1;
    setMaxZIndex(newZ);

    const newNote: Note = {
      id: `note_${Date.now()}`,
      x: defaultX,
      y: defaultY,
      width: 280,
      height: 220,
      content: '<p></p>',
      color: 'white',
      fontFamily: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      zIndex: newZ,
      folderId: folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...notesRef.current, newNote];
    setNotes(updated);
    setSelectedNoteIds([newNote.id]);
    commitHistory(updated, foldersRef.current);
  }, [commitHistory]);

  const handleReorderLayer = useCallback((
    sourceId: string,
    sourceType: 'note',
    targetId: string,
    targetType: 'note'
  ) => {
    if (sourceId === targetId) return;

    if (sourceType === 'note' && targetType === 'note') {
      setNotes((prev) => {
        const sNote = prev.find((n) => n.id === sourceId);
        const tNote = prev.find((n) => n.id === targetId);
        if (!sNote || !tNote) return prev;

        const sZ = sNote.zIndex || 0;
        const tZ = tNote.zIndex || 0;
        const newSZ = sZ === tZ ? tZ + 1 : tZ;
        const newTZ = sZ === tZ ? tZ : sZ;

        const updated = prev.map((n) => {
          if (n.id === sourceId) return { ...n, zIndex: newSZ };
          if (n.id === targetId) return { ...n, zIndex: newTZ };
          return n;
        });
        commitHistory(updated, foldersRef.current);
        return updated;
      });
    }
  }, [commitHistory]);

  // Formatting active selected note
  const handleFormatActiveNote = (command: string, value: string | undefined = undefined) => {
    if (!selectedNoteId) return;

    const activeEditor = document.querySelector(`[data-note-id="${selectedNoteId}"] [contenteditable]`) as HTMLElement;
    if (!activeEditor) return;

    // 1. Restore saved selection range BEFORE focusing
    let selection = window.getSelection();
    const savedRange: Range | null = (window as any).__lastNoteSelectionRange || null;

    if (savedRange && activeEditor.contains(savedRange.commonAncestorContainer)) {
      activeEditor.focus();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    } else {
      activeEditor.focus();
    }

    selection = window.getSelection();
    const currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (command === 'bulletList') {
      try {
        document.execCommand('insertUnorderedList', false);
      } catch (e) {}
      if (activeEditor) {
        handleUpdateNote(selectedNoteId, {
          content: activeEditor.innerHTML,
          updatedAt: Date.now(),
        });
        commitHistory();
      }
      return;
    }

    if (command === 'numberList') {
      try {
        document.execCommand('insertOrderedList', false);
      } catch (e) {}
      if (activeEditor) {
        handleUpdateNote(selectedNoteId, {
          content: activeEditor.innerHTML,
          updatedAt: Date.now(),
        });
        commitHistory();
      }
      return;
    }

    if (command === 'toggleList') {
      let isUL = false;
      let isOL = false;

      try {
        isUL = document.queryCommandState('insertUnorderedList');
        isOL = document.queryCommandState('insertOrderedList');
      } catch (e) {}

      if (!isUL && !isOL && currentRange) {
        let container: Node | null = currentRange.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode;
        }
        let parentEl = container as HTMLElement | null;
        while (parentEl && parentEl !== activeEditor) {
          const tag = parentEl.tagName ? parentEl.tagName.toLowerCase() : '';
          if (tag === 'ul') {
            isUL = true;
            break;
          }
          if (tag === 'ol') {
            isOL = true;
            break;
          }
          parentEl = parentEl.parentElement;
        }
      }

      try {
        if (isUL) {
          // Switch from bullet list (UL) -> numbered list (OL)
          document.execCommand('insertUnorderedList', false);
          document.execCommand('insertOrderedList', false);
        } else if (isOL) {
          // Switch from numbered list (OL) -> plain text
          document.execCommand('insertOrderedList', false);
        } else {
          // Create bullet list (UL)
          document.execCommand('insertUnorderedList', false);
        }
      } catch (e) {}

      if (activeEditor) {
        handleUpdateNote(selectedNoteId, {
          content: activeEditor.innerHTML,
          updatedAt: Date.now(),
        });
        commitHistory();
      }
      return;
    }

    if (command === 'insertChecklist') {
      const itemDiv = document.createElement('div');
      itemDiv.style.display = 'flex';
      itemDiv.style.alignItems = 'center';
      itemDiv.style.gap = '10px';
      itemDiv.style.marginTop = '6px';
      itemDiv.style.marginBottom = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';

      const textSpan = document.createElement('span');
      textSpan.innerText = 'Нове завдання';
      textSpan.style.outline = 'none';

      itemDiv.appendChild(cb);
      itemDiv.appendChild(textSpan);

      if (currentRange && activeEditor.contains(currentRange.commonAncestorContainer)) {
        currentRange.insertNode(itemDiv);
      } else {
        activeEditor.appendChild(itemDiv);
      }

      handleUpdateNote(selectedNoteId, {
        content: activeEditor.innerHTML,
        updatedAt: Date.now(),
      });
      commitHistory();
      return;
    }

    if (command === 'hiliteColor') {
      if (!value || value === 'transparent' || value === 'none') {
        try {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('hiliteColor', false, 'transparent');
          document.execCommand('backColor', false, 'transparent');
        } catch (e) {}

        if (currentRange && !currentRange.collapsed) {
          const container = currentRange.commonAncestorContainer;
          let el: HTMLElement | null = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);
          while (el && el !== activeEditor) {
            if (el.tagName === 'MARK' || el.style.backgroundColor) {
              el.style.backgroundColor = '';
              if (el.tagName === 'MARK') {
                const parent = el.parentNode;
                if (parent) {
                  while (el.firstChild) parent.insertBefore(el.firstChild, el);
                  parent.removeChild(el);
                }
              }
              break;
            }
            el = el.parentElement;
          }
        }
      } else {
        if (currentRange && !currentRange.collapsed) {
          try {
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('hiliteColor', false, value);
          } catch (e) {
            try {
              document.execCommand('backColor', false, value);
            } catch (err) {}
          }
        } else {
          addToast('info', 'Спочатку виділіть фрагмент тексту, щоб застосувати маркер');
        }
      }
    } else if (command === 'foreColor') {
      if (currentRange && !currentRange.collapsed) {
        try {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, value || '#000000');
        } catch (e) {}
      } else {
        addToast('info', 'Спочатку виділіть фрагмент тексту, щоб змінити колір шрифту');
      }
    } else if (command === 'fontName') {
      const fontCSSMap: Record<string, string> = {
        sans: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
        serif: "'Playfair Display', Georgia, serif",
        mono: "'Fira Code', ui-monospace, monospace",
      };
      const fontClassMap: Record<string, string> = {
        sans: 'font-sans',
        serif: 'font-serif',
        mono: 'font-mono',
      };

      const fontKey = value || 'sans';
      const fontCSS = fontCSSMap[fontKey] || fontKey;
      const fontClass = fontClassMap[fontKey] || 'font-sans';

      if (currentRange && !currentRange.collapsed) {
        const span = document.createElement('span');
        span.className = fontClass;
        span.style.fontFamily = fontCSS;

        try {
          const extracted = currentRange.extractContents();
          span.appendChild(extracted);
          currentRange.insertNode(span);

          if (selection) {
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
            (window as any).__lastNoteSelectionRange = newRange.cloneRange();
          }
        } catch (e) {
          try {
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('fontName', false, fontCSS);
          } catch (err) {}
        }
      } else {
        handleUpdateNoteProps({ fontFamily: fontKey as FontFamily });
      }
    } else {
      try {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand(command, false, value);
      } catch (e) {}
    }

    // Sync contenteditable HTML back to state
    if (activeEditor) {
      handleUpdateNote(selectedNoteId, {
        content: activeEditor.innerHTML,
        updatedAt: Date.now(),
      });
    }
    commitHistory();
  };

  const handleUpdateNoteProps = (updates: {
    fontFamily?: FontFamily;
    fontSize?: FontSize;
    textAlign?: TextAlign;
    color?: NoteColor;
  }) => {
    if (selectedNoteId) {
      handleUpdateNote(selectedNoteId, updates);
      commitHistory();
    }
  };

  // Active Note details
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleFocusLayer = useCallback((pt: Point, itemWidth = 280, itemHeight = 200) => {
    const centerX = pt.x + itemWidth / 2;
    const centerY = pt.y + itemHeight / 2;
    const targetScale = 1.0;
    const newX = window.innerWidth / 2 - centerX * targetScale;
    const newY = window.innerHeight / 2 - centerY * targetScale;
    setOffset({ x: newX, y: newY });
    setScale(targetScale);
  }, []);

  const handlePanToCenter = useCallback((canvasX: number, canvasY: number) => {
    const newX = window.innerWidth / 2 - canvasX * scale;
    const newY = window.innerHeight / 2 - canvasY * scale;
    setOffset({ x: newX, y: newY });
  }, [scale]);

  const handleZoomToFitAll = useCallback(() => {
    const allBounds = [
      ...notes.map((n) => ({ x: n.x, y: n.y, w: n.width || 280, h: n.height || 200 })),
      ...folders.map((f) => ({ x: f.x, y: f.y, w: f.width || 320, h: f.height || 220 })),
      ...standaloneLinks.map((l) => ({ x: l.x, y: l.y, w: l.width || 240, h: l.height || 140 })),
      ...standaloneFiles.map((f) => ({ x: f.x, y: f.y, w: f.width || 240, h: f.height || 140 })),
    ];

    if (allBounds.length === 0) {
      setOffset({ x: 0, y: 0 });
      setScale(1);
      return;
    }

    const minX = Math.min(...allBounds.map((b) => b.x));
    const minY = Math.min(...allBounds.map((b) => b.y));
    const maxX = Math.max(...allBounds.map((b) => b.x + b.w));
    const maxY = Math.max(...allBounds.map((b) => b.y + b.h));

    const bboxW = Math.max(100, maxX - minX);
    const bboxH = Math.max(100, maxY - minY);

    const padding = 120;
    const scaleX = (window.innerWidth - padding * 2) / bboxW;
    const scaleY = (window.innerHeight - padding * 2) / bboxH;
    const targetScale = Math.min(1.2, Math.max(0.15, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newX = window.innerWidth / 2 - centerX * targetScale;
    const newY = window.innerHeight / 2 - centerY * targetScale;

    setOffset({ x: newX, y: newY });
    setScale(targetScale);
  }, [notes, folders, standaloneLinks, standaloneFiles]);

  const handleOpenSearchPanel = useCallback(() => {
    setShowLayersPanel(true);
    setActivePanelTab('search');
    setShouldFocusSearchPanel(true);
    setTimeout(() => setShouldFocusSearchPanel(false), 200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenSearchPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenSearchPanel]);

  const handleAttachFile = (files: FileList) => {
    const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

    if (selectedNote) {
      // Note is active: attach file into the selected note
      const noteToUpdate = selectedNote;

      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onerror = () => {
          addToast('error', `Помилка читання файлу ${file.name}`);
        };
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const newAttachment: Attachment = {
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            name: file.name,
            type: file.type,
            url: result,
            size: file.size,
          };
          saveAttachmentData(newAttachment.id, newAttachment.url).catch(() => {});

          setNotes((prevNotes) => {
            const currentNote = prevNotes.find((n) => n.id === noteToUpdate.id);
            const existingAtts = currentNote?.attachments || [];
            const updatedNotes = prevNotes.map((n) =>
              n.id === noteToUpdate.id
                ? {
                    ...n,
                    attachments: [...existingAtts, newAttachment],
                    updatedAt: Date.now(),
                  }
                : n
            );
            pushHistory(updatedNotes);
            return updatedNotes;
          });
        };
        reader.readAsDataURL(file);
      });
    } else {
      // No note active: add file directly onto the canvas field without a note wrapper
      const centerPt = screenToCanvas(
        window.innerWidth / 2,
        window.innerHeight / 2,
        offset,
        scale
      );

      Array.from(files).forEach((file: File, index: number) => {
        const reader = new FileReader();
        reader.onerror = () => {
          addToast('error', `Помилка читання файлу ${file.name}`);
        };
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const newAttachment: Attachment = {
            id: 'att_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substring(2, 5),
            name: file.name,
            type: file.type,
            url: result,
            size: file.size,
          };
          saveAttachmentData(newAttachment.id, newAttachment.url).catch(() => {});

          const isImg = file.type.startsWith('image/');
          const isVid = file.type.startsWith('video/');
          const isAud = file.type.startsWith('audio/');

          const w = isImg ? 320 : isVid ? 340 : isAud ? 300 : 280;
          const h = isImg ? 240 : isVid ? 240 : isAud ? 120 : 100;

          const newZ = maxZIndex + 1 + index;
          setMaxZIndex(newZ);

          const newFileId = 'file_' + Date.now() + '_' + index;

          setNotes((prev) => {
            const baseX = centerPt.x - w / 2;
            const baseY = centerPt.y - h / 2;
            const pos = getNonOverlappingPos(baseX, baseY, prev, w, h);

            const newFileItem: Note = {
              id: newFileId,
              x: pos.x,
              y: pos.y,
              width: w,
              height: h,
              content: '', // Empty text: purely a file on canvas
              title: file.name,
              color: 'slate',
              fontFamily: 'sans',
              fontSize: 'base',
              textAlign: 'left',
              zIndex: newZ,
              locked: false,
              hidden: false,
              attachments: [newAttachment],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const updated = [...prev, newFileItem];
            pushHistory(updated);
            return updated;
          });
          setSelectedNoteId(newFileId);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Panning & Zooming
  const [touchPinchStartDist, setTouchPinchStartDist] = useState<number | null>(null);
  const [touchPinchStartScale, setTouchPinchStartScale] = useState<number | null>(null);

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;

    const targetEl = e.target as HTMLElement;
    if (targetEl && targetEl.closest && targetEl.closest('[data-note-id]')) {
      return;
    }

    if (e.button === 0 && !e.altKey && e.target === canvasRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY, offset, scale);
      setSelectionStart(pt);
      setSelectionEnd(pt);
      isSelectingMarqueeRef.current = true;
      if (!e.shiftKey) {
        setSelectedNoteIds([]);
      }
    } else if (e.button === 1 || (e.button === 0 && e.altKey)) {
      if (e.target === canvasRef.current) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    }
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;

    if (isSelectingMarqueeRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY, offset, scale);
      setSelectionEnd(pt);
    } else if (isPanning && touchPinchStartDist === null) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUpCanvas = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;

    if (isSelectingMarqueeRef.current && selectionStart && selectionEnd) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const matchedNoteIds = notesRef.current
          .filter((n) => !n.hidden)
          .filter((n) => {
            const nw = n.width || 280;
            const nh = n.height || 220;
            const overlapX = n.x < maxX && n.x + nw > minX;
            const overlapY = n.y < maxY && n.y + nh > minY;
            return overlapX && overlapY;
          })
          .map((n) => n.id);

        if (e.shiftKey) {
          setSelectedNoteIds((prev) => Array.from(new Set([...prev, ...matchedNoteIds])));
        } else {
          setSelectedNoteIds(matchedNoteIds);
        }
      }
      setSelectionStart(null);
      setSelectionEnd(null);
      isSelectingMarqueeRef.current = false;
    }

    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const targetEl = e.target as HTMLElement;
      if (targetEl && targetEl.closest && targetEl.closest('[data-note-id]')) {
        return;
      }

      if (e.target === canvasRef.current) {
        setSelectedNoteId(null);
      }

      if (e.target === canvasRef.current) {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
        setTouchPinchStartDist(null);
        setTouchPinchStartScale(null);
      }
    } else if (e.touches.length === 2) {
      setIsPanning(false); // disable panning while zooming
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      setTouchPinchStartDist(dist);
      setTouchPinchStartScale(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
    } else if (e.touches.length === 2 && touchPinchStartDist !== null && touchPinchStartScale !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const zoomFactor = dist / touchPinchStartDist;
      
      const newScale = Math.max(0.2, Math.min(3.5, touchPinchStartScale * zoomFactor));

      const mouseX = (touch1.clientX + touch2.clientX) / 2;
      const mouseY = (touch1.clientY + touch2.clientY) / 2;

      setOffset((prev) => ({
        x: mouseX - (mouseX - prev.x) * (newScale / scale),
        y: mouseY - (mouseY - prev.y) * (newScale / scale),
      }));
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setTouchPinchStartDist(null);
      setTouchPinchStartScale(null);
    } else if (e.touches.length === 1) {
      setIsPanning(false);
      setTouchPinchStartDist(null);
      setTouchPinchStartScale(null);
    }
  };

  const handleDoubleClickCanvas = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY, offset, scale);
      handleAddNote(pt);
    }
  };

  const handleWheelCanvas = (e: React.WheelEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl && targetEl.closest && targetEl.closest('[data-note-id]')) {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        return;
      }
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.max(0.2, Math.min(3.5, scale * zoomFactor));

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      setOffset((prev) => ({
        x: mouseX - (mouseX - prev.x) * (newScale / scale),
        y: mouseY - (mouseY - prev.y) * (newScale / scale),
      }));
      setScale(newScale);
    } else {
      setOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          handleAddNote();
          break;
        case 'escape':
          setSelectedNoteId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddNote, handleUndo, handleRedo]);

  // Global Paste Handler (creates a new link card note when pasting URLs on canvas)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain');
      if (!pastedText) return;

      if (isUrl(pastedText) || /(https?:\/\/|www\.)/i.test(pastedText)) {
        e.preventDefault();
        const linkCardHtml = createLinkCardHtml(pastedText);

        const centerPt = screenToCanvas(
          window.innerWidth / 2,
          window.innerHeight / 2,
          offset,
          scale
        );
        const baseX = centerPt.x - 140;
        const baseY = centerPt.y - 60;
        const pos = getNonOverlappingPos(baseX, baseY, notes, 280, 120);
        const newZ = maxZIndex + 1;
        setMaxZIndex(newZ);

        const newNote: Note = {
          id: 'note_link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          x: pos.x,
          y: pos.y,
          width: 280,
          height: 120,
          content: linkCardHtml,
          color: 'white',
          fontFamily: 'sans',
          fontSize: 'base',
          textAlign: 'left',
          zIndex: newZ,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        setSelectedNoteId(newNote.id);
        pushHistory(updatedNotes);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [offset, scale, maxZIndex, notes, pushHistory, getNonOverlappingPos]);

  // Export handlers
  const handleExportPlainJSON = () => {
    const payload = {
      version: 1,
      notes,
      canvasOffset: offset,
      canvasScale: scale,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `notepad_backup_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const doExportEncryptedJSON = async (passwordToUse: string) => {
    const payload = {
      version: 1,
      notes,
      canvasOffset: offset,
      canvasScale: scale,
    };

    const encrypted = await encryptVault(payload, passwordToUse);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(encrypted, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `encrypted_notepad_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleExportEncryptedJSON = async () => {
    if (masterPassword) {
      await doExportEncryptedJSON(masterPassword);
    } else {
      setIsVaultModalOpen(true);
    }
  };

  const handleExportStandaloneHTML = () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob(['<!DOCTYPE html>\n<html lang="uk" class="dark">\n' + htmlContent + '\n</html>'], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinite_notepad_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportTXT = () => {
    let textOutput = `=== NOTES EXPORT (${new Date().toLocaleString('uk-UA')}) ===\n\n`;
    notes.forEach((note, index) => {
      if (note.hidden) return;
      const title = note.title || (note.attachments?.[0]?.name ? `File: ${note.attachments[0].name}` : `Note #${index + 1}`);
      const rawContent = (note.content || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
      textOutput += `----------------------------------------\n`;
      textOutput += `TITLE: ${title}\n`;
      if (note.createdAt) {
        textOutput += `DATE: ${new Date(note.createdAt).toLocaleString('uk-UA')}\n`;
      }
      textOutput += `----------------------------------------\n`;
      textOutput += `${rawContent.trim()}\n\n`;

      if (note.checklist && note.checklist.length > 0) {
        textOutput += `CHECKLIST:\n`;
        note.checklist.forEach((item) => {
          textOutput += `  [${item.completed ? 'x' : ' '}] ${item.text}\n`;
        });
        textOutput += `\n`;
      }
    });

    const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_export_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (payload: { notes?: Note[]; canvasOffset?: Point; canvasScale?: number }, mode: 'replace' | 'merge') => {
    const newNotes = Array.isArray(payload.notes) ? payload.notes : [];

    if (mode === 'replace') {
      const newAttIds = new Set<string>();
      newNotes.forEach((n) => n.attachments?.forEach((a) => a.id && newAttIds.add(a.id)));
      notes.forEach((n) => {
        n.attachments?.forEach((a) => {
          if (a.id && !newAttIds.has(a.id)) {
            deleteAttachmentData(a.id).catch(() => {});
          }
        });
      });

      setNotes(newNotes);
      if (payload.canvasOffset) setOffset(payload.canvasOffset);
      if (payload.canvasScale) setScale(payload.canvasScale);
      commitHistory(newNotes);
    } else {
      const existingNoteIds = new Set(notes.map((n) => n.id));

      const mergedNotes = [
        ...notes,
        ...newNotes.map((n) => ({
          ...n,
          id: existingNoteIds.has(n.id)
            ? 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
            : n.id,
        })),
      ];

      setNotes(mergedNotes);
      commitHistory(mergedNotes);
    }
  };

  const handleVaultPasswordSubmit = async (password: string): Promise<boolean> => {
    setMasterPassword(password);
    await doExportEncryptedJSON(password);
    return true;
  };

  // Background Grid Style
  const getGridBgStyle = () => {
    if (gridStyle === 'blank') return {};
    const step = 24 * scale;
    const dotColor = 'rgba(60, 50, 40, 0.22)';
    const dotRadius = Math.max(1, 1.2 * scale);
    return {
      backgroundImage: `radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px)`,
      backgroundSize: `${step}px ${step}px`,
      backgroundPosition: `${offset.x}px ${offset.y}px`,
    };
  };

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(3.5, Math.round(s * 1.15 * 100) / 100));
  const handleZoomOut = () => setScale((s) => Math.max(0.2, Math.round((s / 1.15) * 100) / 100));
  const handleResetZoom = () => setScale(1);

  // Viewport Culling Bounds for Canvas Rendering Virtualization (Performance Optimization)
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  // 600px buffer in screen coordinates converted to canvas scale for smooth panning
  const bufferCanvas = 600 / Math.max(0.1, scale);

  const visibleMinX = -offset.x / scale - bufferCanvas;
  const visibleMinY = -offset.y / scale - bufferCanvas;
  const visibleMaxX = (viewportWidth - offset.x) / scale + bufferCanvas;
  const visibleMaxY = (viewportHeight - offset.y) / scale + bufferCanvas;

  const isNoteInViewport = (note: Note) => {
    if (selectedNoteIds.includes(note.id)) return true;
    const nw = note.width || 280;
    const nh = note.height || 220;
    return (
      note.x + nw >= visibleMinX &&
      note.x <= visibleMaxX &&
      note.y + nh >= visibleMinY &&
      note.y <= visibleMaxY
    );
  };

  const isFolderInViewport = (folder: Folder, containedNotes: Note[]) => {
    if (selectedFolderId === folder.id) return true;
    if (containedNotes.some((n) => selectedNoteIds.includes(n.id) || isNoteInViewport(n))) return true;
    const fw = folder.width || 380;
    const fh = folder.height || 280;
    return (
      folder.x + fw >= visibleMinX &&
      folder.x <= visibleMaxX &&
      folder.y + fh >= visibleMinY &&
      folder.y <= visibleMaxY
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f7f4ee] text-stone-900 select-none">
      {/* Infinite Canvas Stage */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-colors duration-300 touch-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-default'
        }`}
        style={getGridBgStyle()}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerCancel={handlePointerUpCanvas}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClickCanvas}
        onWheel={handleWheelCanvas}
      >
        {/* Canvas Elements Layer (Folders + Contained Notes + Standalone Notes) */}
        <div
          className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            zIndex: 1,
          }}
        >
          {/* Folders and their contained notes rendered in isolated stacking sequence */}
          {folders.map((folder, folderIdx) => {
            const containedNotes = notes.filter((n) => n.folderId === folder.id);
            if (!isFolderInViewport(folder, containedNotes)) return null;

            const folderZIndex = (folderIdx + 1) * 1000;

            return (
              <div
                key={folder.id}
                className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
                style={{ zIndex: folderZIndex }}
              >
                <FrameCard
                  folder={folder}
                  containedNotes={containedNotes}
                  scale={scale}
                  isSelected={selectedFolderId === folder.id || (containedNotes.length > 0 && containedNotes.some((n) => selectedNoteIds.includes(n.id)))}
                  onSelect={(folderId) => {
                    setSelectedFolderId(folderId);
                    setFolders((prev) => {
                      const target = prev.find((f) => f.id === folderId);
                      if (!target) return prev;
                      return [...prev.filter((f) => f.id !== folderId), target];
                    });
                    const ids = notes.filter((n) => n.folderId === folderId).map((n) => n.id);
                    if (ids.length > 0) setSelectedNoteIds(ids);
                  }}
                  onUpdateFolder={handleUpdateFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveFrameAbsolute={handleMoveFrameAbsolute}
                  onMoveFrameEnd={handleMoveFrameEnd}
                  onResizeFrame={handleResizeFrame}
                  onArrangeGrid={handleArrangeFolderGrid}
                  onAddNoteToFrame={handleAddNoteToFrame}
                />

                {/* Render contained notes inside folder's isolated stacking layer */}
                {containedNotes.map((note) => {
                  if (note.hidden || !isNoteInViewport(note)) return null;
                  return (
                    <div key={note.id} className="pointer-events-auto">
                      <NoteCard
                        note={note}
                        allNotes={notes}
                        scale={scale}
                        isSelected={selectedNoteIds.includes(note.id)}
                        onSelect={(id, isShift) => setSelectedNoteId(id, isShift)}
                        onUpdate={handleUpdateNote}
                        onUpdateEnd={handleUpdateEnd}
                        onDelete={handleDeleteNote}
                        onBringToFront={handleBringToFront}
                        onNavigateToNote={handleNavigateToNote}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Standalone Notes Layer (Not inside any folder) */}
          <div
            className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
            style={{ zIndex: (folders.length + 1) * 1000 }}
          >
            {notes
              .filter((n) => !n.folderId && !n.hidden && isNoteInViewport(n))
              .map((note) => (
                <div key={note.id} className="pointer-events-auto">
                  <NoteCard
                    note={note}
                    allNotes={notes}
                    scale={scale}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onSelect={(id, isShift) => setSelectedNoteId(id, isShift)}
                    onUpdate={handleUpdateNote}
                    onUpdateEnd={handleUpdateEnd}
                    onDelete={handleDeleteNote}
                    onBringToFront={handleBringToFront}
                    onNavigateToNote={handleNavigateToNote}
                  />
                </div>
              ))}
          </div>
        </div>

        {/* Marquee Box Selection Overlay */}
        {selectionStart && selectionEnd && (
          <div
            className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            <div
              className="absolute border-2 border-dashed border-amber-300/90 bg-amber-300/10 rounded-2xl"
              style={{
                left: `${Math.min(selectionStart.x, selectionEnd.x)}px`,
                top: `${Math.min(selectionStart.y, selectionEnd.y)}px`,
                width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
                height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
              }}
            />
          </div>
        )}
      </div>

      {/* Sleek Floating Dock / Unified Toolbar */}
      <Toolbar
        onAddNote={() => handleAddNote()}
        onOpenTemplatePicker={() => setIsTemplatePickerOpen(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedNoteId={selectedNoteId}
        onFormatNote={handleFormatActiveNote}
        onUpdateNoteProps={handleUpdateNoteProps}
        activeNoteFont={selectedNote?.fontFamily}
        activeNoteSize={selectedNote?.fontSize}
        activeNoteAlign={selectedNote?.textAlign}
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFitAll}
        onOpenSearch={handleOpenSearchPanel}
        showLayersPanel={showLayersPanel}
        setShowLayersPanel={setShowLayersPanel}
        activePanelTab={activePanelTab}
        onChangePanelTab={setActivePanelTab}
      />

      <AnimatePresence>
        {showLayersPanel && (
          <LayersPanel
            notes={notes}
            folders={folders}
            selectedNoteId={selectedNoteId}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
            onOpenTemplatePicker={() => setIsTemplatePickerOpen(true)}
            onSelectLayer={setSelectedNoteId}
            onUpdateNote={(id, updates) => {
              handleUpdateNote(id, updates);
              commitHistory();
            }}
            onDuplicateNote={handleDuplicateNote}
            onDeleteNote={handleDeleteNote}
            onFocusLayer={handleFocusLayer}
            onClose={() => setShowLayersPanel(false)}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveLayerToFolder={handleMoveLayerToFolder}
            onArrangeFolderGrid={handleArrangeFolderGrid}
            onReorderLayer={handleReorderLayer}
            activeTab={activePanelTab}
            onChangeTab={setActivePanelTab}
            shouldFocusSearch={shouldFocusSearchPanel}
            standaloneLinks={standaloneLinks}
            onAddStandaloneLink={handleAddStandaloneLink}
            onDeleteStandaloneLink={handleDeleteStandaloneLink}
            onUpdateStandaloneLink={handleUpdateStandaloneLink}
            linkFolders={linkFolders}
            onCreateLinkFolder={handleCreateLinkFolder}
            onUpdateLinkFolder={handleUpdateLinkFolder}
            onDeleteLinkFolder={handleDeleteLinkFolder}
            linkMetadata={linkMetadata}
            onUpdateLinkMetadata={handleUpdateLinkMetadata}
            standaloneFiles={standaloneFiles}
            onAddStandaloneFile={handleAddStandaloneFile}
            onDeleteStandaloneFile={handleDeleteStandaloneFile}
            onUpdateStandaloneFile={handleUpdateStandaloneFile}
            fileFolders={fileFolders}
            onCreateFileFolder={handleCreateFileFolder}
            onUpdateFileFolder={handleUpdateFileFolder}
            onDeleteFileFolder={handleDeleteFileFolder}
            fileMetadata={fileMetadata}
            onUpdateFileMetadata={handleUpdateFileMetadata}
            onCreateNoteFromAI={handleCreateNoteFromAI}
            onExecuteAiToolCall={handleExecuteAiToolCall}
          />
        )}
      </AnimatePresence>

      {/* Password Protection Vault Modal */}
      <AuthModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onSubmitPassword={handleVaultPasswordSubmit}
      />

      {/* Export Options Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportEncryptedJSON={handleExportEncryptedJSON}
        onExportStandaloneHTML={handleExportStandaloneHTML}
        onExportPlainJSON={handleExportPlainJSON}
        onExportTXT={handleExportTXT}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenPcSyncModal={() => setIsPcSyncModalOpen(true)}
        pcFolderName={pcFolderName}
        pcSyncStatus={pcSyncStatus}
      />

      {/* Local PC Sync Folder Control Modal */}
      <PcSyncModal
        isOpen={isPcSyncModalOpen}
        onClose={() => setIsPcSyncModalOpen(false)}
        folderName={pcFolderName}
        syncStatus={pcSyncStatus}
        lastSyncTime={pcLastSyncTime}
        errorMessage={pcErrorMessage}
        onSelectFolder={handleSelectPcFolder}
        onRequestPermission={handleRequestPcPermission}
        onSyncNow={() => performPcFolderSave()}
        onDisconnectFolder={handleDisconnectPcFolder}
      />

      {/* Import Backup Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportData={handleImportData}
      />

      {/* Google Drive Integration Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        boardState={{
          notes,
          offset,
          scale,
        }}
        onRestoreBoard={handleRestoreBoardFromDrive}
        selectedNoteId={selectedNoteId}
        onAttachFileToNote={handleAttachDriveFileToNote}
        onCreateNoteWithAttachment={handleCreateNoteWithDriveAttachment}
        onCreateNoteFromCalendarEvent={handleCreateNoteFromCalendarEvent}
        autoSaveEnabled={autoSaveDrive}
        onToggleAutoSave={handleToggleAutoSaveDrive}
        lastSyncTime={lastDriveSyncTime}
        onSyncComplete={handleSyncComplete}
        onOpenVaultModal={() => setIsVaultModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenPcSyncModal={() => setIsPcSyncModalOpen(true)}
        pcFolderName={pcFolderName}
      />

      {/* Note Template Picker Library Modal */}
      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelectTemplate={handleAddNoteFromTemplate}
        selectedNoteToSave={notes.find((n) => n.id === selectedNoteId) || null}
      />

      {/* Interactive Canvas Minimap Overview */}
      <Minimap
        notes={notes}
        folders={folders}
        standaloneLinks={standaloneLinks}
        standaloneFiles={standaloneFiles}
        offset={offset}
        scale={scale}
        onPanTo={handlePanToCenter}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFitAll}
      />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
