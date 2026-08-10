// IndexedDB helper for storing FileSystemDirectoryHandle across page reloads
const DB_NAME = 'NoteCanvasSyncDB';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'pc_directory_handle';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, HANDLE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error getting stored directory handle:', e);
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error clearing directory handle:', e);
  }
}

export async function verifyFolderPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  const options = {
    mode: readWrite ? 'readwrite' : 'read',
  };
  try {
    const handleAny = handle as any;
    if (typeof handleAny.queryPermission === 'function') {
      if ((await handleAny.queryPermission(options)) === 'granted') {
        return true;
      }
    }
    if (typeof handleAny.requestPermission === 'function') {
      if ((await handleAny.requestPermission(options)) === 'granted') {
        return true;
      }
    }
  } catch (e) {
    console.warn('Permission query failed:', e);
  }
  return false;
}

export async function selectLocalFolder(): Promise<{
  handle: FileSystemDirectoryHandle;
  folderName: string;
} | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Ваш браузер не підтримує вибір папки на ПК (File System Access API). Використовуйте Chrome, Edge або Opera.');
  }

  const handle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });

  if (!handle) return null;

  const hasPermission = await verifyFolderPermission(handle, true);
  if (!hasPermission) {
    throw new Error('Немає дозволу на запис у вибрану папку.');
  }

  await saveDirectoryHandle(handle);
  return {
    handle,
    folderName: handle.name,
  };
}

export async function saveBoardToLocalFolder(
  handle: FileSystemDirectoryHandle,
  payload: any
): Promise<number> {
  const hasPerm = await verifyFolderPermission(handle, true);
  if (!hasPerm) {
    throw new Error('Потрібно надати дозвіл на доступ до папки ПК.');
  }

  const timestamp = Date.now();
  const dataToSave = {
    ...payload,
    lastSavedAt: timestamp,
    syncedFromPC: true,
  };

  const fileHandle = await handle.getFileHandle('board_data.json', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(dataToSave, null, 2));
  await writable.close();

  // Also export notes as markdown files inside "notes_markdown" subfolder for easy viewing on PC
  try {
    if (Array.isArray(payload.notes) && payload.notes.length > 0) {
      const notesDirHandle = await handle.getDirectoryHandle('notes_markdown', { create: true });
      for (const note of payload.notes) {
        const safeTitle = (note.title || 'Note')
          .replace(/[/\\?%*:|"<>]/g, '_')
          .substring(0, 40);
        const filename = `${safeTitle}_${note.id.substring(0, 6)}.md`;
        const noteFile = await notesDirHandle.getFileHandle(filename, { create: true });
        const noteWritable = await noteFile.createWritable();
        const content = `# ${note.title || 'Без назви'}\n\n${note.content || ''}\n`;
        await noteWritable.write(content);
        await noteWritable.close();
      }
    }
  } catch (e) {
    console.warn('Could not write notes_markdown subfolder:', e);
  }

  return timestamp;
}

export async function loadBoardFromLocalFolder(
  handle: FileSystemDirectoryHandle
): Promise<any | null> {
  const hasPerm = await verifyFolderPermission(handle, false);
  if (!hasPerm) {
    throw new Error('Немає дозволу на читання з папки ПК.');
  }

  try {
    const fileHandle = await handle.getFileHandle('board_data.json', { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    return JSON.parse(text);
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return null;
    }
    throw e;
  }
}

export async function getLocalFolderLastModified(
  handle: FileSystemDirectoryHandle
): Promise<number | null> {
  try {
    const fileHandle = await handle.getFileHandle('board_data.json', { create: false });
    const file = await fileHandle.getFile();
    return file.lastModified;
  } catch {
    return null;
  }
}
