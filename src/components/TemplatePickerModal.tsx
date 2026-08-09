import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Plus, Calendar, CheckSquare, Columns, Quote, Code, Grid, 
  Trash2, BookmarkPlus, FileText, LayoutTemplate
} from 'lucide-react';
import { NoteTemplate, BUILT_IN_TEMPLATES, getCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from '../utils/templates';
import { Note } from '../types';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  selectedNoteToSave?: Note | null;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  selectedNoteToSave,
}) => {
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom' | 'save'>('builtin');
  const [customTemplates, setCustomTemplates] = useState<NoteTemplate[]>(() => getCustomTemplates());
  
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  if (!isOpen) return null;

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteToSave || !customName.trim()) return;

    saveCustomTemplate(
      customName,
      customDesc || 'Власний шаблон користувача',
      selectedNoteToSave.content,
      selectedNoteToSave.color
    );

    setCustomTemplates(getCustomTemplates());
    setCustomName('');
    setCustomDesc('');
    setActiveTab('custom');
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomTemplate(id);
    setCustomTemplates(getCustomTemplates());
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calendar': return <Calendar className="w-4 h-4" />;
      case 'CheckSquare': return <CheckSquare className="w-4 h-4" />;
      case 'Columns': return <Columns className="w-4 h-4" />;
      case 'Quote': return <Quote className="w-4 h-4" />;
      case 'Code': return <Code className="w-4 h-4" />;
      case 'Grid': return <Grid className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#ede5d8] border border-stone-300 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] text-stone-900"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LayoutTemplate className="w-4 h-4 text-stone-700" />
            <h2 className="text-base font-semibold text-stone-900">Бібліотека шаблонів</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-6 pb-2 flex gap-2">
          <button
            onClick={() => setActiveTab('builtin')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'builtin'
                ? 'bg-stone-900 text-stone-100 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Вбудовані</span>
            <span className="text-[11px] opacity-70">
              ({BUILT_IN_TEMPLATES.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-stone-900 text-stone-100 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Мої шаблони</span>
            <span className="text-[11px] opacity-70">
              ({customTemplates.length})
            </span>
          </button>

          {selectedNoteToSave && (
            <button
              onClick={() => setActiveTab('save')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'save'
                  ? 'bg-stone-900 text-stone-100 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Зберегти виділену</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          {activeTab === 'builtin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {BUILT_IN_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    onSelectTemplate(tmpl);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl bg-stone-200/40 text-left transition-all hover:bg-stone-200/80 group cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-stone-700 group-hover:text-stone-900 shrink-0">
                      {getTemplateIcon(tmpl.icon)}
                    </div>
                    <span className="font-medium text-sm text-stone-900 truncate">{tmpl.name}</span>
                  </div>
                  <Plus className="w-4 h-4 text-stone-500 group-hover:text-stone-900 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <div>
              {customTemplates.length === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  <BookmarkPlus className="w-6 h-6 mx-auto mb-2 text-stone-400" />
                  <p className="text-xs font-medium text-stone-700">Немає збережених шаблонів</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {customTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        onSelectTemplate(tmpl);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl bg-stone-200/40 text-left transition-all hover:bg-stone-200/80 group cursor-pointer relative flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-stone-700 group-hover:text-stone-900 shrink-0" />
                        <span className="font-medium text-sm text-stone-900 truncate">{tmpl.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleDeleteCustom(tmpl.id, e)}
                          title="Видалити"
                          className="p-1 rounded-full text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Plus className="w-4 h-4 text-stone-500 group-hover:text-stone-900 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'save' && selectedNoteToSave && (
            <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-3 max-w-md mx-auto py-1">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Назва шаблону
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Назва"
                  className="w-full px-4 py-2.5 rounded-full bg-stone-200/70 border border-stone-300 text-stone-900 placeholder-stone-500 text-sm focus:outline-none focus:border-stone-500"
                />
              </div>

              <div className="p-3 bg-stone-200/50 rounded-2xl">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Прев'ю:</div>
                <div 
                  className="text-xs text-stone-700 line-clamp-2 font-mono opacity-80"
                  dangerouslySetInnerHTML={{ __html: selectedNoteToSave.content || 'Порожня нотатка' }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-stone-900 text-stone-100 font-semibold text-sm hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Зберегти</span>
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

