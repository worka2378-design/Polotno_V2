// Utility for Google Drive REST API integration using AI Studio OAuth token
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  modifiedTime?: string;
}

export interface DriveBackupInfo {
  fileId: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

const TOKEN_STORAGE_KEY = 'gdrive_access_token';
const TOKEN_TIME_KEY = 'gdrive_access_token_time';

export class DriveTokenExpiredError extends Error {
  isTokenExpired: boolean = true;
  constructor(message: string = 'Термін дії токена Google закінчився (1 година). Будь ласка, увійдіть знову через Google.') {
    super(message);
    this.name = 'DriveTokenExpiredError';
  }
}

export class DrivePermissionError extends Error {
  isPermissionDenied: boolean = true;
  constructor(message: string = 'Увійдіть повторно та надайте дозволи на доступ до Google Drive і Calendar.') {
    super(message);
    this.name = 'DrivePermissionError';
  }
}

function getStoredAccessToken(): string | null {
  try {
    const timeStr = localStorage.getItem(TOKEN_TIME_KEY);
    if (timeStr) {
      const elapsedMs = Date.now() - parseInt(timeStr, 10);
      // Google OAuth token expires in 1 hr (3600s). Invalidate if older than 50 minutes.
      if (elapsedMs > 50 * 60 * 1000) {
        setStoredAccessToken(null);
        return null;
      }
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredAccessToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_TIME_KEY, String(Date.now()));
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_TIME_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

let cachedAccessToken: string | null = getStoredAccessToken();
let isSigningIn = false;

export function isAIStudioEnvironment(): boolean {
  return typeof (window as any).__getGoogleAuthToken === 'function';
}

export function formatAuthError(error: any): string {
  if (error?.isTokenExpired || error?.name === 'DriveTokenExpiredError') {
    return 'Термін дії токена Google закінчився. Будь ласка, увійдіть знову через Google.';
  }
  if (error?.isPermissionDenied || error?.name === 'DrivePermissionError') {
    return 'Увійдіть повторно та надайте дозволи на доступ до Google Drive і Calendar.';
  }
  const msg = error?.message || '';
  if (msg.includes('401') || msg.toLowerCase().includes('unauthenticated') || msg.includes('протух')) {
    return 'Термін дії токена Google закінчився. Будь ласка, увійдіть знову через Google.';
  }
  if (msg.toLowerCase().includes('insufficient') || msg.includes('PERMISSION_DENIED')) {
    return 'Увійдіть повторно та надайте дозволи на доступ до Google Drive і Calendar.';
  }

  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain') {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'поточний домен';
    return `Домен (${domain}) не додано у "Authorized domains" Firebase проєкту. Додайте його у Firebase Console або скористайтеся бекапом у файл (.json).`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Вікно авторизації Google було закрито.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Браузер заблокував випливаюче вікно авторизації.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Вхід через Google не активовано в налаштуваннях авторизації Firebase.';
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
    return 'Некоректна конфігурація OAuth ключа Firebase.';
  }
  return msg || 'Помилка авторизації Google';
}

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Silent refresh interval check every 15 minutes while active
  const interval = setInterval(async () => {
    const tokenTime = localStorage.getItem(TOKEN_TIME_KEY);
    if (tokenTime) {
      const elapsedMs = Date.now() - parseInt(tokenTime, 10);
      if (elapsedMs > 40 * 60 * 1000) {
        // Attempt background silent refresh
        try {
          if (isAIStudioEnvironment()) {
            const freshToken = await (window as any).__getGoogleAuthToken(SCOPES);
            if (freshToken) {
              setStoredAccessToken(freshToken);
            }
          } else {
            // Check if token expired
            getStoredAccessToken();
          }
        } catch {
          setStoredAccessToken(null);
        }
      }
    }
  }, 15 * 60 * 1000);

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = cachedAccessToken || getStoredAccessToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      setStoredAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });

  return () => {
    clearInterval(interval);
    unsubscribe();
  };
};

export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    setStoredAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogleDrive = async () => {
  await signOut(auth);
  setStoredAccessToken(null);
};

export const getCurrentDriveUser = () => auth.currentUser;

export async function getGoogleDriveToken(): Promise<string> {
  if (typeof (window as any).__getGoogleAuthToken === 'function') {
    try {
      const token = await (window as any).__getGoogleAuthToken(SCOPES);
      if (token) {
        setStoredAccessToken(token);
        return token;
      }
    } catch (e) {
      // Fall through
    }
  }

  const token = cachedAccessToken || getStoredAccessToken();
  if (token) {
    cachedAccessToken = token;
    return token;
  }

  throw new DriveTokenExpiredError('Потрібно увійти через Google акаунт для доступу до Google Drive');
}

/**
 * Unified fetch wrapper with automatic token management, 401 silent refresh handling, and 403 permission handling
 */
