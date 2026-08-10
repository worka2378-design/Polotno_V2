import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Eye, EyeOff, Lock, Unlock, Copy, Trash2, 
  StickyNote, Pin, MoreHorizontal, Palette, Edit2,
  Music, Video, FileImage, FileText, File,
  Folder as FolderIcon, FolderOpen, FolderPlus, ChevronRight, ChevronDown, FolderOutput,
  LayoutGrid, Tag, Cloud, Link2, Plus, ExternalLink, MousePointer2, Layers, Film, Download, Paperclip, LayoutTemplate,
  ZoomIn, ZoomOut, Maximize2, Map, Bot, Sparkles, Send, RotateCcw, Loader2, Cpu,
  Settings, Key, RefreshCw, Check, SlidersHorizontal, Shield, Globe
} from 'lucide-react';

// Provider Brand Mark Logos
const GeminiLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 24C12 17.373 6.627 12 0 12 6.627 12 12 6.627 12 0c0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12z"
      fill="url(#gemini-brand-grad)"
    />
    <defs>
      <linearGradient id="gemini-brand-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1A73E8" />
        <stop offset="35%" stopColor="#4285F4" />
        <stop offset="70%" stopColor="#9B51E0" />
        <stop offset="100%" stopColor="#EA4335" />
      </linearGradient>
    </defs>
  </svg>
);

const DeepSeekLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#4D6BFE" />
    <path
      d="M16.5 14.5C15.7 16.5 13.5 17.5 11 17.5C7.7 17.5 5 15 5 11.7C5 8.5 7.6 6 10.8 6C13.2 6 15.4 7.4 16.3 9.5"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="15.5" cy="11" r="1.2" fill="#FFFFFF" />
  </svg>
);

const OllamaLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#18181B" />
    <path
      d="M12 6v4M9 10h6M9 13h6M10 16h4"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="9" cy="7.5" r="1" fill="#38BDF8" />
    <circle cx="15" cy="7.5" r="1" fill="#38BDF8" />
  </svg>
);

const TavilyLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#00B4D8" />
    <circle cx="12" cy="12" r="5" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M12 7v10M7 12h10" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SerperLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#4285F4" />
    <circle cx="10.5" cy="10.5" r="4.5" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M14 14l4 4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
import { Note, Point, Folder, StandaloneLink, LinkFolder, LinkMetadata, StandaloneFile, FileFolder, FileMetadata, AIChatMessage, AIProvider } from '../types';
import { COLOR_PALETTE_ITEMS } from '../utils/theme';
import { countLinksInContent, extractLinksFromContent } from '../utils/linkUtils';

