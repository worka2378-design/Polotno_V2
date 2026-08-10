import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MousePointer2, Plus, Highlighter, 
  Undo2, Redo2, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Layers, List, ListOrdered, CheckSquare, Palette, Type
} from 'lucide-react';
import { NoteColor, FontFamily, FontSize, TextAlign } from '../types';
import { FONT_FAMILY_STYLES } from '../utils/theme';

const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Жовтий маркер' },
  { color: '#a7f3d0', label: 'Зелений маркер' },
  { color: '#bae6fd', label: 'Блакитний маркер' },
  { color: '#fbcfe8', label: 'Рожевий маркер' },
  { color: '#e9d5ff', label: 'Бузковий маркер' },
  { color: '#fed7aa', label: 'Помаранчевий маркер' },
];

const TEXT_COLORS = [
  { color: '#18181b', label: 'Темний текст' },
  { color: '#ffffff', label: 'Білий текст' },
  { color: '#ef4444', label: 'Червоний текст' },
  { color: '#3b82f6', label: 'Синій текст' },
  { color: '#10b981', label: 'Смарагдовий текст' },
  { color: '#f59e0b', label: 'Янтарний текст' },
  { color: '#a855f7', label: 'Фіолетовий текст' },
];

interface ToolbarProps {
  onAddNote: () => void;
  onOpenTemplatePicker?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Selected Note Formatting Props
  selectedNoteId: string | null;
  onFormatNote: (command: string, value?: string) => void;
  onUpdateNoteProps: (updates: {
    fontFamily?: FontFamily;
    fontSize?: FontSize;
    textAlign?: TextAlign;
    color?: NoteColor;
  }) => void;
  activeNoteFont?: FontFamily;
  activeNoteSize?: FontSize;
  activeNoteAlign?: TextAlign;
  // Zoom Controls
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit?: () => void;
  onOpenSearch?: () => void;
  // Layers Panel
  showLayersPanel: boolean;
  setShowLayersPanel: (v: boolean) => void;
  activePanelTab?: 'layers' | 'links' | 'files' | 'search' | 'ai';
  onChangePanelTab?: (tab: 'layers' | 'links' | 'files' | 'search' | 'ai') => void;
}

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onAddNote,
  onOpenTemplatePicker,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedNoteId,
  onFormatNote,
  onUpdateNoteProps,
  activeNoteFont = 'sans',
  activeNoteSize = 'base',
  activeNoteAlign = 'left',
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onOpenSearch,
  showLayersPanel,
  setShowLayersPanel,
  activePanelTab = 'layers',
  onChangePanelTab,
}) => {
  const [showHighlightPicker, setShowHighlightPicker] = React.useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = React.useState<string>('#fef08a');
  const [listType, setListType] = React.useState<'none' | 'bullet' | 'number'>('none');

  React.useEffect(() => {
    setShowHighlightPicker(false);
  }, [selectedNoteId]);

  React.useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-picker-container="true"]')) {
        setShowHighlightPicker(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, []);

  // Track active list state from document selection
  React.useEffect(() => {
    const updateListType = () => {
      try {
        if (document.queryCommandState('insertUnorderedList')) {
          setListType('bullet');
        } else if (document.queryCommandState('insertOrderedList')) {
          setListType('number');
        } else {
          setListType('none');
        }
      } catch {
        setListType('none');
      }
    };

    document.addEventListener('selectionchange', updateListType);
    return () => document.removeEventListener('selectionchange', updateListType);
  }, []);

  // Cycle font family: sans -> serif -> mono -> sans
  const handleCycleFont = () => {
    const fontList: FontFamily[] = ['sans', 'serif', 'mono'];
    const idx = (fontList as string[]).indexOf(activeNoteFont || 'sans');
    const nextFont = fontList[(idx + 1) % fontList.length];
    onUpdateNoteProps({ fontFamily: nextFont });
  };

  // Cycle font size: sm -> base -> lg -> xl -> sm
  const handleCycleFontSize = () => {
    const sizeList: FontSize[] = ['sm', 'base', 'lg', 'xl'];
    const idx = (sizeList as string[]).indexOf(activeNoteSize || 'base');
    const nextSize = sizeList[(idx + 1) % sizeList.length];
    onUpdateNoteProps({ fontSize: nextSize });
  };

  // Cycle text align: left -> center -> right -> justify -> left
  const handleCycleAlign = () => {
    const alignList: TextAlign[] = ['left', 'center', 'right', 'justify'];
    const idx = (alignList as string[]).indexOf(activeNoteAlign || 'left');
    const nextAlign = alignList[(idx + 1) % alignList.length];
    onUpdateNoteProps({ textAlign: nextAlign });
  };

  // Render align icon
  const renderAlignIcon = () => {
    switch (activeNoteAlign) {
      case 'center':
        return <AlignCenter className="w-4 h-4" />;
      case 'right':
        return <AlignRight className="w-4 h-4" />;
      case 'justify':
        return <AlignJustify className="w-4 h-4" />;
      case 'left':
      default:
        return <AlignLeft className="w-4 h-4" />;
    }
  };

  const sizeLabel = activeNoteSize === 'sm' ? 'S' : activeNoteSize === 'base' ? 'M' : activeNoteSize === 'lg' ? 'L' : 'XL';

  return (
    <div className="fixed bottom-4 md:bottom-6 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 select-none flex justify-center">
      <motion.div 
        layout
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className="px-3.5 py-2 bg-[#ede5d8] border border-[#c9c9c9] rounded-full flex items-center gap-1.5 transition-all max-w-full overflow-visible shadow-2xl"
      >
        {/* Select & Pan Tool */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          title="Виділення та панорамування"
          className="p-2 rounded-full transition-all text-stone-900 font-bold"
        >
          <MousePointer2 className="w-4 h-4" />
        </motion.button>

        {/* Add Note Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          title="Створити нотатку (Create Note)"
          onClick={() => {
            onAddNote();
          }}
          className="p-2 rounded-full text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </motion.button>

        {/* CONTEXTUAL TEXT FORMATTING PANEL (Expands inline when note is selected) */}
        <AnimatePresence mode="popLayout">
          {selectedNoteId && (
            <motion.div
              key="contextual-formatting"
              initial={{ opacity: 0, scale: 0.9, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, width: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="flex items-center gap-1.5 overflow-visible pl-1"
            >
              {/* SINGLE FONT FAMILY CYCLE BUTTON (Sans -> Serif -> Mono) */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title={`Переключити шрифт: ${
                  activeNoteFont === 'serif' ? 'Serif (Playfair)' : activeNoteFont === 'mono' ? 'Monospace (Fira Code)' : 'Sans-Serif (Plus Jakarta)'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCycleFont}
                className="px-2 py-1 rounded-full text-xs font-bold text-stone-600 hover:text-stone-900 transition-all flex items-center justify-center flex-shrink-0"
              >
                <span style={{ fontFamily: FONT_FAMILY_STYLES[activeNoteFont || 'sans'] }}>
                  {activeNoteFont === 'serif' ? 'Gg' : activeNoteFont === 'mono' ? 'Mm' : 'Aa'}
                </span>
              </motion.button>

              {/* FONT SIZE CYCLE */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Cycle Font Size (S -> M -> L -> XL)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCycleFontSize}
                className="px-2 py-1 rounded-full text-xs font-mono font-bold text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                {sizeLabel}
              </motion.button>

              {/* BOLD */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Bold"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormatNote('bold')}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                <Bold className="w-4 h-4" />
              </motion.button>

              {/* ITALIC */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Italic"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormatNote('italic')}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                <Italic className="w-4 h-4" />
              </motion.button>

              {/* UNDERLINE */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Underline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormatNote('underline')}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                <Underline className="w-4 h-4" />
              </motion.button>

              {/* SINGLE DYNAMIC LIST TOGGLE BUTTON (Bullets -> Numbers -> Off) */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title={
                  listType === 'bullet'
                    ? 'Маркований список (Натисніть для нумерованого)'
                    : listType === 'number'
                    ? 'Нумерований список (Натисніть щоб вимкнути)'
                    : 'Перемикач списку (Маркований -> Нумерований -> Без списку)'
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onFormatNote('toggleList');
                  setListType((prev) => {
                    if (prev === 'none') return 'bullet';
                    if (prev === 'bullet') return 'number';
                    return 'none';
                  });
                }}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                {listType === 'number' ? (
                  <ListOrdered className="w-4 h-4" />
                ) : (
                  <List className="w-4 h-4" />
                )}
              </motion.button>

              {/* CHECKLIST ITEM BUTTON */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Додати пункт з чекбоксом (Checklist item)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormatNote('insertChecklist')}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                <CheckSquare className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Cycle Text Alignment"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCycleAlign}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-all flex-shrink-0"
              >
                {renderAlignIcon()}
              </motion.button>

              {/* TEXT HIGHLIGHT & FONT COLOR PALETTE */}
              <div data-picker-container="true" className="relative flex items-center justify-center flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  title="Палітра кольорів (маркер та колір тексту)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                  className="p-1.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 text-stone-600 hover:text-stone-900 relative"
                >
                  <Palette className="w-4 h-4" />
                  {activeHighlightColor !== 'transparent' && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full"
                      style={{ backgroundColor: activeHighlightColor }}
                    />
                  )}
                </motion.button>

                <AnimatePresence>
                  {showHighlightPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: -12, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 p-2.5 bg-[#ede5d8] rounded-2xl border border-[#c9c9c9] flex flex-col gap-2 shadow-xl w-max"
                    >
                      {/* Section 1: Маркер виділення */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div title="Маркер виділення" className="text-stone-500 shrink-0 flex items-center justify-center">
                          <Highlighter className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Без кольору (скинути виділення) */}
                          <button
                            title="Без маркування (скинути)"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              onFormatNote('hiliteColor', 'transparent');
                              setActiveHighlightColor('transparent');
                              setShowHighlightPicker(false);
                            }}
                            className={`w-5 h-5 rounded-full bg-stone-300 hover:scale-125 transition-all flex items-center justify-center relative overflow-hidden shrink-0 ${
                              activeHighlightColor === 'transparent' ? 'ring-2 ring-stone-900' : ''
                            }`}
                          >
                            <div className="w-full h-0.5 bg-rose-500 rotate-45" />
                          </button>

                          {HIGHLIGHT_COLORS.map((item) => (
                            <button
                              key={item.color}
                              title={item.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                onFormatNote('hiliteColor', item.color);
                                setActiveHighlightColor(item.color);
                                setShowHighlightPicker(false);
                              }}
                              className={`w-5 h-5 rounded-full transition-all hover:scale-125 shadow-xs cursor-pointer shrink-0 ${
                                activeHighlightColor === item.color ? 'ring-2 ring-stone-900' : ''
                              }`}
                              style={{ backgroundColor: item.color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Колір шрифту */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div title="Колір шрифту" className="text-stone-500 shrink-0 flex items-center justify-center">
                          <Type className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {TEXT_COLORS.map((item) => (
                            <button
                              key={item.color}
                              title={item.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                onFormatNote('foreColor', item.color);
                                setShowHighlightPicker(false);
                              }}
                              className="w-5 h-5 rounded-full transition-all hover:scale-125 shadow-xs cursor-pointer border border-stone-300/50 shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              {/* UNDO */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Undo"
                disabled={!canUndo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onUndo}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 disabled:opacity-20 transition-all flex-shrink-0"
              >
                <Undo2 className="w-4 h-4" />
              </motion.button>

              {/* REDO */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                title="Redo"
                disabled={!canRedo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onRedo}
                className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 disabled:opacity-20 transition-all flex-shrink-0"
              >
                <Redo2 className="w-4 h-4" />
              </motion.button>

            </motion.div>
          )}
        </AnimatePresence>

        {/* LAYERS PANEL TOGGLE BUTTON */}
        <div className="flex items-center gap-1">
          <motion.button
            data-layers-toggle="true"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            title="Панель шарів, посилань, файлів та пошуку"
            onClick={() => setShowLayersPanel(!showLayersPanel)}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              showLayersPanel
                ? 'text-stone-900 font-bold bg-stone-300/50' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
});
