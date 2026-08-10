import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, X, Pin,
  Music, Video, FileText, File, Plus
} from 'lucide-react';
import { Note } from '../types';
import { NOTE_COLOR_CLASSES, FONT_CLASSES, FONT_SIZE_CLASSES, FONT_FAMILY_STYLES } from '../utils/theme';
import { deleteAttachmentData } from '../utils/attachmentStorage';
import { isUrl, createLinkCardHtml, convertTextUrlsToLinkCards, ensureLinkCardsUpToDate, escapeHtml } from '../utils/linkUtils';

interface NoteCardProps {
  note: Note;
  allNotes?: Note[];
  scale: number;
  isSelected: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, updates: Partial<Note>, isTextContent?: boolean) => void;
  onUpdateEnd?: () => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
  onNavigateToNote?: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = React.memo(({
  note,
  allNotes,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onUpdateEnd,
  onDelete,
  onBringToFront,
  onNavigateToNote,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const hasCheckboxes = note.content ? note.content.includes('checkbox') : false;

  // Mention Autocomplete state (@ / [[...]])
  const [mentionMenu, setMentionMenu] = useState<{
    visible: boolean;
    searchTerm: string;
    triggerType: '@' | '[[';
    items: Note[];
    selectedIndex: number;
  } | null>(null);

  const colorStyle = NOTE_COLOR_CLASSES[note.color] || NOTE_COLOR_CLASSES.white;

  // Sync initial content or external changes ONLY when not focused
  useEffect(() => {
    if (editorRef.current && !isFocusedRef.current) {
      const cleanContent = ensureLinkCardsUpToDate(note.content);
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
  }, [note.id, note.content]);

  // Global listener to capture selection changes in real-time
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          (window as any).__lastNoteSelectionRange = range.cloneRange();
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Drag logic
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (note.locked) return;
    e.stopPropagation();
    e.preventDefault(); // Prevent browser native HTML drag and text selection
    onSelect(note.id, e.shiftKey);
    onBringToFront(note.id);

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = note.x;
    const initialY = note.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      onUpdate(note.id, {
        x: initialX + dx,
        y: initialY + dy,
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      upEvent.stopPropagation();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      onUpdateEnd?.();

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Resize logic
  const handlePointerDownResize = (e: React.PointerEvent, corner: 'bottom-right' | 'bottom' | 'right') => {
    if (note.locked) return;
    e.stopPropagation();
    e.preventDefault();

    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';

    const targetEl = e.currentTarget as HTMLElement;
    if (targetEl && targetEl.setPointerCapture) {
      try {
        targetEl.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = note.width;
    const initialHeight = note.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      let newWidth = initialWidth;
      let newHeight = initialHeight;

      if (corner === 'bottom-right' || corner === 'right') {
        newWidth = Math.max(200, initialWidth + dx);
      }
      if (corner === 'bottom-right' || corner === 'bottom') {
        newHeight = Math.max(120, initialHeight + dy);
      }

      onUpdate(note.id, { width: newWidth, height: newHeight });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (targetEl && targetEl.releasePointerCapture) {
        try {
          targetEl.releasePointerCapture(upEvent.pointerId);
        } catch (err) {}
      }

      onUpdateEnd?.();

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleInput = () => {
    if (note.locked) return;
    if (editorRef.current) {
      onUpdate(note.id, {
        content: editorRef.current.innerHTML,
        updatedAt: Date.now(),
      }, true);
      checkForMentionTrigger();
    }
  };

  const checkForMentionTrigger = () => {
    if (note.locked || !editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) {
      setMentionMenu(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setMentionMenu(null);
      return;
    }

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setMentionMenu(null);
      return;
    }

    const text = node.textContent || '';
    const caretOffset = range.startOffset;
    const textBeforeCaret = text.slice(0, caretOffset);

    const matchAt = textBeforeCaret.match(/@([^\s@\[\]]{0,30})$/);
    const matchWiki = textBeforeCaret.match(/\[\[([^\]\n]{0,30})$/);

    const match = matchAt || matchWiki;
    if (!match) {
      setMentionMenu(null);
      return;
    }

    const triggerType: '@' | '[[' = matchAt ? '@' : '[[';
    const searchTerm = match[1] || '';

    const availableNotes = (allNotes || []).filter((other) => {
      if (other.id === note.id || other.hidden) return false;
      const title = (other.title || other.content.replace(/<[^>]+>/g, '')).trim();
      if (!title) return false;
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    }).slice(0, 6);

    if (availableNotes.length === 0) {
      setMentionMenu(null);
      return;
    }

    setMentionMenu({
      visible: true,
      searchTerm,
      triggerType,
      items: availableNotes,
      selectedIndex: 0,
    });
  };

  const applyMentionSelection = (targetNote: Note, triggerType: '@' | '[[', searchTerm: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const caretOffset = range.startOffset;

    const queryLen = triggerType.length + searchTerm.length;
    const triggerStart = caretOffset - queryLen;
    if (triggerStart < 0) return;

    const rawTitle = targetNote.title || targetNote.content.replace(/<[^>]+>/g, '').trim();
    const titleText = rawTitle.slice(0, 35) || 'Нотатка';

    const backlink = document.createElement('a');
    backlink.href = '#';
    backlink.setAttribute('data-note-id', targetNote.id);
    backlink.className = 'note-backlink-chip';
    backlink.contentEditable = 'false';
    backlink.innerHTML = `<span style="opacity:0.6;">@</span><span>${escapeHtml(titleText)}</span>`;

    const replaceRange = document.createRange();
    replaceRange.setStart(node, triggerStart);
    replaceRange.setEnd(node, caretOffset);
    replaceRange.deleteContents();

    replaceRange.insertNode(backlink);

    const space = document.createTextNode('\u00A0');
    if (backlink.nextSibling) {
      backlink.parentNode?.insertBefore(space, backlink.nextSibling);
    } else {
      backlink.parentNode?.appendChild(space);
    }

    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionMenu(null);

    if (editorRef.current) {
      onUpdate(note.id, {
        content: editorRef.current.innerHTML,
        updatedAt: Date.now(),
      }, true);
    }
    onUpdateEnd?.();
  };

  const processRawUrlsInEditor = () => {
    if (!editorRef.current || note.locked) return;
    const currentHtml = editorRef.current.innerHTML;
    if (!currentHtml) return;

    let newHtml = convertTextUrlsToLinkCards(currentHtml);
    newHtml = ensureLinkCardsUpToDate(newHtml);
    if (newHtml !== currentHtml) {
      editorRef.current.innerHTML = newHtml;
      handleInput();
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check if delete link button was clicked
    const deleteBtn = target ? target.closest('[data-action="delete-link"]') : null;
    if (deleteBtn) {
      e.stopPropagation();
      e.preventDefault();
      const linkCard = deleteBtn.closest('.graphical-link-card') || deleteBtn.closest('a');
      if (linkCard) {
        linkCard.remove();
        handleInput();
        onUpdateEnd?.();
      }
      return;
    }

    // Check if clicked link or backlink inside note
    const link = target ? (target.closest('a') as HTMLAnchorElement) : null;
    if (link) {
      const targetNoteId = link.getAttribute('data-note-id');
      if (targetNoteId) {
        e.stopPropagation();
        e.preventDefault();
        onNavigateToNote?.(targetNoteId);
        return;
      }
      if (link.href && link.href !== '#' && !link.href.startsWith('javascript:')) {
        e.stopPropagation();
        e.preventDefault();
        window.open(link.href, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const cb = target as HTMLInputElement;
      if (cb.checked) {
        cb.setAttribute('checked', 'checked');
        const sibling = cb.nextElementSibling as HTMLElement | null;
        if (sibling && (sibling.tagName === 'SPAN' || sibling.tagName === 'DIV')) {
          sibling.style.textDecoration = 'line-through';
          sibling.style.opacity = '0.5';
        }
      } else {
        cb.removeAttribute('checked');
        const sibling = cb.nextElementSibling as HTMLElement | null;
        if (sibling && (sibling.tagName === 'SPAN' || sibling.tagName === 'DIV')) {
          sibling.style.textDecoration = 'none';
          sibling.style.opacity = '1';
        }
      }
      handleInput();
      onUpdateEnd?.();
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (note.locked) return;
    const pasteHtml = e.clipboardData.getData('text/html');
    const pasteText = e.clipboardData.getData('text/plain');

    if (!pasteHtml && !pasteText) return;

    // Case 1: Pure single URL -> convert to graphical link card
    if (pasteText && isUrl(pasteText.trim())) {
      e.preventDefault();
      const linkCardHtml = createLinkCardHtml(pasteText.trim());
      document.execCommand('insertHTML', false, linkCardHtml + '&nbsp;');
      handleInput();
      onUpdateEnd?.();
      return;
    }

    // Case 2: Formatted HTML in clipboard (from webpage, docs, etc.) -> preserve formatting
    if (pasteHtml && pasteHtml.trim().length > 0) {
      e.preventDefault();
      // Clean up metadata/script wrappers from pasted HTML while preserving styling, bold, italic, headings, lists, tables, links
      let cleaned = pasteHtml
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<xml[\s\S]*?<\/xml>/gi, '')
        .replace(/<\/?(?:html|head|body)[^>]*>/gi, '');

      cleaned = convertTextUrlsToLinkCards(cleaned);

      if (cleaned.trim().length > 0) {
        document.execCommand('insertHTML', false, cleaned);
      } else if (pasteText) {
        const formattedText = convertTextUrlsToLinkCards(escapeHtml(pasteText).replace(/\r\n|\r|\n/g, '<br/>'));
        document.execCommand('insertHTML', false, formattedText);
      }
      handleInput();
      onUpdateEnd?.();
      return;
    }

    // Case 3: Plain text with newlines or embedded URLs -> preserve lines & convert URLs
    if (pasteText) {
      e.preventDefault();
      const formattedText = convertTextUrlsToLinkCards(escapeHtml(pasteText).replace(/\r\n|\r|\n/g, '<br/>'));
      document.execCommand('insertHTML', false, formattedText);
      handleInput();
      onUpdateEnd?.();
      return;
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionMenu && mentionMenu.visible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionMenu((prev) => prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.items.length } : null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionMenu((prev) => prev ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.items.length) % prev.items.length } : null);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const selected = mentionMenu.items[mentionMenu.selectedIndex];
        if (selected) {
          applyMentionSelection(selected, mentionMenu.triggerType, mentionMenu.searchTerm);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionMenu(null);
        return;
      }
    }

    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let anchorNode: Node | null = sel.anchorNode;
        if (anchorNode && anchorNode.nodeType === Node.TEXT_NODE) {
          anchorNode = anchorNode.parentNode;
        }
        const currentItem = (anchorNode as HTMLElement)?.closest('div');
        if (currentItem && currentItem.querySelector('input[type="checkbox"]')) {
          e.preventDefault();
          const newItemDiv = document.createElement('div');
          newItemDiv.style.display = 'flex';
          newItemDiv.style.alignItems = 'center';
          newItemDiv.style.gap = '10px';
          newItemDiv.style.marginTop = '6px';
          newItemDiv.style.marginBottom = '6px';

          const cb = document.createElement('input');
          cb.type = 'checkbox';

          const textSpan = document.createElement('span');
          textSpan.style.outline = 'none';

          newItemDiv.appendChild(cb);
          newItemDiv.appendChild(textSpan);

          if (currentItem.nextSibling) {
            currentItem.parentNode?.insertBefore(newItemDiv, currentItem.nextSibling);
          } else {
            currentItem.parentNode?.appendChild(newItemDiv);
          }

          handleInput();

          setTimeout(() => {
            textSpan.focus();
            const newSel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(textSpan);
            if (newSel) {
              newSel.removeAllRanges();
              newSel.addRange(range);
            }
          }, 10);
        }
      }
    }
  };

  const handleChecklistAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!editorRef.current) return;

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

    editorRef.current.appendChild(itemDiv);
    handleInput();
    onUpdateEnd?.();

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 10);
  };

  const removeAttachment = (attId: string) => {
    deleteAttachmentData(attId).catch(() => {});
    const currentAttachments = note.attachments || [];
    onUpdate(note.id, {
      attachments: currentAttachments.filter((a) => a.id !== attId),
    });
    onUpdateEnd?.();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        (window as any).__lastNoteSelectionRange = range.cloneRange();
      }
    }
  };

  const rawContentText = (note.content || '').replace(/<[^>]+>/g, '').trim();
  const isStandaloneFile = rawContentText === '' && note.attachments && note.attachments.length > 0;

  if (isStandaloneFile) {
    const att = note.attachments![0];
    const isImage = att.type.startsWith('image/');
    const isVideo = att.type.startsWith('video/');
    const isAudio = att.type.startsWith('audio/');

    return (
      <div
        ref={cardRef}
        data-note-id={note.id}
        style={{
          transform: `translate(${note.x}px, ${note.y}px)`,
          width: isImage ? `${note.width}px` : `${Math.max(note.width, 260)}px`,
          height: isImage ? `${note.height}px` : 'auto',
          zIndex: isSelected ? 100 : note.zIndex,
        }}
        className={`absolute top-0 left-0 select-none group transition-all duration-150 cursor-grab active:cursor-grabbing ${
          isImage
            ? 'rounded-2xl overflow-hidden border border-stone-300 hover:border-stone-400 bg-[#ede5d8]'
            : 'flex items-center gap-3 p-3 rounded-2xl border border-stone-300 hover:border-stone-400 bg-[#ede5d8] text-stone-900'
        } ${
          isSelected
            ? '!border-emerald-500 ring-2 ring-emerald-500/50'
            : ''
        }`}
        onPointerDown={handlePointerDownHeader}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(note.id);
          onBringToFront(note.id);
        }}
      >
        {isImage ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black/40 group/img">
            {att.url ? <img src={att.url} alt={att.name || ''} className="w-full h-full object-contain pointer-events-none" /> : null}
            
            {/* Hover overlay with pin, title & action buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity p-2 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-1 truncate pr-2">
                  {note.pinned && <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  <span className="text-xs font-medium text-white truncate">{att.name}</span>
                </div>
                <button
                  title="Видалити"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  className="p-1 text-zinc-300 hover:text-rose-400 bg-black rounded-lg pointer-events-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-1 pointer-events-auto">
                <a
                  href={att.url}
                  download={att.name}
                  title="Завантажити"
                  className="p-1.5 text-zinc-200 hover:text-emerald-400 bg-black rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Corner Pin Indicator if pinned */}
            {note.pinned && (
              <div className="absolute top-2 left-2 p-1 bg-black rounded-full">
                <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* File Icon */}
            {isAudio ? (
              <Music className="w-4 h-4 text-stone-600 flex-shrink-0" />
            ) : isVideo ? (
              <Video className="w-4 h-4 text-stone-600 flex-shrink-0" />
            ) : att.type.includes('pdf') || att.type.includes('text') || att.type.includes('document') ? (
              <FileText className="w-4 h-4 text-stone-600 flex-shrink-0" />
            ) : (
              <File className="w-4 h-4 text-stone-600 flex-shrink-0" />
            )}

            {/* File info */}
            <div className="flex flex-col min-w-0 flex-1 pointer-events-none">
              <div className="flex items-center gap-1.5 min-w-0">
                {note.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                <span className="font-semibold text-xs text-stone-800 truncate">{att.name}</span>
              </div>
              <span className="text-[10px] text-stone-500 font-medium mt-0.5">
                {(att.size / 1024).toFixed(1)} KB
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={att.url}
                download={att.name}
                title="Завантажити файл"
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                title="Видалити файл"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Resize Handle (bottom right) */}
        <div
          className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onPointerDown={(e) => handlePointerDownResize(e, 'bottom-right')}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      data-note-id={note.id}
      style={{
        transform: `translate(${note.x}px, ${note.y}px)`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        zIndex: isSelected ? 100 : note.zIndex,
      }}
      className={`absolute top-0 left-0 flex flex-col rounded-2xl border select-none group transition-[border-color,background-color] duration-150 cursor-default ${
        colorStyle.card
      } ${
        isSelected
          ? '!border-stone-800 ring-1 ring-stone-800/30'
          : 'hover:border-stone-400'
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(note.id);
        onBringToFront(note.id);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        e.preventDefault();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.stopPropagation();
        }
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(note.id);
        onBringToFront(note.id);
      }}
    >
      {/* Chrome Top Bar / Drag Handle */}
      <div
        className={`h-6 px-3 flex items-center justify-center rounded-t-2xl cursor-grab active:cursor-grabbing transition-opacity duration-150 relative group/header ${
          colorStyle.header
        } ${isHovered || isSelected ? 'opacity-100' : 'opacity-40'}`}
        onPointerDown={handlePointerDownHeader}
      >
        {note.pinned && (
          <div className="absolute left-3 flex items-center pointer-events-none">
            <Pin className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
          </div>
        )}
        {/* Center Drag Handle */}
        <div className="w-8 h-1 bg-stone-500/40 group-hover/header:bg-stone-800/70 rounded-full transition-colors pointer-events-none" />
      </div>

      {/* Editor Content Area / File Canvas Display */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-3 select-text flex flex-col gap-2 scrollbar-thin h-full justify-start cursor-text"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.stopPropagation();
          }
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
      >
        {(!note.attachments || note.attachments.length === 0 || note.content) && (
          <>
            <div
              ref={editorRef}
              contentEditable={!note.locked}
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handleEditorPaste}
              onBlur={() => {
                isFocusedRef.current = false;
                processRawUrlsInEditor();
                handleInput();
                onUpdateEnd?.();
              }}
              onClick={handleEditorClick}
              onMouseUp={saveSelection}
              onKeyUp={(e) => {
                saveSelection();
                if (e.key === ' ' || e.key === 'Enter') {
                  processRawUrlsInEditor();
                }
              }}
              onSelect={saveSelection}
              onFocus={() => {
                isFocusedRef.current = true;
                saveSelection();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onDragStart={(e) => {
                e.preventDefault();
              }}
              onKeyDown={handleEditorKeyDown}
              className={`outline-none min-h-[60px] w-full break-words text-slate-800 cursor-text select-text ${
                FONT_CLASSES[note.fontFamily]
              } ${FONT_SIZE_CLASSES[note.fontSize]}`}
              style={{ 
                textAlign: note.textAlign,
                fontFamily: FONT_FAMILY_STYLES[note.fontFamily] || FONT_FAMILY_STYLES.sans
              }}
              data-placeholder="Введіть текст..."
            />
            {hasCheckboxes && !note.locked && (
              <button
                type="button"
                onClick={handleChecklistAdd}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Додати пункт"
                className="mt-1.5 flex items-center justify-center p-1.5 text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-full transition-colors cursor-pointer self-start shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Attachments Display */}
        {note.attachments && note.attachments.length > 0 && (
          <div className={`${note.content ? 'mt-2 pt-2 border-t border-black/5 flex flex-wrap gap-2' : 'flex flex-col gap-2 h-full justify-center'}`}>
            {note.attachments.map((att) => {
              const isStandalone = !note.content;

              if (isStandalone && att.type.startsWith('image/')) {
                return (
                  <div key={att.id} className="relative w-full h-full flex flex-col items-center justify-center group/att">
                    {att.url ? (
                      <img
                        src={att.url}
                        alt={att.name || ''}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                      />
                    ) : null}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/att:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-lg">
                      {att.url ? (
                        <a
                          href={att.url}
                          download={att.name}
                          title="Download image"
                          className="p-1 text-white hover:text-emerald-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      ) : null}
                      <button
                        title="Remove file"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(att.id);
                        }}
                        className="p-1 text-white hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (isStandalone && att.type.startsWith('video/')) {
                return (
                  <div key={att.id} className="relative w-full flex flex-col gap-1 group/att">
                    {att.url ? <video controls src={att.url} className="w-full max-h-[170px] rounded-xl object-contain bg-black/40" /> : null}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="truncate font-medium text-stone-800">{att.name}</span>
                      <button
                        title="Remove file"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(att.id);
                        }}
                        className="text-stone-500 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (isStandalone && att.type.startsWith('audio/')) {
                return (
                  <div key={att.id} className="flex flex-col gap-1.5 p-2 bg-stone-200/60 border border-stone-300 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className="w-4 h-4 text-stone-600 flex-shrink-0" />
                        <span className="text-xs font-semibold truncate text-stone-800">{att.name}</span>
                      </div>
                      <button
                        title="Remove file"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(att.id);
                        }}
                        className="text-stone-500 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {att.url ? <audio controls src={att.url} className="w-full h-8" /> : null}
                  </div>
                );
              }

              return (
                <div
                  key={att.id}
                  className="group/att relative flex items-center gap-2 p-2 bg-stone-200/60 border border-stone-300 hover:border-stone-400 rounded-xl text-xs max-w-full overflow-hidden transition-colors"
                >
                  {att.type.startsWith('image/') && att.url ? (
                    <img
                      src={att.url}
                      alt={att.name || ''}
                      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : att.type.startsWith('audio/') ? (
                    <Music className="w-4 h-4 text-stone-600 flex-shrink-0" />
                  ) : att.type.startsWith('video/') ? (
                    <Video className="w-4 h-4 text-stone-600 flex-shrink-0" />
                  ) : att.type.includes('pdf') || att.type.includes('text') || att.type.includes('document') ? (
                    <FileText className="w-4 h-4 text-stone-600 flex-shrink-0" />
                  ) : (
                    <File className="w-4 h-4 text-stone-600 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate text-stone-800">{att.name}</span>
                    <span className="text-[10px] text-stone-500">
                      {(att.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <a
                    href={att.url}
                    download={att.name}
                    title="Download file"
                    className="p-1 text-stone-500 hover:text-stone-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    title="Remove attachment"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(att.id);
                    }}
                    className="p-1 text-stone-500 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resize handle bottom right */}
      <div
        className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
        onPointerDown={(e) => handlePointerDownResize(e, 'bottom-right')}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-slate-400/60" />
      </div>

      {/* Mention Completion Popover (@ or [[) */}
      {mentionMenu && mentionMenu.visible && (
        <div className="absolute bottom-12 left-3 right-3 z-50 bg-zinc-900/95 backdrop-blur-md text-zinc-200 border border-white/10 rounded-2xl shadow-xl p-1.5 select-none pointer-events-auto">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
            <span>Посилання на нотатку ({mentionMenu.triggerType})</span>
            <span className="text-[9px] text-zinc-500 font-normal">↑↓ навігація, Enter вибір</span>
          </div>
          <div className="max-h-36 overflow-y-auto scrollbar-thin flex flex-col gap-0.5">
            {mentionMenu.items.map((item, idx) => {
              const itemTitle = (item.title || item.content.replace(/<[^>]+>/g, '')).trim().slice(0, 40) || 'Без назви';
              const isSelectedIdx = idx === mentionMenu.selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyMentionSelection(item, mentionMenu.triggerType, mentionMenu.searchTerm);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-full text-xs flex items-center gap-2 transition-colors ${
                    isSelectedIdx
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                    @
                  </span>
                  <span className="truncate flex-1">{itemTitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
