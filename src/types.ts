export type NoteColor = 'white' | 'cream' | 'sage' | 'sky' | 'rose' | 'lavender' | 'slate';

export type FontFamily = 'sans' | 'serif' | 'mono';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface Point {
  x: number;
  y: number;
}

export interface Folder {
  id: string;
  name: string;
  collapsed?: boolean;
  createdAt: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  tags?: string[];
}

export interface StandaloneLink {
  id: string;
  url: string;
  title: string;
  domain: string;
  faviconUrl: string;
  createdAt: number;
  folderId?: string;
  tags?: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface LinkFolder {
  id: string;
  name: string;
  collapsed?: boolean;
  createdAt: number;
  tags?: string[];
}

export interface LinkMetadata {
  folderId?: string;
  tags?: string[];
}

export interface StandaloneFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  createdAt: number;
  folderId?: string;
  tags?: string[];
  noteId?: string;
  driveFileId?: string;
  driveThumbnail?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface FileFolder {
  id: string;
  name: string;
  collapsed?: boolean;
  createdAt: number;
  tags?: string[];
}

export interface FileMetadata {
  folderId?: string;
  tags?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string; // Base64 or Blob URL
  size: number;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // HTML or text
  color: NoteColor;
  fontFamily: FontFamily;
  fontSize: FontSize;
  textAlign: TextAlign;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
  attachments?: Attachment[];
  title?: string;
  locked?: boolean;
  hidden?: boolean;
  pinned?: boolean;
  folderId?: string;
  tags?: string[];
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
}

export interface VaultEncryptedData {
  salt: string;
  iv: string;
  data: string;
}

export interface VaultPayload {
  version: number;
  notes: Note[];
  folders?: Folder[];
  canvasOffset: Point;
  canvasScale: number;
}

export interface HistoryState {
  notes: Note[];
  folders?: Folder[];
}

export type AIProvider = 'gemini';

export interface AISettings {
  provider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: AIProvider;
  isError?: boolean;
  actionNote?: {
    title: string;
    content: string;
  };
}

