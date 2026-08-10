/**
 * Utility functions for automatic tag extraction from note content and titles,
 * as well as tag normalization and keyword identification.
 */

// Common Ukrainian stop words to ignore when extracting key words
const UKRAINIAN_STOP_WORDS = new Set([
  'і', 'та', 'в', 'на', 'що', 'це', 'з', 'для', 'як', 'про', 'до', 'по', 'за', 'чи', 'або',
  'але', 'від', 'у', 'не', 'так', 'мене', 'вас', 'нас', 'всі', 'все', 'тільки', 'ще', 'вже',
  'після', 'був', 'була', 'було', 'були', 'щоб', 'лише', 'один', 'одна', 'двох', 'трьох',
  'який', 'яка', 'яке', 'які', 'цього', 'цих', 'цим', 'тому', 'буде', 'будуть', 'коли',
  'тут', 'там', 'де', 'куди', 'звідки', 'через', 'при', 'під', 'над', 'перед', 'поза',
  'без', 'біля', 'коло', 'посеред', 'заради', 'буть', 'будь', 'дуже', 'багато', 'мало',
  'можна', 'треба', 'потрібно', 'варто', 'новий', 'нова', 'нове', 'нові', 'без', 'інші',
  'інший', 'інша', 'інше', 'свій', 'своя', 'своє', 'свої', 'моє', 'мій', 'моя', 'мої'
]);

// Common English stop words
const ENGLISH_STOP_WORDS = new Set([
  'the', 'and', 'is', 'in', 'at', 'of', 'to', 'a', 'an', 'for', 'with', 'on', 'by', 'this',
  'that', 'it', 'from', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'but', 'not', 'or', 'if', 'will', 'would', 'should', 'can', 'could',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'too', 'very', 'just', 'note', 'text', 'file', 'task'
]);

/**
 * Strips HTML tags and decodes basic entities to produce clean text.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts hashtags (e.g. #ідея #дизайн) and top keywords from note title and content.
 */
export function extractKeywordsAndHashtags(content: string, title?: string): string[] {
  const fullText = `${title || ''} ${stripHtml(content || '')}`;
  if (!fullText.trim()) return [];

  const extractedTags: string[] = [];
  const seenLowercase = new Set<string>();

  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9а-яА-ЯєєііїїґҐ_]/g, '');
    if (clean.length >= 2 && clean.length <= 25) {
      const lower = clean.toLowerCase();
      if (!seenLowercase.has(lower)) {
        seenLowercase.add(lower);
        extractedTags.push(lower);
      }
    }
  };

  // 1. Extract explicit hashtags (#hashtag)
  const hashtagMatches = fullText.match(/#[a-zA-Z0-9а-яА-ЯєєііїїґҐ_]{2,25}/g);
  if (hashtagMatches) {
    hashtagMatches.forEach((ht) => addTag(ht));
  }

  // 2. Tokenize text to find key words/nouns
  // Remove punctuation except letters and numbers
  const sanitizedText = fullText
    .replace(/#[a-zA-Z0-9а-яА-ЯєєііїїґҐ_]+/g, ' ') // Remove hashtags already processed
    .replace(/https?:\/\/\S+/g, ' ') // Remove URLs
    .replace(/[^a-zA-Z0-9а-яА-ЯєєііїїґҐ\s_]/g, ' ');

  const words = sanitizedText.split(/\s+/);
  const wordFreq = new Map<string, { display: string; count: number }>();

  words.forEach((w) => {
    const clean = w.trim();
    if (clean.length < 3) return; // ignore very short words
    const lower = clean.toLowerCase();

    if (UKRAINIAN_STOP_WORDS.has(lower) || ENGLISH_STOP_WORDS.has(lower)) {
      return; // ignore stop words
    }

    if (/^\d+$/.test(lower)) return; // ignore pure numbers

    const entry = wordFreq.get(lower);
    if (entry) {
      entry.count += 1;
    } else {
      wordFreq.set(lower, { display: clean, count: 1 });
    }
  });

  // Sort words by frequency & length
  const sortedWords = Array.from(wordFreq.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.display.length - a.display.length;
  });

  // Take top 4 keywords
  const topKeywords = sortedWords.slice(0, 4);
  topKeywords.forEach((kw) => addTag(kw.display));

  return extractedTags.slice(0, 6); // Max 6 tags auto-generated
}

/**
 * Merges newly extracted auto tags with existing note tags without duplicates.
 */
export function generateAutoTagsForNote(
  content: string,
  title?: string,
  existingTags: string[] = []
): string[] {
  const autoExtracted = extractKeywordsAndHashtags(content, title);
  const merged = new Set<string>();

  existingTags.forEach((t) => {
    const clean = t.trim().toLowerCase();
    if (clean) merged.add(clean);
  });

  autoExtracted.forEach((t) => {
    merged.add(t);
  });

  return Array.from(merged);
}