interface LayersPanelProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  onOpenDriveModal?: () => void;
  onOpenTemplatePicker?: () => void;
  onSelectLayer: (id: string | null) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDuplicateNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onFocusLayer: (pt: Point) => void;
  onClose: () => void;

  // Folder management
  onCreateFolder: (name?: string) => void;
  onUpdateFolder: (id: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveLayerToFolder: (layerId: string, layerType: 'note', folderId: string | null) => void;
  onArrangeFolderGrid?: (folderId: string) => void;

  // Layer Reordering
  onReorderLayer: (sourceId: string, sourceType: 'note', targetId: string, targetType: 'note') => void;

  // Active Tab
  activeTab?: 'layers' | 'links' | 'files' | 'search' | 'ai';
  onChangeTab?: (tab: 'layers' | 'links' | 'files' | 'search' | 'ai') => void;
  onCreateNoteFromAI?: (title: string, content: string) => void;
  onExecuteAiToolCall?: (toolCall: { name: string; args: any }) => void;

  // Standalone Links & Link Folders & Metadata
  standaloneLinks?: StandaloneLink[];
  onAddStandaloneLink?: (url: string, title?: string) => void;
  onDeleteStandaloneLink?: (id: string) => void;
  onUpdateStandaloneLink?: (id: string, updates: Partial<StandaloneLink>) => void;

  linkFolders?: LinkFolder[];
  onCreateLinkFolder?: (name?: string) => void;
  onUpdateLinkFolder?: (id: string, updates: Partial<LinkFolder>) => void;
  onDeleteLinkFolder?: (id: string) => void;

  linkMetadata?: Record<string, LinkMetadata>;
  onUpdateLinkMetadata?: (linkUrl: string, updates: Partial<LinkMetadata>) => void;

  // Standalone Files & File Folders & Metadata
  standaloneFiles?: StandaloneFile[];
  onAddStandaloneFile?: (file: File) => void;
  onDeleteStandaloneFile?: (id: string) => void;
  onUpdateStandaloneFile?: (id: string, updates: Partial<StandaloneFile>) => void;

  fileFolders?: FileFolder[];
  onCreateFileFolder?: (name?: string) => void;
  onUpdateFileFolder?: (id: string, updates: Partial<FileFolder>) => void;
  onDeleteFileFolder?: (id: string) => void;

  fileMetadata?: Record<string, FileMetadata>;
  onUpdateFileMetadata?: (fileId: string, updates: Partial<FileMetadata>) => void;
  shouldFocusSearch?: boolean;

  // Navigation & Scale props for Minimap integration
  offset?: { x: number; y: number };
  scale?: number;
  onPanTo?: (x: number, y: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
}

interface UnifiedFileItem {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  createdAt: number;
  folderId?: string;
  tags: string[];
  noteId?: string;
  noteTitle?: string;
  noteX?: number;
  noteY?: number;
  isStandalone: boolean;
  standaloneId?: string;
  driveFileId?: string;
  driveThumbnail?: string;
}

type LayerItem = 
  | { type: 'note'; item: Note };

export const LayersPanel: React.FC<LayersPanelProps> = React.memo(({
  notes,
  folders,
  selectedNoteId,
  onOpenDriveModal,
  onOpenTemplatePicker,
  onSelectLayer,
  onUpdateNote,
  onDuplicateNote,
  onDeleteNote,
  onFocusLayer,
  onClose,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveLayerToFolder,
  onArrangeFolderGrid,
  onReorderLayer,
  activeTab: initialActiveTab = 'layers',
  onChangeTab,
  onCreateNoteFromAI,
  onExecuteAiToolCall,
  standaloneLinks = [],
  onAddStandaloneLink,
  onDeleteStandaloneLink,
  onUpdateStandaloneLink,
  linkFolders = [],
  onCreateLinkFolder,
  onUpdateLinkFolder,
  onDeleteLinkFolder,
  linkMetadata = {},
  onUpdateLinkMetadata,
  standaloneFiles = [],
  onAddStandaloneFile,
  onDeleteStandaloneFile,
  onUpdateStandaloneFile,
  fileFolders = [],
  onCreateFileFolder,
  onUpdateFileFolder,
  onDeleteFileFolder,
  fileMetadata = {},
  onUpdateFileMetadata,
  shouldFocusSearch = false,
  offset = { x: 0, y: 0 },
  scale = 1,
  onPanTo,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
}) => {
  const [currentTab, setCurrentTab] = useState<'layers' | 'links' | 'files' | 'search' | 'ai'>(initialActiveTab);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  
  // AI Config & Custom Keys State
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('infinite_notepad_gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState(() => {
    const saved = localStorage.getItem('infinite_notepad_gemini_model');
    if (saved && (saved.includes('2.5') || saved.includes('1.5') || saved === 'gemini-3.1-pro')) {
      return 'gemini-3.6-flash';
    }
    return saved || 'gemini-3.6-flash';
  });
  const [deepseekApiKey, setDeepseekApiKey] = useState(() => localStorage.getItem('infinite_notepad_deepseek_api_key') || '');
  const [deepseekModel, setDeepseekModel] = useState(() => localStorage.getItem('infinite_notepad_deepseek_model') || 'deepseek-chat');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => localStorage.getItem('infinite_notepad_tavily_api_key') || '');
  const [serperApiKey, setSerperApiKey] = useState(() => localStorage.getItem('infinite_notepad_serper_api_key') || '');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('infinite_notepad_ollama_model') || 'llama3');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('infinite_notepad_ollama_url') || 'http://127.0.0.1:11434');
  const [ollamaModelsList, setOllamaModelsList] = useState<{ name: string; size?: number }[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  const [serverAiStatus, setServerAiStatus] = useState<{
    checked: boolean;
    configured: boolean;
    hasGeminiKey: boolean;
    hasDeepSeekKey: boolean;
  }>({ checked: false, configured: false, hasGeminiKey: false, hasDeepSeekKey: false });

  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('infinite_notepad_ai_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: 'Привіт! Я ваш універсальний AI асистент. Ставте будь-які запитання, просіть написати статті, код, пояснити теми, зробити розрахунки чи допомогти з організацією полотна.',
        timestamp: Date.now(),
        provider: 'gemini',
      },
    ];
  });
  const [aiInputText, setAiInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Sync currentTab if initialActiveTab prop changes
  useEffect(() => {
    if (initialActiveTab) {
      setCurrentTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  // Check server health and AI API key availability on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setServerAiStatus({
            checked: true,
            configured: Boolean(data.aiConfigured),
            hasGeminiKey: Boolean(data.hasGeminiKey),
            hasDeepSeekKey: Boolean(data.hasDeepSeekKey),
          });
        }
      } catch (e) {
        setServerAiStatus({ checked: true, configured: false, hasGeminiKey: false, hasDeepSeekKey: false });
      }
    };
    checkServerHealth();
  }, []);

  // Save AI settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_gemini_api_key', geminiApiKey);
      localStorage.setItem('infinite_notepad_gemini_model', geminiModel);
      localStorage.setItem('infinite_notepad_deepseek_api_key', deepseekApiKey);
      localStorage.setItem('infinite_notepad_deepseek_model', deepseekModel);
      localStorage.setItem('infinite_notepad_tavily_api_key', tavilyApiKey);
      localStorage.setItem('infinite_notepad_serper_api_key', serperApiKey);
      localStorage.setItem('infinite_notepad_ollama_model', ollamaModel);
      localStorage.setItem('infinite_notepad_ollama_url', ollamaUrl);
    } catch (e) {}
  }, [geminiApiKey, geminiModel, deepseekApiKey, deepseekModel, tavilyApiKey, serperApiKey, ollamaModel, ollamaUrl]);

  // Function to actively query/detect real local models from Ollama server
  const checkOllamaModels = async () => {
    setOllamaStatus('checking');
    const cleanUrl = ollamaUrl.trim().replace(/\/$/, '');
    const urlsToTry = Array.from(new Set([
      cleanUrl,
      'http://127.0.0.1:11434',
      'http://localhost:11434',
    ])).filter(Boolean);

    // 1. Direct browser fetch to local Ollama ports
    for (const baseUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const models = (data.models || []).map((m: any) => ({
            name: m.name,
            size: m.size,
            modifiedAt: m.modified_at,
          }));
          setOllamaStatus('online');
          setOllamaModelsList(models);
          if (models.length > 0 && !models.some((m: any) => m.name === ollamaModel)) {
            setOllamaModel(models[0].name);
          }
          return;
        }
      } catch (e) {
        // Direct browser fetch failed (e.g. CORS or offline)
      }
    }

    // 2. Fallback to server proxy
    try {
      const res = await fetch('/api/ai/ollama/models');
      const data = await res.json();
      if (data.online && Array.isArray(data.models) && data.models.length > 0) {
        setOllamaStatus('online');
        setOllamaModelsList(data.models);
        if (data.models.length > 0 && !data.models.some((m: any) => m.name === ollamaModel)) {
          setOllamaModel(data.models[0].name);
        }
        return;
      }
    } catch (e) {}

    setOllamaStatus('offline');
    setOllamaModelsList([]);
  };

  // Auto check Ollama on opening AI settings or selecting local provider
  useEffect(() => {
    if (isAiSettingsOpen || aiProvider === 'local') {
      checkOllamaModels();
    }
  }, [isAiSettingsOpen, aiProvider]);

  useEffect(() => {
    try {
      localStorage.setItem('infinite_notepad_ai_messages', JSON.stringify(aiMessages));
    } catch (e) {}
  }, [aiMessages]);

  const scrollToChatBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior });
    }
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (currentTab === 'ai') {
      scrollToChatBottom('auto');
      const timer1 = setTimeout(() => scrollToChatBottom('auto'), 40);
      const timer2 = setTimeout(() => scrollToChatBottom('smooth'), 120);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [aiMessages, currentTab, isAiLoading]);

  const handleSendAiMessage = async (textToSend?: string) => {
    const query = (textToSend || aiInputText).trim();
    if (!query || isAiLoading) return;

    const userMsg: AIChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
      provider: aiProvider,
    };

    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInputText('');
    setIsAiLoading(true);

    const notesSummary = notes
      .map((n, idx) => {
        const title = n.title || `Нотатка #${idx + 1}`;
        const text = (n.content || '').replace(/<[^>]+>/g, '').trim();
        const tags = n.tags && n.tags.length > 0 ? ` [Теги: ${n.tags.join(', ')}]` : '';
        return `- ${title}: ${text.slice(0, 150)}${tags}`;
      })
      .join('\n');

    const contextData = {
      notesCount: notes.length,
      foldersCount: folders.length,
      notesSummary: notesSummary || 'Полотно порожнє',
    };

    // If provider is local Ollama, try direct browser-side call to user's local PC first
    if (aiProvider === 'local') {
      const cleanUrl = ollamaUrl.trim().replace(/\/$/, '');
      const urlsToTry = Array.from(new Set([
        cleanUrl,
        'http://127.0.0.1:11434',
        'http://localhost:11434',
      ])).filter(Boolean);

      let localReply: string | null = null;

      for (const baseUrl of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);

          const systemMsg = `Ти — універсальний AI асистент. Давай відповіді українською мовою. Контекст полотна користувача (нотатки): ${notesSummary || 'порожньо'}`;
          const formattedMsgs = [
            { role: 'system', content: systemMsg },
            ...updatedMessages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];

          const res = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: ollamaModel || 'llama3',
              stream: false,
              messages: formattedMsgs,
            }),
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            localReply = data.message?.content || null;
            if (localReply) break;
          }
        } catch (err) {
          // Direct browser call failed
        }
      }

      if (localReply) {
        let actionNote: { title: string; content: string } | undefined;
        const createNoteMatch = localReply.match(/\[CREATE_NOTE:\s*([^|]+)\|\s*([^\]]+)\]/);
        if (createNoteMatch) {
          actionNote = {
            title: createNoteMatch[1].trim(),
            content: createNoteMatch[2].trim(),
          };
        }

        const assistantMsg: AIChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: localReply.replace(/\[CREATE_NOTE:[^\]]+\]/g, '').trim(),
          timestamp: Date.now(),
          provider: 'local',
          actionNote,
        };

        setAiMessages([...updatedMessages, assistantMsg]);
        setIsAiLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          provider: aiProvider,
          contextData,
          geminiApiKey,
          geminiModel,
          deepseekApiKey,
          deepseekModel,
          tavilyApiKey,
          serperApiKey,
          ollamaModel,
          ollamaUrl,
        }),
      });

      const data = await res.json();
      const isErr = Boolean(data.error) || !res.ok;
      const replyText = data.response || 'Вибачте, не вдалося одержати відповідь.';

      let actionNote: { title: string; content: string } | undefined;
      if (!isErr) {
        const createNoteMatch = replyText.match(/\[CREATE_NOTE:\s*([^|]+)\|\s*([^\]]+)\]/);
        if (createNoteMatch) {
          actionNote = {
            title: createNoteMatch[1].trim(),
            content: createNoteMatch[2].trim(),
          };
          if (onCreateNoteFromAI) {
            onCreateNoteFromAI(actionNote.title, actionNote.content);
          }
        }

        // Execute function calling tool calls directly on the canvas
        if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0 && onExecuteAiToolCall) {
          data.toolCalls.forEach((tc: { name: string; args: any }) => {
            onExecuteAiToolCall(tc);
          });
        }
      }

      const assistantMsg: AIChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: isErr ? replyText : replyText.replace(/\[CREATE_NOTE:[^\]]+\]/g, '').trim(),
        timestamp: Date.now(),
        provider: aiProvider,
        isError: isErr,
        actionNote,
      };

      setAiMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('AI chat request failed:', err);
      setAiMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          role: 'assistant',
          content: `Помилка з'єднання з AI сервісом (${aiProvider}). Перевірте з'єднання з інтернетом або налаштування API ключа.`,
          timestamp: Date.now(),
          provider: aiProvider,
          isError: true,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };
  const [isMapOpen, setIsMapOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const minimapContainerRef = useRef<HTMLDivElement>(null);
  const isMinimapDraggingRef = useRef(false);

  const MAP_WIDTH = 290;
  const MAP_HEIGHT = 140;

  // Compute bounding box of all canvas items for minimap
  const minimapBounds = useMemo(() => {
    let minX = -400;
    let maxX = 1200;
    let minY = -300;
    let maxY = 900;

    const items = [
      ...notes.map((n) => ({ x: n.x, y: n.y, w: n.width || 280, h: n.height || 200 })),
      ...folders.map((f) => ({ x: f.x, y: f.y, w: f.width || 320, h: f.height || 220 })),
      ...standaloneLinks.map((l) => ({ x: l.x, y: l.y, w: l.width || 240, h: l.height || 140 })),
      ...standaloneFiles.map((f) => ({ x: f.x, y: f.y, w: f.width || 240, h: f.height || 140 })),
    ];

    if (items.length > 0) {
      minX = Math.min(...items.map((i) => i.x)) - 200;
      maxX = Math.max(...items.map((i) => i.x + i.w)) + 200;
      minY = Math.min(...items.map((i) => i.y)) - 200;
      maxY = Math.max(...items.map((i) => i.y + i.h)) + 200;
    }

    const w = Math.max(800, maxX - minX);
    const h = Math.max(600, maxY - minY);

    return { minX, maxX: minX + w, minY, maxY: minY + h, w, h };
  }, [notes, folders, standaloneLinks, standaloneFiles]);

  const worldToMap = (wx: number, wy: number) => {
    const mx = ((wx - minimapBounds.minX) / minimapBounds.w) * MAP_WIDTH;
    const my = ((wy - minimapBounds.minY) / minimapBounds.h) * MAP_HEIGHT;
    return { x: mx, y: my };
  };

  const mapToWorld = (mx: number, my: number) => {
    const wx = minimapBounds.minX + (mx / MAP_WIDTH) * minimapBounds.w;
    const wy = minimapBounds.minY + (my / MAP_HEIGHT) * minimapBounds.h;
    return { x: wx, y: wy };
  };

  const vpWorld = {
    x: -offset.x / scale,
    y: -offset.y / scale,
    w: window.innerWidth / scale,
    h: window.innerHeight / scale,
  };

  const vpMapStart = worldToMap(vpWorld.x, vpWorld.y);
  const vpMapEnd = worldToMap(vpWorld.x + vpWorld.w, vpWorld.y + vpWorld.h);
  const vpMapW = Math.max(12, vpMapEnd.x - vpMapStart.x);
  const vpMapH = Math.max(8, vpMapEnd.y - vpMapStart.y);

  const handleMinimapPointerDown = (e: React.PointerEvent) => {
    if (!minimapContainerRef.current || !onPanTo) return;
    isMinimapDraggingRef.current = true;
    const rect = minimapContainerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const targetWorld = mapToWorld(mx, my);
    onPanTo(targetWorld.x, targetWorld.y);
  };

  const handleMinimapPointerMove = (e: React.PointerEvent) => {
    if (!isMinimapDraggingRef.current || !minimapContainerRef.current || !onPanTo) return;
    const rect = minimapContainerRef.current.getBoundingClientRect();
    const mx = Math.max(0, Math.min(MAP_WIDTH, e.clientX - rect.left));
    const my = Math.max(0, Math.min(MAP_HEIGHT, e.clientY - rect.top));
    const targetWorld = mapToWorld(mx, my);
    onPanTo(targetWorld.x, targetWorld.y);
  };

  const handleMinimapPointerUp = () => {
    isMinimapDraggingRef.current = false;
  };

  useEffect(() => {
    if (initialActiveTab) {
      setCurrentTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  useEffect(() => {
    if (shouldFocusSearch || currentTab === 'search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [shouldFocusSearch, currentTab]);

  const handleSelectTab = (tab: 'layers' | 'links' | 'files' | 'search' | 'ai') => {
    setCurrentTab(tab);
    onChangeTab?.(tab);
    if (tab === 'search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingLinkFolderId, setEditingLinkFolderId] = useState<string | null>(null);
  const [editingFileFolderId, setEditingFileFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Standalone Link Form state
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  const [activeMenuLayerId, setActiveMenuLayerId] = useState<string | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [activeMenuLinkId, setActiveMenuLinkId] = useState<string | null>(null);
  const [activeMenuLinkFolderId, setActiveMenuLinkFolderId] = useState<string | null>(null);
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);
  const [activeMenuFileFolderId, setActiveMenuFileFolderId] = useState<string | null>(null);

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const [panelHeight, setPanelHeight] = useState(500);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;

      // Close active context/options dropdown menus if clicking outside any context menu or toggle
      if (
        target &&
        !target.closest('[data-context-menu="true"]') &&
        !target.closest('[data-context-toggle="true"]')
      ) {
        setActiveMenuLayerId(null);
        setActiveMenuFolderId(null);
        setActiveMenuLinkId(null);
        setActiveMenuLinkFolderId(null);
        setActiveMenuFileId(null);
        setActiveMenuFileFolderId(null);
      }

      // Close Layers Panel if clicking outside panel container and toggle button
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !target?.closest('[data-layers-toggle="true"]')
      ) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [onClose]);

  const handleResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY;
      setPanelHeight(Math.max(240, Math.min(window.innerHeight - 100, startHeight + deltaY)));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleAddTagToLayer = (layer: LayerItem, tagInput: string) => {
    const clean = tagInput.replace(/^#/, '').trim();
    if (!clean) return;
    const current = layer.item.tags || [];
    if (current.includes(clean)) return;
    const updated = [...current, clean];
    onUpdateNote(layer.item.id, { tags: updated });
  };

  const handleRemoveTagFromLayer = (layer: LayerItem, tagToRemove: string) => {
    const current = layer.item.tags || [];
    const updated = current.filter((t) => t !== tagToRemove);
    onUpdateNote(layer.item.id, { tags: updated });
  };

  const handleAddTagToFolder = (folder: Folder, tagInput: string) => {
    const clean = tagInput.replace(/^#/, '').trim();
    if (!clean) return;
    const current = folder.tags || [];
    if (current.includes(clean)) return;
    const updated = [...current, clean];
    onUpdateFolder(folder.id, { tags: updated });
  };

  const handleRemoveTagFromFolder = (folder: Folder, tagToRemove: string) => {
    const current = folder.tags || [];
    const updated = current.filter((t) => t !== tagToRemove);
    onUpdateFolder(folder.id, { tags: updated });
  };

  // Combine all layers and sort by pinned & zIndex
  const layers = useMemo(() => {
    const allLayers: LayerItem[] = [
      ...notes.map((n) => ({ type: 'note' as const, item: n })),
    ];

    allLayers.sort((a, b) => {
      const aPinned = a.item.pinned ? 1 : 0;
      const bPinned = b.item.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aZ = a.item.zIndex || 0;
      const bZ = b.item.zIndex || 0;
      if (aZ !== bZ) return bZ - aZ;

      const aTime = a.item.createdAt || a.item.updatedAt || 0;
      const bTime = b.item.createdAt || b.item.updatedAt || 0;
      return bTime - aTime;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allLayers.filter((layer) => {
        const title = layer.item.title || layer.item.attachments?.[0]?.name || 'Text Note';
        const content = (layer.item.content || '').replace(/<[^>]+>/g, '');
        const tagsStr = (layer.item.tags || []).map((t) => `#${t}`).join(' ');
        return title.toLowerCase().includes(q) || content.toLowerCase().includes(q) || tagsStr.toLowerCase().includes(q);
      });
    }

    return allLayers;
  }, [notes, searchQuery]);

  const unassignedLayers = useMemo(() => {
    return layers.filter((l) => !l.item.folderId);
  }, [layers]);

  // Combined links (extracted from notes + standalone panel links)
  interface UnifiedLinkItem {
    id: string;
    url: string;
    title: string;
    domain: string;
    faviconUrl: string;
    isStandalone: boolean;
    standaloneId?: string;
    noteId?: string;
    noteTitle?: string;
    noteX?: number;
    noteY?: number;
    folderId?: string;
    tags: string[];
  }

  const unifiedLinks = useMemo(() => {
    const result: UnifiedLinkItem[] = [];

    // Extract links from all notes
    notes.forEach((note) => {
      const extracted = extractLinksFromContent(note.content);
      const noteTitleStr = note.title?.trim() || `Нотатка (${note.content.replace(/<[^>]+>/g, '').trim().slice(0, 20)}...)`;
      extracted.forEach((linkDetails) => {
        const meta = linkMetadata[linkDetails.url] || {};
        result.push({
          id: `note_link_${note.id}_${linkDetails.url}`,
          url: linkDetails.url,
          title: linkDetails.title,
          domain: linkDetails.domain,
          faviconUrl: linkDetails.faviconUrl,
          isStandalone: false,
          noteId: note.id,
          noteTitle: noteTitleStr,
          noteX: note.x,
          noteY: note.y,
          folderId: meta.folderId,
          tags: meta.tags || [],
        });
      });
    });

    // Standalone panel links
    standaloneLinks.forEach((sl) => {
      result.push({
        id: sl.id,
        url: sl.url,
        title: sl.title,
        domain: sl.domain,
        faviconUrl: sl.faviconUrl,
        isStandalone: true,
        standaloneId: sl.id,
        folderId: sl.folderId,
        tags: sl.tags || [],
      });
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return result.filter((l) => {
        const tagsStr = l.tags.map((t) => `#${t}`).join(' ');
        return (
          (l.title || '').toLowerCase().includes(q) ||
          (l.url || '').toLowerCase().includes(q) ||
          (l.domain || '').toLowerCase().includes(q) ||
          (l.noteTitle || '').toLowerCase().includes(q) ||
          tagsStr.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [notes, standaloneLinks, linkMetadata, searchQuery]);

  const totalLinksCount = useMemo(() => {
    return unifiedLinks.length;
  }, [unifiedLinks]);

  const handleMoveLinkToFolder = (link: UnifiedLinkItem, folderId: string | null) => {
    if (link.isStandalone && link.standaloneId) {
      onUpdateStandaloneLink?.(link.standaloneId, { folderId: folderId || undefined });
    } else {
      onUpdateLinkMetadata?.(link.url, { folderId: folderId || undefined });
    }
  };

  const handleAddTagToLink = (link: UnifiedLinkItem, tagInput: string) => {
    const clean = tagInput.replace(/^#/, '').trim();
    if (!clean) return;
    if (link.tags.includes(clean)) return;
    const updated = [...link.tags, clean];
    if (link.isStandalone && link.standaloneId) {
      onUpdateStandaloneLink?.(link.standaloneId, { tags: updated });
    } else {
      onUpdateLinkMetadata?.(link.url, { tags: updated });
    }
  };

  const handleRemoveTagFromLink = (link: UnifiedLinkItem, tagToRemove: string) => {
    const updated = link.tags.filter((t) => t !== tagToRemove);
    if (link.isStandalone && link.standaloneId) {
      onUpdateStandaloneLink?.(link.standaloneId, { tags: updated });
    } else {
      onUpdateLinkMetadata?.(link.url, { tags: updated });
    }
  };

  const handleCreateStandaloneLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;
    onAddStandaloneLink?.(newLinkUrl.trim(), newLinkTitle.trim() || undefined);
    setNewLinkUrl('');
    setNewLinkTitle('');
    setShowAddLinkForm(false);
  };

  // Unified Files State & Functions
  const unifiedFiles = useMemo(() => {
    const list: UnifiedFileItem[] = [];

    // 1. Files attached to Notes
    notes.forEach((note) => {
      (note.attachments || []).forEach((att) => {
        const meta = fileMetadata[att.id] || {};
        const titleText = note.title?.trim() || (note.content ? note.content.replace(/<[^>]+>/g, '').trim().slice(0, 20) : 'Нотатка');
        list.push({
          id: att.id,
          name: att.name,
          type: att.type,
          url: att.url,
          size: att.size,
          createdAt: note.createdAt,
          folderId: meta.folderId,
          tags: meta.tags || [],
          noteId: note.id,
          noteTitle: titleText,
          noteX: note.x,
          noteY: note.y,
          isStandalone: false,
        });
      });
    });

    // 2. Standalone Files
    standaloneFiles.forEach((sf) => {
      list.push({
        id: sf.id,
        name: sf.name,
        type: sf.type,
        url: sf.url,
        size: sf.size,
        createdAt: sf.createdAt,
        folderId: sf.folderId,
        tags: sf.tags || [],
        isStandalone: true,
        standaloneId: sf.id,
        driveFileId: sf.driveFileId,
        driveThumbnail: sf.driveThumbnail,
      });
    });

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((f) => {
      const tagsStr = f.tags.map((t) => `#${t}`).join(' ');
      return (
        (f.name || '').toLowerCase().includes(q) ||
        (f.type || '').toLowerCase().includes(q) ||
        (f.noteTitle || '').toLowerCase().includes(q) ||
        tagsStr.toLowerCase().includes(q)
      );
    });
  }, [notes, standaloneFiles, fileMetadata, searchQuery]);

  const totalFilesCount = useMemo(() => {
    return unifiedFiles.length;
  }, [unifiedFiles]);

  const handleMoveFileToFolder = (file: UnifiedFileItem, folderId: string | null) => {
    if (file.isStandalone && file.standaloneId) {
      onUpdateStandaloneFile?.(file.standaloneId, { folderId: folderId || undefined });
    } else {
      onUpdateFileMetadata?.(file.id, { folderId: folderId || undefined });
    }
  };

  const handleAddTagToFile = (file: UnifiedFileItem, tagInput: string) => {
    const clean = tagInput.replace(/^#/, '').trim();
    if (!clean) return;
    if (file.tags.includes(clean)) return;
    const updated = [...file.tags, clean];
    if (file.isStandalone && file.standaloneId) {
      onUpdateStandaloneFile?.(file.standaloneId, { tags: updated });
    } else {
      onUpdateFileMetadata?.(file.id, { tags: updated });
    }
  };

  const handleRemoveTagFromFile = (file: UnifiedFileItem, tagToRemove: string) => {
    const updated = file.tags.filter((t) => t !== tagToRemove);
    if (file.isStandalone && file.standaloneId) {
      onUpdateStandaloneFile?.(file.standaloneId, { tags: updated });
    } else {
      onUpdateFileMetadata?.(file.id, { tags: updated });
    }
  };

  const renderFileIcon = (type: string, name: string) => {
    const t = (type || '').toLowerCase();
    const ext = name.split('.').pop()?.toLowerCase() || '';

    if (t.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <FileImage className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
    }
    if (t.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
      return <Film className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
    }
    if (t.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return <Music className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
    }
    if (t.includes('pdf') || t.includes('document') || t.includes('text') || ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
    }
    if (t.includes('drive')) {
      return <Cloud className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
    }
    return <File className="w-4 h-4 text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderLayerIcon = (layer: LayerItem) => {
    const iconClass = "w-4 h-4 text-stone-600 group-hover:text-stone-900 transition-colors";

    const note = layer.item;
    if (note.attachments && note.attachments.length > 0) {
      const mainAtt = note.attachments[0];
      const mime = (mainAtt.type || '').toLowerCase();
      const name = (mainAtt.name || '').toLowerCase();

      if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
        return <FileImage className={iconClass} />;
      }
      if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(name)) {
        return <Music className={iconClass} />;
      }
      if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/.test(name)) {
        return <Video className={iconClass} />;
      }
      if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || /\.(pdf|doc|docx|txt|rtf|md)$/.test(name)) {
        return <FileText className={iconClass} />;
      }
      return <File className={iconClass} />;
    }

    return <StickyNote className={iconClass} />;
  };

  const handleStartRenameLayer = (layer: LayerItem) => {
    setEditingLayerId(layer.item.id);
    let generatedTitle = 'Text Note';
    const rawText = (layer.item.content || '').replace(/<[^>]+>/g, '').trim();
    if (rawText.length > 0) {
      generatedTitle = rawText.substring(0, 20) + (rawText.length > 20 ? '...' : '');
    }
    setEditName(layer.item.title || generatedTitle);
  };

  const handleCommitRenameLayer = (layer: LayerItem) => {
    onUpdateNote(layer.item.id, { title: editName.trim() });
    setEditingLayerId(null);
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditName(folder.name);
  };

  const handleCommitRenameFolder = (folderId: string) => {
    if (editName.trim()) {
      onUpdateFolder(folderId, { name: editName.trim() });
    }
    setEditingFolderId(null);
  };

  const handleFocus = (layer: LayerItem) => {
    onSelectLayer(layer.item.id);
    const pt = {
      x: layer.item.x + layer.item.width / 2,
      y: layer.item.y + layer.item.height / 2
    };
    onFocusLayer(pt);
  };

  const handleDragStart = (e: React.DragEvent, layer: LayerItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: layer.item.id, type: layer.type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDrop = (e: React.DragEvent, targetLayer: LayerItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLayerId(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.id && data.type) {
          if (data.id !== targetLayer.item.id) {
            onReorderLayer(data.id, data.type, targetLayer.item.id, targetLayer.type);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse layer drop data:', err);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.id && data.type) {
          onMoveLayerToFolder(data.id, data.type, folderId);
          onUpdateFolder(folderId, { collapsed: false });
        }
      }
    } catch (err) {
      console.error('Failed to parse drag drop data:', err);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.id && data.type) {
          onMoveLayerToFolder(data.id, data.type, null);
        }
      }
    } catch (err) {
      console.error('Failed to parse root drop data:', err);
    }
  };

  const renderLayerRow = (layer: LayerItem, inFolder = false) => {
    const isSelected = selectedNoteId === layer.item.id;
    let generatedTitle = layer.type === 'note' ? 'Text Note' : 'Drawing';
    if (layer.type === 'note') {
      const rawText = (layer.item.content || '').replace(/<[^>]+>/g, '').trim();
      if (rawText.length > 0) {
        generatedTitle = rawText.substring(0, 20) + (rawText.length > 20 ? '...' : '');
      }
    }

    const title = layer.item.title || generatedTitle;
    const isLocked = layer.item.locked;
    const isHidden = layer.item.hidden;
    const isTargetingLayer = dragOverLayerId === layer.item.id;
    const linkCount = layer.type === 'note' ? countLinksInContent(layer.item.content) : 0;

    return (
      <div 
        key={layer.item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, layer)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverLayerId(layer.item.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          setDragOverLayerId(null);
        }}
        onDrop={(e) => handleLayerDrop(e, layer)}
        className={`relative flex items-center group px-2.5 py-0.5 rounded-full transition-colors cursor-grab active:cursor-grabbing ${
          isTargetingLayer
            ? 'bg-amber-500/20 border border-amber-600 text-stone-900'
            : isSelected
              ? 'bg-stone-300/50 text-stone-900 font-medium'
              : 'text-stone-600 hover:text-stone-900'
        } ${inFolder ? 'ml-1.5' : ''}`}
      >
        <div 
          className="cursor-pointer mr-2 flex items-center justify-center text-stone-600 group-hover:text-stone-900 shrink-0 transition-colors"
          onClick={() => handleFocus(layer)}
        >
          {renderLayerIcon(layer)}
        </div>

        <div className="flex-1 overflow-hidden mr-1 flex items-center gap-1.5 min-w-0">
          {layer.item.pinned && (
            <span title="Закріплено"><Pin className="w-4 h-4 text-stone-700 fill-stone-700 shrink-0" /></span>
          )}
          {isLocked && (
            <span title="Заблоковано"><Lock className="w-4 h-4 text-stone-700 shrink-0" /></span>
          )}
          {isHidden && (
            <span title="Сховано"><EyeOff className="w-4 h-4 text-stone-700 shrink-0" /></span>
          )}

          {editingLayerId === layer.item.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleCommitRenameLayer(layer)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitRenameLayer(layer);
                if (e.key === 'Escape') setEditingLayerId(null);
              }}
              className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-0.5 rounded-full outline-none text-xs border border-stone-300"
            />
          ) : (
            <div 
              className={`truncate cursor-pointer text-xs font-medium flex-1 ${
                isSelected ? 'text-stone-900' : 'text-stone-600 group-hover:text-stone-900'
              }`}
              onDoubleClick={() => handleStartRenameLayer(layer)}
              onClick={() => handleFocus(layer)}
            >
              {title}
            </div>
          )}

          {/* Link marker */}
          {linkCount > 0 && (
            <span 
              className="inline-flex items-center text-[11px] text-sky-600 font-medium shrink-0 ml-1"
              title={`Наявних посилань: ${linkCount}`}
            >
              <Link2 className="w-4 h-4 text-sky-500 shrink-0 -rotate-45" />
            </span>
          )}

          {/* Layer Tags Display (Laconic, no background plate) */}
          {layer.item.tags && layer.item.tags.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {layer.item.tags.slice(0, 2).map((t) => (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(`#${t}`);
                  }}
                  className="text-[10px] text-stone-500 hover:text-stone-800:text-zinc-300 font-mono transition-colors cursor-pointer"
                  title={`Фільтрувати за #${t}`}
                >
                  #{t}
                </button>
              ))}
              {layer.item.tags.length > 2 && (
                <span className="text-[9px] text-stone-500 font-mono">
                  +{layer.item.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {inFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveLayerToFolder(layer.item.id, layer.type, null);
            }}
            className="p-1 rounded-full text-stone-600 hover:text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
            title="Витягнути з папки"
          >
            <FolderOutput className="w-4 h-4" />
          </button>
        )}

        <button
          data-context-toggle="true"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuLayerId(activeMenuLayerId === layer.item.id ? null : layer.item.id);
            setActiveMenuFolderId(null);
          }}
          className={`p-1 rounded-full transition-opacity shrink-0 cursor-pointer ${
            activeMenuLayerId === layer.item.id
              ? 'text-stone-900 opacity-100'
              : 'text-stone-600 hover:text-stone-900 opacity-0 group-hover:opacity-100'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {activeMenuLayerId === layer.item.id && (
            <motion.div
              data-context-menu="true"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 z-50 w-52 p-2 bg-[#ede5d8] border border-stone-300 rounded-3xl flex flex-col gap-0.5 text-xs text-stone-700"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuLayerId(null);
                  handleStartRenameLayer(layer);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                <Edit2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">Перейменувати</span>
              </button>

              {folders.length > 0 && (
                <div className="pt-1 pb-1 border-t border-stone-300/50 my-0.5">
                  {layer.item.folderId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerToFolder(layer.item.id, layer.type, null);
                        setActiveMenuLayerId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
                    >
                      <FolderOutput className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium">Прибрати з папки</span>
                    </button>
                  )}
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerToFolder(layer.item.id, layer.type, f.id);
                        setActiveMenuLayerId(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-colors text-left cursor-pointer ${
                        layer.item.folderId === f.id
                          ? 'text-stone-900 font-semibold'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      <FolderIcon className="w-4 h-4 shrink-0 text-amber-700" />
                      <span className="text-xs font-medium truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isPinned = layer.item.pinned;
                  onUpdateNote(layer.item.id, { pinned: !isPinned });
                  setActiveMenuLayerId(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                <Pin className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">{layer.item.pinned ? 'Відкріпити' : 'Закріпити'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateNote(layer.item.id, { locked: !isLocked });
                  setActiveMenuLayerId(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                {isLocked ? <Unlock className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
                <span className="text-xs font-medium">{isLocked ? 'Розблокувати' : 'Заблокувати'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateNote(layer.item.id, { hidden: !isHidden });
                  setActiveMenuLayerId(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                {isHidden ? <Eye className="w-4 h-4 shrink-0" /> : <EyeOff className="w-4 h-4 shrink-0" />}
                <span className="text-xs font-medium">{isHidden ? 'Показати' : 'Сховати'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateNote(layer.item.id);
                  setActiveMenuLayerId(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">Дублювати</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(layer.item.id);
                  setActiveMenuLayerId(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">Видалити</span>
              </button>

              {/* Layer Tag Management */}
              <div className="px-3 py-1 flex flex-col gap-1">
                {layer.item.tags && layer.item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-6 mb-0.5">
                    {layer.item.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[11px] text-stone-700 font-mono">
                        #{t}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTagFromLayer(layer, t);
                          }}
                          className="hover:text-stone-900 cursor-pointer text-stone-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-stone-600 shrink-0" />
                  <input
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.stopPropagation();
                        handleAddTagToLayer(layer, e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-1 rounded-full outline-none text-xs border border-stone-800/80 focus:border-stone-900:border-white/30 font-mono"
                  />
                </div>
              </div>

              <div className="px-3 py-1 flex items-center justify-between gap-2">
                <Palette className="w-4 h-4 text-stone-600 shrink-0" />
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  {COLOR_PALETTE_ITEMS.map(item => (
                    <button
                      key={item.color}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNote(layer.item.id, { color: item.color });
                        setActiveMenuLayerId(null);
                      }}
                      className={`w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform shrink-0 cursor-pointer shadow-xs ${item.swatch}`}
                      title={item.label}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderLinkRow = (link: UnifiedLinkItem) => {
    return (
      <div
        key={link.id}
        className="group/l relative flex items-center justify-between gap-1.5 py-1 px-2.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {link.faviconUrl && link.faviconUrl !== '' ? (
            <img
              src={link.faviconUrl}
              alt=""
              className="w-4 h-4 rounded-full shrink-0 object-contain pointer-events-none"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
          <div className="min-w-0 flex-1 flex flex-col">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-medium text-xs text-stone-800 hover:underline no-underline"
              title={link.url}
            >
              {link.title}
            </a>
            <div className="flex items-center gap-1 text-[10px] text-stone-500">
              <span className="truncate">{link.domain}</span>
              {link.noteTitle && (
                <span className="truncate opacity-70">({link.noteTitle})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Focus note button */}
          {link.noteX !== undefined && link.noteY !== undefined && (
            <button
              onClick={() => onFocusLayer({ x: link.noteX! + 140, y: link.noteY! + 110 })}
              className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              title="Перейти до нотатки на полотні"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete standalone link button */}
          {link.isStandalone && link.standaloneId && (
            <button
              onClick={() => onDeleteStandaloneLink?.(link.standaloneId!)}
              className="p-1 rounded-full text-stone-500 hover:text-red-500:text-red-400 transition-colors cursor-pointer"
              title="Видалити посилання з панелі"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open link */}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            title="Відкрити посилання"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Tag & folder button */}
          <button
            data-context-toggle="true"
            onClick={() => setActiveMenuLinkId(activeMenuLinkId === link.id ? null : link.id)}
            className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            title="Теги та папка"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Link options dropdown */}
        <AnimatePresence>
          {activeMenuLinkId === link.id && (
            <motion.div
              data-context-menu="true"
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-2 top-full mt-1 z-50 w-48 p-2 bg-[#ede5d8] border border-stone-300 rounded-2xl shadow-xl flex flex-col gap-1 text-xs"
            >
              {linkFolders.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {link.folderId && (
                    <button
                      onClick={() => {
                        handleMoveLinkToFolder(link, null);
                        setActiveMenuLinkId(null);
                      }}
                      className="w-full text-left px-2.5 py-1 rounded-full transition-colors flex items-center gap-2 text-stone-700 hover:text-stone-900 cursor-pointer"
                    >
                      <FolderOutput className="w-3.5 h-3.5 shrink-0" />
                      <span>Прибрати з папки</span>
                    </button>
                  )}
                  {linkFolders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        handleMoveLinkToFolder(link, f.id);
                        setActiveMenuLinkId(null);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-full transition-colors flex items-center justify-between cursor-pointer ${
                        link.folderId === f.id ? 'font-bold text-stone-900' : 'text-stone-600'
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tag management */}
              <div className="border-t border-stone-300/50 pt-1.5 mt-0.5 flex flex-col gap-1">
                {link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {link.tags.map((t) => (
                      <span
                        key={t}
                        onClick={() => handleRemoveTagFromLink(link, t)}
                        className="inline-flex items-center gap-1 text-[10px] text-stone-700 bg-stone-300/60 px-2 py-0.5 rounded-full cursor-pointer hover:text-red-500 font-mono"
                        title="Видалити тег"
                      >
                        #{t} ×
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="+ Тег (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.stopPropagation();
                      handleAddTagToLink(link, e.currentTarget.value.trim());
                      e.currentTarget.value = '';
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-1 rounded-full outline-none text-xs border border-stone-300 font-mono"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderFileRow = (file: UnifiedFileItem) => {
    return (
      <div
        key={file.id}
        className="group/l relative flex items-center justify-between gap-1.5 py-1 px-2.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {renderFileIcon(file.type, file.name)}
          <div className="min-w-0 flex-1 flex flex-col">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              download={file.isStandalone ? file.name : undefined}
              className="truncate font-medium text-xs text-stone-800 hover:underline no-underline"
              title={file.name}
            >
              {file.name}
            </a>
            <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
              {file.size ? <span>{formatFileSize(file.size)}</span> : null}
              {file.noteTitle && (
                <span className="truncate opacity-70">({file.noteTitle})</span>
              )}
              {file.driveFileId && (
                <span className="text-blue-500 font-mono text-[9px] flex items-center gap-0.5">
                  <Cloud className="w-2.5 h-2.5 inline" /> Drive
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Focus note button */}
          {file.noteX !== undefined && file.noteY !== undefined && (
            <button
              onClick={() => onFocusLayer({ x: file.noteX! + 140, y: file.noteY! + 110 })}
              className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              title="Перейти до нотатки з файлом"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete standalone file button */}
          {file.isStandalone && file.standaloneId && (
            <button
              onClick={() => onDeleteStandaloneFile?.(file.standaloneId!)}
              className="p-1 rounded-full text-stone-500 hover:text-red-500:text-red-400 transition-colors cursor-pointer"
              title="Видалити файл"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download / Open file */}
          {file.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              download={file.name}
              className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              title="Завантажити або відкрити файл"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Tag & folder button */}
          <button
            data-context-toggle="true"
            onClick={() => setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id)}
            className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            title="Теги та папка"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File options dropdown */}
        <AnimatePresence>
          {activeMenuFileId === file.id && (
            <motion.div
              data-context-menu="true"
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-2 top-full mt-1 z-50 w-48 p-2 bg-[#ede5d8] border border-stone-300 rounded-2xl shadow-xl flex flex-col gap-1 text-xs"
            >
              {(fileFolders || []).length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {file.folderId && (
                    <button
                      onClick={() => {
                        handleMoveFileToFolder(file, null);
                        setActiveMenuFileId(null);
                      }}
                      className="w-full text-left px-2.5 py-1 rounded-full transition-colors flex items-center gap-2 text-stone-700 hover:text-stone-900 cursor-pointer"
                    >
                      <FolderOutput className="w-3.5 h-3.5 shrink-0" />
                      <span>Прибрати з папки</span>
                    </button>
                  )}
                  {(fileFolders || []).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        handleMoveFileToFolder(file, f.id);
                        setActiveMenuFileId(null);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-full transition-colors flex items-center justify-between cursor-pointer ${
                        file.folderId === f.id ? 'font-bold text-stone-900' : 'text-stone-600'
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tag management */}
              <div className="border-t border-stone-300/50 pt-1.5 mt-0.5 flex flex-col gap-1">
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {file.tags.map((t) => (
                      <span
                        key={t}
                        onClick={() => handleRemoveTagFromFile(file, t)}
                        className="inline-flex items-center gap-1 text-[10px] text-stone-700 bg-stone-300/60 px-2 py-0.5 rounded-full cursor-pointer hover:text-red-500 font-mono"
                        title="Видалити тег"
                      >
                        #{t} ×
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="+ Тег (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.stopPropagation();
                      handleAddTagToFile(file, e.currentTarget.value.trim());
                      e.currentTarget.value = '';
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-1 rounded-full outline-none text-xs border border-stone-300 font-mono"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      ref={panelRef}
      drag
      dragMomentum={false}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-4 top-20 w-80 bg-[#ede5d8] border border-stone-300 rounded-3xl flex flex-col z-50 overflow-hidden text-sm"
      style={{ height: panelHeight }}
    >
      {/* Top Header Bar with Tabs: Шари vs Посилання vs Файли vs Пошук */}
      <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-stone-300/50 select-none shrink-0">
        <div className="flex items-center gap-1 bg-[#e2d8c7]/80 p-1 rounded-full border border-stone-300/60">
          <button
            onClick={() => handleSelectTab('layers')}
            title="Шари та нотатки"
            className={`flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              currentTab === 'layers'
                ? 'bg-stone-300/90 text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectTab('links')}
            title="Колекція посилань"
            className={`flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              currentTab === 'links'
                ? 'bg-stone-300/90 text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Link2 className="w-4 h-4 -rotate-45" />
          </button>
          <button
            onClick={() => handleSelectTab('files')}
            title="Файли та вкладення (Скріпка)"
            className={`flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              currentTab === 'files'
                ? 'bg-stone-300/90 text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectTab('search')}
            title="Пошук по канвасу"
            className={`flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              currentTab === 'search'
                ? 'bg-stone-300/90 text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSelectTab('ai')}
            title="AI Асистент (Gemini / DeepSeek / Local)"
            className={`flex items-center justify-center p-2 rounded-full transition-all cursor-pointer ${
              currentTab === 'ai'
                ? 'bg-stone-300/90 text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {currentTab === 'layers' ? (
        /* Layers & Folders List */
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOverRoot(true);
        }}
        onDragLeave={() => setIsDragOverRoot(false)}
        onDrop={handleRootDrop}
        className={`flex-1 overflow-y-auto overflow-x-hidden p-2 pt-2.5 space-y-0.5 min-h-[200px] scrollbar-none transition-colors ${
          isDragOverRoot ? 'bg-white/[0.02]' : ''
        }`}
      >
        {folders.length === 0 && layers.length === 0 && (
          <div className="p-4 text-center text-stone-500 text-xs italic">Порожньо</div>
        )}

        {/* Render Folders (Clean row WITHOUT background box/plate) */}
        {folders.map((folder) => {
          const folderLayers = layers.filter((l) => l.item.folderId === folder.id);
          const isCollapsed = folder.collapsed;
          const isDragOver = dragOverFolderId === folder.id;
          const folderLinkCount = folderLayers.reduce(
            (acc, l) => (l.type === 'note' ? acc + countLinksInContent(l.item.content) : acc),
            0
          );

          return (
            <div 
              key={folder.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverFolderId(folder.id);
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                setDragOverFolderId(null);
              }}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              className="group/f relative"
            >
              {/* Folder Row - No card background plate, purely a clean line item */}
              <div 
                className={`flex items-center gap-1 py-0.5 px-1.5 rounded-full transition-colors ${
                  isDragOver 
                    ? 'text-stone-900 bg-amber-500/20' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <button
                  onClick={() => onUpdateFolder(folder.id, { collapsed: !isCollapsed })}
                  className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <div 
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onUpdateFolder(folder.id, { collapsed: !isCollapsed })}
                >
                  {isCollapsed ? (
                    <FolderIcon className="w-4 h-4 text-amber-700 group-hover/f:text-amber-800:text-amber-400 shrink-0 transition-colors" />
                  ) : (
                    <FolderOpen className="w-4 h-4 text-amber-700 group-hover/f:text-amber-800:text-amber-400 shrink-0 transition-colors" />
                  )}

                  {editingFolderId === folder.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleCommitRenameFolder(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitRenameFolder(folder.id);
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-0.5 rounded-full outline-none text-xs border border-stone-300"
                    />
                  ) : (
                    <span 
                      className="text-xs font-medium text-stone-700 group-hover/f:text-stone-900 truncate flex-1 transition-colors"
                      onDoubleClick={() => handleStartRenameFolder(folder)}
                    >
                      {folder.name}
                    </span>
                  )}

                  {/* Folder Tags Display */}
                  {folder.tags && folder.tags.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {folder.tags.slice(0, 2).map((t) => (
                        <button
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(`#${t}`);
                          }}
                          className="text-[10px] text-stone-500 hover:text-stone-800:text-zinc-300 font-mono transition-colors cursor-pointer"
                          title={`Фільтрувати за #${t}`}
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Folder Link Indicator */}
                  {folderLinkCount > 0 && (
                    <span 
                      className="inline-flex items-center text-[11px] text-sky-600 font-medium shrink-0"
                      title={`Наявних посилань у папці: ${folderLinkCount}`}
                    >
                      <Link2 className="w-4 h-4 text-sky-500 shrink-0 -rotate-45" />
                    </span>
                  )}

                  <span className="text-[10px] text-stone-600 bg-stone-300/50 px-2 py-0.5 rounded-full shrink-0">
                    {folderLayers.length}
                  </span>
                </div>

                <button
                  data-context-toggle="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id);
                    setActiveMenuLayerId(null);
                  }}
                  className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer opacity-0 group-hover/f:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {activeMenuFolderId === folder.id && (
                    <motion.div
                      data-context-menu="true"
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-2 top-full z-50 w-48 p-2 bg-[#ede5d8] border border-stone-300 rounded-3xl shadow-2xl flex flex-col gap-0.5 text-xs text-stone-700"
                    >
                      {onArrangeFolderGrid && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFolderId(null);
                            onArrangeFolderGrid(folder.id);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
                        >
                          <LayoutGrid className="w-4 h-4 shrink-0" />
                          <span>Впорядкувати в сітку</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFolderId(null);
                          handleStartRenameFolder(folder);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                        <span>Перейменувати</span>
                      </button>

                      {/* Folder Tag Management */}
                      <div className="px-3 py-1 flex flex-col gap-1">
                        {folder.tags && folder.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-6 mb-0.5">
                            {folder.tags.map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 text-[11px] text-stone-700 font-mono">
                                #{t}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTagFromFolder(folder, t);
                                  }}
                                  className="hover:text-stone-900 cursor-pointer text-stone-500"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-stone-600 shrink-0" />
                          <input
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                e.stopPropagation();
                                handleAddTagToFolder(folder, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-[#e2d8c7] text-stone-900 px-2.5 py-1 rounded-full outline-none text-xs border border-stone-800/80 focus:border-stone-900:border-white/30 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFolderId(null);
                          onDeleteFolder(folder.id);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-stone-700 hover:text-stone-900 transition-colors text-left cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Видалити папку</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Nested Layers inside folder - Indented cleanly without vertical border line */}
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5 pl-1.5">
                  {folderLayers.length === 0 ? (
                    <div className="py-1.5 text-center text-[10px] italic text-stone-500">
                      Перетягніть сюди
                    </div>
                  ) : (
                    folderLayers.map((layer) => renderLayerRow(layer, true))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Top-Level Layers */}
        {unassignedLayers.length > 0 && (
          <div className="space-y-0.5">
            {unassignedLayers.map((layer) => renderLayerRow(layer, false))}
          </div>
        )}
      </div>
      ) : currentTab === 'links' ? (
        /* Links Tab View */
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 pt-2.5 space-y-1 min-h-[200px] scrollbar-none">
          {/* Add Standalone Link Form */}
          {showAddLinkForm && (
            <form onSubmit={handleCreateStandaloneLinkSubmit} className="p-2 border border-stone-300/60 flex flex-col gap-1.5 bg-[#e2d8c7]/60 rounded-2xl mb-2">
              <input
                type="text"
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="w-full bg-[#e2d8c7] text-stone-900 px-3 py-1.5 rounded-full text-xs outline-none border border-stone-300"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Назва (необов'язково)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="flex-1 bg-[#e2d8c7] text-stone-900 px-3 py-1.5 rounded-full text-xs outline-none border border-stone-300"
                />
                <button
                  type="submit"
                  disabled={!newLinkUrl.trim()}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-300 text-stone-900 hover:bg-stone-400:bg-zinc-700 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Зберегти
                </button>
              </div>
            </form>
          )}

          {totalLinksCount === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs italic flex flex-col items-center gap-2">
              <Link2 className="w-6 h-6 opacity-40" />
              <span>Посилань ще немає. Додайте окреме посилання або вставте посилання в нотатку.</span>
            </div>
          ) : (
            <>
              {/* Render Link Folders */}
              {linkFolders.map((lf) => {
                const folderLinks = unifiedLinks.filter((l) => l.folderId === lf.id);
                const isCollapsed = lf.collapsed;

                return (
                  <div key={lf.id} className="group/lf relative">
                    <div className="flex items-center justify-between gap-1 py-0.5 px-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <button
                          onClick={() => onUpdateLinkFolder?.(lf.id, { collapsed: !isCollapsed })}
                          className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer"
                        >
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {editingLinkFolderId === lf.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => {
                              if (editName.trim()) onUpdateLinkFolder?.(lf.id, { name: editName.trim() });
                              setEditingLinkFolderId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editName.trim()) onUpdateLinkFolder?.(lf.id, { name: editName.trim() });
                                setEditingLinkFolderId(null);
                              }
                            }}
                            className="bg-transparent border-b border-stone-400 text-stone-900 text-xs font-semibold outline-none px-1"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => {
                              setEditingLinkFolderId(lf.id);
                              setEditName(lf.name);
                            }}
                            className="truncate font-semibold text-xs text-stone-800 cursor-pointer"
                          >
                            {lf.name}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">
                          ({folderLinks.length})
                        </span>
                      </div>

                      <button
                        data-context-toggle="true"
                        onClick={() => setActiveMenuLinkFolderId(activeMenuLinkFolderId === lf.id ? null : lf.id)}
                        className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Link Folder Menu Dropdown */}
                    <AnimatePresence>
                      {activeMenuLinkFolderId === lf.id && (
                        <motion.div
                          data-context-menu="true"
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-2 bg-[#ede5d8] border border-stone-300 rounded-2xl shadow-xl flex flex-col gap-1 text-xs mb-1"
                        >
                          <button
                            onClick={() => {
                              setEditingLinkFolderId(lf.id);
                              setEditName(lf.name);
                              setActiveMenuLinkFolderId(null);
                            }}
                            className="w-full text-left px-2.5 py-1 rounded-full text-stone-700 hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Перейменувати</span>
                          </button>
                          <button
                            onClick={() => {
                              onDeleteLinkFolder?.(lf.id);
                              setActiveMenuLinkFolderId(null);
                            }}
                            className="w-full text-left px-2.5 py-1 rounded-full text-red-600 hover:text-red-700:text-red-300 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Видалити папку</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Contained links */}
                    {!isCollapsed && (
                      <div className="pl-2 space-y-0.5">
                        {folderLinks.length === 0 ? (
                          <div className="py-1 text-center text-[10px] italic text-stone-400">
                            Папка порожня
                          </div>
                        ) : (
                          folderLinks.map((l) => renderLinkRow(l))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned Root Links */}
              {unifiedLinks.filter((l) => !l.folderId || !linkFolders.some((f) => f.id === l.folderId)).map((l) => renderLinkRow(l))}
            </>
          )}
        </div>
      ) : currentTab === 'files' ? (
        /* Files Tab Content */
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 pt-2.5 space-y-0.5 min-h-[200px] scrollbar-none">
          {totalFilesCount === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs italic flex flex-col items-center gap-2">
              <FileText className="w-6 h-6 opacity-40" />
              <span>Файлів ще немає. Завантажте файл з ПК або додайте з Google Drive / нотаток.</span>
            </div>
          ) : (
            <>
              {/* Render File Folders */}
              {(fileFolders || []).map((ff) => {
                const folderFiles = unifiedFiles.filter((f) => f.folderId === ff.id);
                const isCollapsed = ff.collapsed;

                return (
                  <div key={ff.id} className="group/ff relative">
                    <div className="flex items-center justify-between gap-1 py-0.5 px-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <button
                          onClick={() => onUpdateFileFolder?.(ff.id, { collapsed: !isCollapsed })}
                          className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer"
                        >
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {editingFileFolderId === ff.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => {
                              if (editName.trim()) onUpdateFileFolder?.(ff.id, { name: editName.trim() });
                              setEditingFileFolderId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editName.trim()) onUpdateFileFolder?.(ff.id, { name: editName.trim() });
                                setEditingFileFolderId(null);
                              }
                            }}
                            className="bg-transparent border-b border-stone-400 text-stone-900 text-xs font-semibold outline-none px-1"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => {
                              setEditingFileFolderId(ff.id);
                              setEditName(ff.name);
                            }}
                            className="truncate font-semibold text-xs text-stone-800 cursor-pointer"
                          >
                            {ff.name}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">
                          ({folderFiles.length})
                        </span>
                      </div>

                      <button
                        data-context-toggle="true"
                        onClick={() => setActiveMenuFileFolderId(activeMenuFileFolderId === ff.id ? null : ff.id)}
                        className="p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* File Folder Menu Dropdown */}
                    <AnimatePresence>
                      {activeMenuFileFolderId === ff.id && (
                        <motion.div
                          data-context-menu="true"
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-2 bg-[#ede5d8] border border-stone-300 rounded-2xl shadow-xl flex flex-col gap-1 text-xs mb-1"
                        >
                          <button
                            onClick={() => {
                              setEditingFileFolderId(ff.id);
                              setEditName(ff.name);
                              setActiveMenuFileFolderId(null);
                            }}
                            className="w-full text-left px-2.5 py-1 rounded-full text-stone-700 hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Перейменувати</span>
                          </button>
                          <button
                            onClick={() => {
                              onDeleteFileFolder?.(ff.id);
                              setActiveMenuFileFolderId(null);
                            }}
                            className="w-full text-left px-2.5 py-1 rounded-full text-red-600 hover:text-red-700:text-red-300 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Видалити папку</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Contained files */}
                    {!isCollapsed && (
                      <div className="pl-2 space-y-0.5">
                        {folderFiles.length === 0 ? (
                          <div className="py-1 text-center text-[10px] italic text-stone-400">
                            Папка порожня
                          </div>
                        ) : (
                          folderFiles.map((f) => renderFileRow(f))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned Root Files */}
              {unifiedFiles
                .filter((f) => !f.folderId || !fileFolders.some((ff) => ff.id === f.folderId))
                .map((f) => renderFileRow(f))}
            </>
          )}
        </div>
      ) : currentTab === 'search' ? (
        /* Global Canvas Search Tab View */
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3 min-h-[200px] scrollbar-none">
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            
            // Collect all unique tags
            const allTags = Array.from(
              new Set([
                ...notes.flatMap((n) => n.tags || []),
                ...unifiedLinks.flatMap((l) => l.tags || []),
                ...unifiedFiles.flatMap((f) => f.tags || []),
              ])
            );

            if (!q) {
              return (
                <div className="p-3 text-center text-stone-600 text-xs space-y-3">
                  <div className="p-2.5 rounded-2xl bg-[#e2d8c7]/60 border border-stone-300/60 text-left space-y-1">
                    <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-stone-600" />
                      <span>Пошук по всьому канвасу</span>
                    </p>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Введіть текст, назву, посилання або #тег у полі нижче для миттєвого пошуку по нотатках, папках та вкладеннях.
                    </p>
                  </div>

                  {allTags.length > 0 && (
                    <div className="text-left space-y-1.5 pt-1">
                      <p className="text-[11px] font-medium text-stone-700 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>Доступні теги:</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSearchQuery(`#${tag}`)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#e2d8c7] hover:bg-stone-300 text-stone-800 transition-colors cursor-pointer border border-stone-300/80"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Search Filtered Results
            const searchNotes = notes.filter((n) => {
              const tagsStr = (n.tags || []).map((t) => `#${t}`).join(' ');
              const title = n.title || '';
              const content = (n.content || '').replace(/<[^>]*>/g, '');
              return (
                title.toLowerCase().includes(q) ||
                content.toLowerCase().includes(q) ||
                tagsStr.toLowerCase().includes(q)
              );
            });

            const searchFolders = folders.filter((f) => f.name.toLowerCase().includes(q));

            const searchLinks = unifiedLinks.filter((l) => {
              const tagsStr = (l.tags || []).map((t) => `#${t}`).join(' ');
              return (
                (l.title || '').toLowerCase().includes(q) ||
                (l.url || '').toLowerCase().includes(q) ||
                (l.domain || '').toLowerCase().includes(q) ||
                (l.noteTitle || '').toLowerCase().includes(q) ||
                tagsStr.toLowerCase().includes(q)
              );
            });

            const searchFiles = unifiedFiles.filter((f) => {
              const tagsStr = (f.tags || []).map((t) => `#${t}`).join(' ');
              return (
                (f.name || '').toLowerCase().includes(q) ||
                (f.type || '').toLowerCase().includes(q) ||
                (f.noteTitle || '').toLowerCase().includes(q) ||
                tagsStr.toLowerCase().includes(q)
              );
            });

            const totalMatches =
              searchNotes.length + searchFolders.length + searchLinks.length + searchFiles.length;

            if (totalMatches === 0) {
              return (
                <div className="p-6 text-center text-stone-500 text-xs italic">
                  Нічого не знайдено за запитом „{searchQuery}”
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* Notes */}
                {searchNotes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-1">
                      Нотатки ({searchNotes.length})
                    </p>
                    <div className="space-y-1">
                      {searchNotes.map((n) => {
                        const title = n.title || 'Без назви';
                        const snippet = (n.content || '').replace(/<[^>]*>/g, '').slice(0, 60);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              onFocusLayer({ x: n.x, y: n.y });
                              onSelectLayer(n.id);
                            }}
                            className="p-2 rounded-2xl bg-[#e2d8c7]/70 hover:bg-[#e2d8c7] border border-stone-300/70 transition-all cursor-pointer space-y-0.5"
                          >
                            <div className="font-semibold text-xs text-stone-900 truncate">
                              {title}
                            </div>
                            {snippet && (
                              <div className="text-[11px] text-stone-600 line-clamp-1">
                                {snippet}
                              </div>
                            )}
                            {n.tags && n.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {n.tags.map((t) => (
                                  <span key={t} className="text-[9px] font-mono text-stone-500">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Folders */}
                {searchFolders.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-1">
                      Папки ({searchFolders.length})
                    </p>
                    <div className="space-y-1">
                      {searchFolders.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => onFocusLayer({ x: f.x, y: f.y })}
                          className="p-2 rounded-2xl bg-[#e2d8c7]/70 hover:bg-[#e2d8c7] border border-stone-300/70 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <FolderIcon className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                          <span className="font-semibold text-xs text-stone-900 truncate flex-1">
                            {f.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                {searchLinks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-1">
                      Посилання ({searchLinks.length})
                    </p>
                    <div className="space-y-1">
                      {searchLinks.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            if (l.noteX !== undefined && l.noteY !== undefined) {
                              onFocusLayer({ x: l.noteX, y: l.noteY });
                              if (l.noteId) onSelectLayer(l.noteId);
                            }
                          }}
                          className="p-2 rounded-2xl bg-[#e2d8c7]/70 hover:bg-[#e2d8c7] border border-stone-300/70 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Link2 className="w-3.5 h-3.5 text-stone-600 shrink-0 -rotate-45" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-stone-900 truncate">
                              {l.title || l.domain}
                            </div>
                            <div className="text-[10px] text-stone-500 truncate">{l.url}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {searchFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-1">
                      Файли ({searchFiles.length})
                    </p>
                    <div className="space-y-1">
                      {searchFiles.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => {
                            if (f.noteX !== undefined && f.noteY !== undefined) {
                              onFocusLayer({ x: f.noteX, y: f.noteY });
                              if (f.noteId) onSelectLayer(f.noteId);
                            }
                          }}
                          className="p-2 rounded-2xl bg-[#e2d8c7]/70 hover:bg-[#e2d8c7] border border-stone-300/70 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-stone-900 truncate">
                              {f.name}
                            </div>
                            {f.noteTitle && (
                              <div className="text-[10px] text-stone-500 truncate">
                                У нотатці: {f.noteTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* AI Assistant Tab View */
        <div className="flex-1 flex flex-col min-h-[220px] overflow-hidden p-2.5 space-y-2">
          {/* AI Settings View or Chat Messages Container */}
          {isAiSettingsOpen ? (
            <div className="flex-1 flex flex-col p-3 space-y-3.5 overflow-y-auto scrollbar-thin">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-900">
                  <Settings className="w-4 h-4 text-stone-700" />
                  <span>Налаштування AI</span>
                </div>
                <button
                  onClick={() => setIsAiSettingsOpen(false)}
                  className="p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Provider Selector Tabs */}
              <div className="flex items-center gap-1 p-1 bg-stone-300/40 rounded-full">
                <button
                  type="button"
                  onClick={() => setAiProvider('gemini')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    aiProvider === 'gemini'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <GeminiLogo className="w-3.5 h-3.5" />
                  <span>Gemini</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('deepseek')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    aiProvider === 'deepseek'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <DeepSeekLogo className="w-3.5 h-3.5" />
                  <span>DeepSeek</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('local')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    aiProvider === 'local'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <OllamaLogo className="w-3.5 h-3.5" />
                  <span>Ollama</span>
                </button>
              </div>

              {/* Active Provider Controls & Connectivity Check */}
              <div className="space-y-2.5 pt-0.5">
                {aiProvider === 'gemini' && (
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <GeminiLogo className="w-4 h-4" />
                        <span>Google Gemini</span>
                      </div>
                      {(geminiApiKey || serverAiStatus.hasGeminiKey) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Підключено
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full bg-[#e2d8c7] text-stone-900 text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300 outline-none cursor-pointer"
                      >
                        <option value="gemini-3.6-flash">Gemini 3.6 Flash (Швидка + Пошук)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Глибокий аналіз)</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Легка)</option>
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Введіть API Ключ"
                        className="w-full bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 pl-8 font-mono"
                      />
                      <Key className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </>
                )}

                {aiProvider === 'deepseek' && (
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <DeepSeekLogo className="w-4 h-4" />
                        <span>DeepSeek AI</span>
                      </div>
                      {(deepseekApiKey || serverAiStatus.hasDeepSeekKey) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Підключено
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <select
                        value={deepseekModel}
                        onChange={(e) => setDeepseekModel(e.target.value)}
                        className="w-full bg-[#e2d8c7] text-stone-900 text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300 outline-none cursor-pointer"
                      >
                        <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                        <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="password"
                        value={deepseekApiKey}
                        onChange={(e) => setDeepseekApiKey(e.target.value)}
                        placeholder="Введіть API Ключ"
                        className="w-full bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 pl-8 font-mono"
                      />
                      <Key className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </>
                )}

                {aiProvider === 'local' && (
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <OllamaLogo className="w-4 h-4" />
                        <span>Ollama Local</span>
                      </div>
                      {ollamaStatus === 'online' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Онлайн ({ollamaModelsList.length})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434"
                        className="flex-1 bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 font-mono"
                      />
                      <button
                        onClick={checkOllamaModels}
                        disabled={ollamaStatus === 'checking'}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${ollamaStatus === 'checking' ? 'animate-spin' : ''}`} />
                        <span>Тест</span>
                      </button>
                    </div>

                    <div>
                      {ollamaModelsList.length > 0 ? (
                        <select
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          className="w-full bg-[#e2d8c7] text-stone-900 text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300 outline-none cursor-pointer"
                        >
                          {ollamaModelsList.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name} {m.size ? `(${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder="llama3, mistral..."
                          className="w-full bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 font-mono"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Web Search Section (Tavily & Serper separate sections) */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-stone-900 px-0.5 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-stone-700" />
                  <span>Пошук в мережі</span>
                </div>

                {/* Tavily Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-800 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <TavilyLogo className="w-4 h-4" />
                      <span>Tavily Search API</span>
                    </div>
                    {tavilyApiKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Підключено
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={tavilyApiKey}
                      onChange={(e) => setTavilyApiKey(e.target.value)}
                      placeholder="Введіть API Ключ"
                      className="w-full bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 pl-8 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Serper Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-800 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <SerperLogo className="w-4 h-4" />
                      <span>Serper Google Search</span>
                    </div>
                    {serperApiKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Підключено
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={serperApiKey}
                      onChange={(e) => setSerperApiKey(e.target.value)}
                      placeholder="Введіть API Ключ"
                      className="w-full bg-[#e2d8c7] text-stone-900 text-xs px-3 py-1.5 rounded-full border border-stone-300 outline-none placeholder:text-stone-400 pl-8 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsAiSettingsOpen(false)}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 mt-3"
              >
                <Check className="w-4 h-4" />
                <span>Зберегти</span>
              </button>
            </div>
          ) : (
            <>
              {/* Chat Messages Scroll Container */}
              <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin min-h-[140px] select-text">
                {/* Context badge showing how many notes/files are available */}
                {(notes.length > 0 || standaloneLinks.length > 0 || standaloneFiles.length > 0) && (
                  <div className="flex items-center justify-between bg-stone-200/50 border border-stone-300/60 px-2.5 py-1 rounded-full text-[10px] text-stone-700 select-none">
                    <span className="flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-stone-600" />
                      <span>Контекст полотна:</span>
                    </span>
                    <span className="font-semibold text-stone-900">
                      {notes.length} нотаток, {standaloneLinks.length} посилань, {standaloneFiles.length} файлів
                    </span>
                  </div>
                )}

                {/* API Key missing notice if running outside AI Studio without server key or custom key */}
                {!geminiApiKey && !serverAiStatus.hasGeminiKey && !deepseekApiKey && !serverAiStatus.hasDeepSeekKey && (
                  <div className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-2xl text-[11px] text-amber-900 space-y-1.5 select-none">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-700" />
                        <span>Потрібен API ключ</span>
                      </span>
                      <button
                        onClick={() => setIsAiSettingsOpen(true)}
                        className="text-[10px] bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer font-medium"
                      >
                        Налаштувати ⚙️
                      </button>
                    </div>
                    <p className="text-[10.5px] leading-snug text-amber-800">
                      Для використання AI введіть ваш безкоштовний ключ Gemini чи DeepSeek у налаштуваннях AI.
                    </p>
                  </div>
                )}

                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[96%] text-xs leading-relaxed select-text ${
                        msg.role === 'user'
                          ? 'bg-stone-900 text-stone-100 px-3.5 py-2 rounded-2xl rounded-tr-none shadow-2xs'
                          : msg.isError
                          ? 'bg-amber-100 text-amber-950 border border-amber-300 px-3 py-2 rounded-2xl rounded-tl-none shadow-2xs'
                          : 'bg-[#efe9dd]/90 border border-stone-300/80 text-stone-900 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-2xs'
                      }`}
                    >
                      {msg.isError ? (
                        <div className="flex items-start gap-2 text-amber-950 font-medium">
                          <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="text-xs leading-relaxed select-text">{msg.content}</div>
                        </div>
                      ) : msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                      ) : (
                        <div className="break-words select-text space-y-1">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-sm font-bold text-stone-950 mt-2 mb-1 border-b border-stone-300/70 pb-0.5 select-text">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xs font-bold text-stone-900 mt-2 mb-1 select-text">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-xs font-semibold text-stone-900 mt-1.5 mb-0.5 select-text">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="my-1 text-xs leading-relaxed text-stone-900 select-text">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-outside ml-4 my-1 space-y-0.5 text-xs text-stone-900 select-text">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-outside ml-4 my-1 space-y-0.5 text-xs text-stone-900 select-text">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed text-xs text-stone-900 select-text">
                                  {children}
                                </li>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-stone-500 pl-2.5 my-1.5 italic text-stone-800 bg-stone-200/60 py-1 rounded-r-lg text-xs select-text">
                                  {children}
                                </blockquote>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-stone-950 select-text">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-stone-900 select-text">
                                  {children}
                                </em>
                              ),
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-800 underline font-medium hover:text-blue-950 inline-flex items-center gap-0.5 break-all select-text"
                                >
                                  <span>{children}</span>
                                  <ExternalLink className="w-3 h-3 inline shrink-0" />
                                </a>
                              ),
                              code({ node, className, children, ...props }: any) {
                                const codeStr = String(children).replace(/\n$/, '');
                                const isCodeBlock = codeStr.includes('\n') || (className && className.includes('language-'));
                                const langMatch = /language-(\w+)/.exec(className || '');
                                const langName = langMatch ? langMatch[1] : 'code';

                                if (isCodeBlock) {
                                  return (
                                    <div className="my-2 bg-stone-900 text-stone-100 rounded-xl p-2.5 font-mono text-[11px] border border-stone-700/80 shadow-inner relative group select-text">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-800 text-[10px] text-stone-400 font-mono select-none">
                                        <span>{langName}</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => navigator.clipboard.writeText(codeStr)}
                                            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                            title="Скопіювати код"
                                          >
                                            <Copy className="w-3 h-3" />
                                            <span>Копіювати</span>
                                          </button>
                                          {onCreateNoteFromAI && (
                                            <button
                                              onClick={() => onCreateNoteFromAI(`Код (${langName})`, `\`\`\`${langName}\n${codeStr}\n\`\`\``)}
                                              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-emerald-400"
                                              title="Зберегти код як нотатку"
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span>+ Нотатка</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <pre className="whitespace-pre-wrap break-words overflow-x-auto leading-relaxed text-stone-200 select-text">
                                        {codeStr}
                                      </pre>
                                    </div>
                                  );
                                }
                                return (
                                  <code
                                    className="bg-stone-300/80 text-stone-950 px-1.5 py-0.5 rounded font-mono text-[11px] border border-stone-400/60 select-text"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Action Note suggestion from AI */}
                      {msg.actionNote && !msg.isError && (
                        <div className="mt-2 pt-2 border-t border-stone-300/60 flex flex-col gap-1">
                          <div className="text-[10px] font-semibold text-stone-600">
                            Запропоновано створити нотатку:
                          </div>
                          <div className="font-medium text-xs text-stone-900">
                            {msg.actionNote.title}
                          </div>
                          <button
                            onClick={() => {
                              if (msg.actionNote && onCreateNoteFromAI) {
                                onCreateNoteFromAI(msg.actionNote.title, msg.actionNote.content);
                              }
                            }}
                            className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Створити нотатку на полотні</span>
                          </button>
                        </div>
                      )}

                      {/* Message Action Bar: Copy full message & Save as note */}
                      {msg.role === 'assistant' && !msg.isError && (
                        <div className="mt-2 pt-1.5 border-t border-stone-300/50 flex items-center justify-between text-[10px] text-stone-600 select-none">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-stone-950 hover:bg-stone-300/50 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                            title="Скопіювати всю відповідь"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                <span className="text-emerald-700 font-semibold">Скопійовано!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Скопіювати</span>
                              </>
                            )}
                          </button>

                          {!msg.actionNote && (
                            <button
                              onClick={() => {
                                if (onCreateNoteFromAI) {
                                  const firstLine = msg.content.split('\n')[0].replace(/^[*#\s\d.-]+/, '').trim();
                                  const title = firstLine.length > 0 && firstLine.length < 50 ? firstLine : 'AI Відповідь';
                                  onCreateNoteFromAI(title, msg.content);
                                }
                              }}
                              className="hover:text-stone-950 hover:bg-stone-300/50 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                              title="Зберегти як нотатку на полотні"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Зберегти як нотатку</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-500 mt-0.5 px-1 font-mono select-none">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* Gemini-Style 3 Animated Bouncing Dots Thinking State */}
                {isAiLoading && (
                  <div className="flex items-center gap-2.5 py-2 px-3.5 bg-[#efe9dd] rounded-2xl rounded-tl-none w-fit border border-stone-300/80 my-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="w-2 h-2 rounded-full bg-stone-900 animate-bounce [animation-delay:-0.32s]" />
                      <span className="w-2 h-2 rounded-full bg-stone-900 animate-bounce [animation-delay:-0.16s]" />
                      <span className="w-2 h-2 rounded-full bg-stone-900 animate-bounce" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 select-none">AI міркує...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* AI Message Input Form - Clean with plain icon send button and settings icon */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage();
                }}
                className="flex items-center gap-1.5 pt-2 border-t border-stone-300/50 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Введіть ваше запитання..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="flex-1 bg-[#e2d8c7] text-stone-900 px-3.5 py-2 rounded-full text-xs outline-none border border-stone-300 placeholder-stone-500"
                />
                <button
                  type="submit"
                  disabled={!aiInputText.trim() || isAiLoading}
                  className="p-1.5 text-stone-700 hover:text-stone-950 transition-colors disabled:opacity-30 cursor-pointer shrink-0 flex items-center justify-center border-none outline-none bg-transparent"
                  title="Надіслати"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAiSettingsOpen(!isAiSettingsOpen);
                    if (!isAiSettingsOpen) {
                      checkOllamaModels();
                    }
                  }}
                  className={`p-1.5 transition-colors cursor-pointer shrink-0 flex items-center justify-center border-none outline-none bg-transparent ${
                    isAiSettingsOpen ? 'text-stone-950 font-bold' : 'text-stone-600 hover:text-stone-950'
                  }`}
                  title="Налаштування AI"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
    </div>
  )}

      {/* Search & Action Footer - Single Row (Hidden in AI mode) */}
      {currentTab !== 'ai' && (
        <div className="px-3 pb-3 pt-2 shrink-0 border-t border-stone-300/50 flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-[#e2d8c7] border border-stone-300 rounded-full px-3.5 py-1.5">
            <Search className="w-4 h-4 text-stone-500 pointer-events-none shrink-0" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Пошук (словами, назвами, тегами)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none pl-2.5 pr-6 text-xs text-stone-900 placeholder-stone-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Actions based on active tab */}
          {currentTab === 'links' ? (
            <>
              <button
                onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                className={`p-1.5 rounded-full transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
                  showAddLinkForm
                    ? 'text-stone-900 bg-stone-300/60'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Додати посилання окремо"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onCreateLinkFolder?.()}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Створити папку посилань"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </>
          ) : currentTab === 'files' ? (
            <>
              <label
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Завантажити файл з ПК"
              >
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onAddStandaloneFile?.(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              <button
                onClick={() => onCreateFileFolder?.()}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Створити папку файлів"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onCreateFolder()}
              className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              title="Створити папку"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}

          {/* Template Library button */}
          {onOpenTemplatePicker && (
            <button
              onClick={onOpenTemplatePicker}
              className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              title="Бібліотека шаблонів"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
          )}

          {/* Google Drive / Cloud button */}
          {onOpenDriveModal && (
            <button
              onClick={onOpenDriveModal}
              className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              title="Google Drive"
            >
              <Cloud className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Resize Handle */}
      <div 
        className="absolute bottom-1 right-1 w-3 h-3 cursor-ns-resize group/resize flex items-center justify-center"
        onPointerDown={handleResize}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/resize:bg-white/40 transition-colors" />
      </div>
    </motion.div>
  );
});
