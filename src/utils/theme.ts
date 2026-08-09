import { NoteColor, FontFamily, FontSize } from '../types';

export const NOTE_COLOR_CLASSES: Record<NoteColor, {
  card: string;
  header: string;
  accent: string;
  dot: string;
}> = {
  white: {
    card: 'bg-[#ede5d8] border-stone-300 text-stone-900',
    header: '',
    accent: '#3f3f46',
    dot: 'bg-stone-600',
  },
  cream: {
    card: 'bg-[#edd3b6] border-[#cbb092] text-[#3c220f]',
    header: '',
    accent: '#b45309',
    dot: 'bg-amber-800',
  },
  sage: {
    card: 'bg-[#cedbd2] border-[#9cb3a4] text-[#162e21]',
    header: '',
    accent: '#047857',
    dot: 'bg-emerald-800',
  },
  sky: {
    card: 'bg-[#cad8e6] border-[#93abbf] text-[#0d233a]',
    header: '',
    accent: '#1d4ed8',
    dot: 'bg-blue-800',
  },
  rose: {
    card: 'bg-[#ebd3cb] border-[#d1a89c] text-[#441810]',
    header: '',
    accent: '#b91c1c',
    dot: 'bg-red-800',
  },
  lavender: {
    card: 'bg-[#d3d7eb] border-[#a3a9d4] text-[#191c45]',
    header: '',
    accent: '#4338ca',
    dot: 'bg-indigo-800',
  },
  slate: {
    card: 'bg-[#cbcfd5] border-[#959ca7] text-[#15191f]',
    header: '',
    accent: '#334155',
    dot: 'bg-slate-700',
  },
};

export const FONT_FAMILY_STYLES: Record<FontFamily, string> = {
  sans: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  serif: "'Playfair Display', Georgia, serif",
  mono: "'Fira Code', ui-monospace, monospace",
};

export const FONT_CLASSES: Record<FontFamily, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  sm: 'text-xs leading-relaxed',
  base: 'text-sm leading-relaxed',
  lg: 'text-base leading-relaxed',
  xl: 'text-lg leading-relaxed',
};

export const COLOR_PALETTE_ITEMS: { color: NoteColor; label: string; bg: string; swatch: string }[] = [
  { color: 'white', label: 'Базовий пергамент (Parchment)', bg: 'bg-[#ede5d8] border border-stone-300', swatch: 'bg-white border border-stone-400' },
  { color: 'cream', label: 'Піщаний охристий (Warm Sand)', bg: 'bg-[#edd3b6] border border-[#cbb092]', swatch: 'bg-[#f0d2b2] border border-[#cbb092]' },
  { color: 'sage', label: 'Оливковий гай (Tactical Sage)', bg: 'bg-[#cedbd2] border border-[#9cb3a4]', swatch: 'bg-[#a1c4ad] border border-[#83a891]' },
  { color: 'sky', label: 'Сталевий шторм (Steel Blue)', bg: 'bg-[#cad8e6] border border-[#93abbf]', swatch: 'bg-[#9bb2cd] border border-[#7e9bbd]' },
  { color: 'rose', label: 'Теракотовий цегляний (Burnt Terracotta)', bg: 'bg-[#ebd3cb] border border-[#d1a89c]', swatch: 'bg-[#e2b1a3] border border-[#ce9282]' },
  { color: 'lavender', label: 'Кобальтовий лавандовий (Lavender)', bg: 'bg-[#d3d7eb] border border-[#a3a9d4]', swatch: 'bg-[#aeb4dd] border border-[#9198cc]' },
  { color: 'slate', label: 'Графіт (Graphite)', bg: 'bg-[#cbcfd5] border border-[#959ca7]', swatch: 'bg-[#a3abb8] border border-[#8691a1]' },
];