export async function fetchWithDriveAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getGoogleDriveToken().catch(() => null);

  if (!token) {
    throw new DriveTokenExpiredError('Потрібно увійти через Google акаунт для доступу до Google Drive / Calendar');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  // Handle 401 Unauthorized (expired token)
  if (res.status === 401) {
    setStoredAccessToken(null);

    let freshToken: string | null = null;
    if (isAIStudioEnvironment()) {
      try {
        freshToken = await (window as any).__getGoogleAuthToken(SCOPES);
      } catch (e) {}
    }

    if (freshToken) {
      setStoredAccessToken(freshToken);
      headers.set('Authorization', `Bearer ${freshToken}`);
      res = await fetch(url, { ...options, headers });
      if (res.ok) return res;
    }

    if (!res.ok) {
      setStoredAccessToken(null);
      throw new DriveTokenExpiredError('Термін дії токена Google закінчився (1 година). Будь ласка, увійдіть знову через Google.');
    }
  }

  // Handle 403 Forbidden (insufficient permissions/scopes)
  if (res.status === 403) {
    const errText = await res.clone().text().catch(() => '');
    if (
      errText.toLowerCase().includes('insufficient') ||
      errText.includes('PERMISSION_DENIED') ||
      errText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
    ) {
      throw new DrivePermissionError('Увійдіть повторно та надайте дозволи на доступ до Google Drive і Calendar.');
    }
  }

  return res;
}

export const driveApiFetch = fetchWithDriveAuth;

/**
 * Find existing board backup file in Google Drive
 */
export async function findDriveBackup(): Promise<DriveBackupInfo | null> {
  try {
    const tokenCandidate = cachedAccessToken || getStoredAccessToken();
    if (!isAIStudioEnvironment() && !tokenCandidate) {
      return null;
    }
    const q = encodeURIComponent("name = 'canvas_board_backup.json' and trashed = false");
    const res = await fetchWithDriveAuth(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const f = data.files[0];
      return {
        fileId: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      };
    }
    return null;
  } catch (err) {
    // Return null silently without throwing console error
    return null;
  }
}

/**
 * Save or update board backup to Google Drive
 */
export async function saveBoardToDrive(
  boardData: any,
  existingFileId?: string
): Promise<DriveBackupInfo> {
  let targetFileId = existingFileId;
  if (!targetFileId) {
    const existing = await findDriveBackup();
    if (existing) {
      targetFileId = existing.fileId;
    }
  }

  if (targetFileId) {
    // Update existing backup file
    const res = await fetchWithDriveAuth(
      `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media&fields=id,name,modifiedTime,webViewLink`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Помилка оновлення бекапу: ${res.statusText} (${errText})`);
    }

    const data = await res.json();
    return {
      fileId: data.id,
      name: data.name || 'canvas_board_backup.json',
      modifiedTime: data.modifiedTime || new Date().toISOString(),
      webViewLink: data.webViewLink,
    };
  } else {
    // Create new backup file
    const metadata = {
      name: 'canvas_board_backup.json',
      mimeType: 'application/json',
    };
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const close_delim = '\r\n--' + boundary + '--';

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(boardData) +
      close_delim;

    const res = await fetchWithDriveAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: body,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Помилка створення бекапу: ${res.statusText} (${errText})`);
    }

    const data = await res.json();
    return {
      fileId: data.id,
      name: data.name,
      modifiedTime: data.modifiedTime || new Date().toISOString(),
      webViewLink: data.webViewLink,
    };
  }
}

/**
 * Load board backup content from Google Drive
 */
export async function loadBoardFromDrive(fileId?: string): Promise<any> {
  let targetId = fileId;
  if (!targetId) {
    const existing = await findDriveBackup();
    if (!existing) {
      throw new Error('Резервну копію в Google Drive не знайдено');
    }
    targetId = existing.fileId;
  }

  const res = await fetchWithDriveAuth(
    `https://www.googleapis.com/drive/v3/files/${targetId}?alt=media`
  );

  if (!res.ok) {
    throw new Error(`Не вдалося завантажити бекап з Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * List user files from Google Drive
 */
export async function listDriveFiles(
  searchQuery: string = '',
  categoryFilter: string = 'all'
): Promise<DriveFileItem[]> {
  let q = 'trashed = false';

  if (categoryFilter === 'documents') {
    q += " and (mimeType contains 'document' or mimeType contains 'pdf' or mimeType contains 'text' or mimeType contains 'spreadsheet' or mimeType contains 'presentation')";
  } else if (categoryFilter === 'images') {
    q += " and mimeType contains 'image/'";
  } else if (categoryFilter === 'media') {
    q += " and (mimeType contains 'video/' or mimeType contains 'audio/')";
  }

  if (searchQuery.trim()) {
    const cleanSearch = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${cleanSearch}'`;
  }

  const encodedQ = encodeURIComponent(q);
  const res = await fetchWithDriveAuth(
    `https://www.googleapis.com/drive/v3/files?pageSize=40&q=${encodedQ}&fields=files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,size,modifiedTime)&orderBy=modifiedTime desc`
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Не вдалося отримати список файлів Drive: ${res.statusText} (${errText})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a local File to Google Drive
 */
export async function uploadFileToDrive(file: File): Promise<DriveFileItem> {
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const res = await fetchWithDriveAuth(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink,iconLink,size,modifiedTime',
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка завантаження файлу на Google Drive: ${res.statusText} (${errText})`);
  }

  const data = await res.json();
  return data;
}
