import { NoteColor } from '../types';

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: NoteColor;
  width: number;
  height: number;
  content: string;
  isCustom?: boolean;
}

// Built-in templates library
export const BUILT_IN_TEMPLATES: NoteTemplate[] = [
  {
    id: 'planner',
    name: 'Планувальник дня',
    description: 'Щоденний план із розкладом та пріоритетними завданнями',
    icon: 'Calendar',
    color: 'slate',
    width: 320,
    height: 280,
    content: `
      <div class="font-bold text-base mb-2 border-b border-black/10 pb-1">План на день</div>
      <div class="text-xs text-zinc-500 mb-3 font-medium">Пріоритети & Завдання</div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span class="font-medium">Головне завдання дня</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Другорядне завдання 1</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Другорядне завдання 2</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Зателефонувати / Написати</span></div>
    `.trim(),
  },
  {
    id: 'todo',
    name: 'Список справ (To-Do)',
    description: 'Чеклист завданий із відмітками про виконання',
    icon: 'CheckSquare',
    color: 'white',
    width: 300,
    height: 250,
    content: `
      <div class="font-bold text-base mb-3 flex items-center justify-between">
        <span>Список завдань</span>
      </div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Підготувати матеріали</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Перевірити деталі</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Відправити звіт</span></div>
      <div class="flex items-center gap-2 mb-2"><input type="checkbox" /><span>Підсумувати результати</span></div>
    `.trim(),
  },
  {
    id: 'kanban',
    name: 'Канбан-дошка',
    description: 'Колонки статусів: До виконання, В роботі, Готово',
    icon: 'Columns',
    color: 'sky',
    width: 480,
    height: 280,
    content: `
      <div class="font-bold text-base mb-3">Канбан статус</div>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="p-2 bg-black/5 rounded-xl">
          <div class="font-bold mb-2 text-zinc-700">До виконання</div>
          <div class="p-1.5 bg-white/80 rounded-lg shadow-xs mb-1.5">Ідея А</div>
          <div class="p-1.5 bg-white/80 rounded-lg shadow-xs">Ідея Б</div>
        </div>
        <div class="p-2 bg-black/5 rounded-xl">
          <div class="font-bold mb-2 text-zinc-700">В роботі</div>
          <div class="p-1.5 bg-white/80 rounded-lg shadow-xs mb-1.5">Дизайн UI</div>
        </div>
        <div class="p-2 bg-black/5 rounded-xl">
          <div class="font-bold mb-2 text-zinc-700">Готово</div>
          <div class="p-1.5 bg-white/80 rounded-lg shadow-xs opacity-70 line-through">Аналіз ринку</div>
        </div>
      </div>
    `.trim(),
  },
  {
    id: 'quote',
    name: 'Цитата / Думка',
    description: 'Виділена цитата або важлива думка з джерелом',
    icon: 'Quote',
    color: 'cream',
    width: 320,
    height: 200,
    content: `
      <div class="pl-3 border-l-2 border-amber-600/60 my-1 italic text-sm text-zinc-800">
        "Простота — це необхідна передумова надійності."
      </div>
      <div class="text-right text-xs text-zinc-500 font-medium mt-3">— Едсгер Дейкстра</div>
    `.trim(),
  },
  {
    id: 'code',
    name: 'Код-сніпет',
    description: 'Блок для збереження фрагментів коду чи команд',
    icon: 'Code',
    color: 'slate',
    width: 360,
    height: 240,
    content: `
      <div class="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
        <span>TypeScript / JavaScript</span>
      </div>
      <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed"><code>function calculateTotal(items: number[]): number {
  return items.reduce((acc, curr) => acc + curr, 0);
}</code></pre>
    `.trim(),
  },
  {
    id: 'swot',
    name: 'SWOT-аналіз',
    description: 'Матриця: Сильні сторони, Слабкі сторони, Можливості, Загрози',
    icon: 'Grid',
    color: 'sage',
    width: 420,
    height: 300,
    content: `
      <div class="font-bold text-base mb-2">SWOT Аналіз</div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2 bg-emerald-100/50 rounded-xl border border-emerald-200/50">
          <div class="font-bold text-emerald-900 mb-1">S - Strong</div>
          <div>• Висока швидкість</div>
        </div>
        <div class="p-2 bg-rose-100/50 rounded-xl border border-rose-200/50">
          <div class="font-bold text-rose-900 mb-1">W - Weakness</div>
          <div>• Обмежений бюджет</div>
        </div>
        <div class="p-2 bg-sky-100/50 rounded-xl border border-sky-200/50">
          <div class="font-bold text-sky-900 mb-1">O - Opportunity</div>
          <div>• Новий ринок</div>
        </div>
        <div class="p-2 bg-amber-100/50 rounded-xl border border-amber-200/50">
          <div class="font-bold text-amber-900 mb-1">T - Threat</div>
          <div>• Конкуренція</div>
        </div>
      </div>
    `.trim(),
  },
];

// Helper functions for custom templates saved in localStorage
const STORAGE_KEY = 'infinite_notepad_custom_templates';

export function getCustomTemplates(): NoteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load custom templates:', e);
  }
  return [];
}

export function saveCustomTemplate(name: string, description: string, content: string, color: NoteTemplate['color'] = 'white'): NoteTemplate {
  const newTemplate: NoteTemplate = {
    id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    name: name.trim() || 'Власний шаблон',
    description: description.trim() || 'Збережена нотатка як шаблон',
    icon: 'FileText',
    color,
    width: 320,
    height: 250,
    content,
    isCustom: true,
  };

  const existing = getCustomTemplates();
  const updated = [newTemplate, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom template:', e);
  }
  return newTemplate;
}

export function deleteCustomTemplate(id: string): void {
  const existing = getCustomTemplates();
  const updated = existing.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom template:', e);
  }
}
