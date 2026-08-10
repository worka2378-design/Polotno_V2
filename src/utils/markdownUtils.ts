/**
 * Utility to convert Markdown text into formatted HTML for notes and canvas elements.
 */

export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let text = markdown.trim();

  // Store and replace code blocks first to protect code content
  const codeBlocks: string[] = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const index = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapedCode.trim()}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });

  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      resultLines.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      resultLines.push('</ol>');
      inOl = false;
    }
  };

  const parseInline = (lineStr: string): string => {
    let s = lineStr;

    // Restore code blocks
    s = s.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || '');

    // Bold + Italic: ***text*** or ___text___
    s = s.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');
    // Bold: **text** or __text__
    s = s.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    // Italic: *text* or _text_ (ensure not inside HTML tags or URLs)
    s = s.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
    s = s.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');
    // Strikethrough: ~~text~~
    s = s.replace(/~~(.*?)~~/g, '<del>$1</del>');
    // Inline code: `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Markdown links: [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-stone-800 underline">$1</a>');

    return s;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Placeholder line for code block
    if (line.includes('__CODE_BLOCK_')) {
      closeLists();
      resultLines.push(parseInline(line));
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeLists();
      resultLines.push('<br />');
      continue;
    }

    // Already HTML block element
    if (/^<(p|div|ul|ol|li|h[1-6]|blockquote|hr|pre|table|thead|tbody|tr|td|th)[\s>]/i.test(trimmed)) {
      closeLists();
      resultLines.push(parseInline(line));
      continue;
    }

    // Horizontal Rule: ---, ***, ___
    if (/^(---|[*]{3}|_{3})$/.test(trimmed)) {
      closeLists();
      resultLines.push('<hr />');
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      const content = parseInline(headingMatch[2]);
      resultLines.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Blockquote: > quote
    const quoteMatch = trimmed.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      closeLists();
      const content = parseInline(quoteMatch[1]);
      resultLines.push(`<blockquote>${content}</blockquote>`);
      continue;
    }

    // Checkbox items: - [ ] item or - [x] item
    const checkboxMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch) {
      closeLists();
      const isChecked = checkboxMatch[1].toLowerCase() === 'x';
      const content = parseInline(checkboxMatch[2]);
      resultLines.push(
        `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><input type="checkbox"${
          isChecked ? ' checked' : ''
        }/><span>${content}</span></div>`
      );
      continue;
    }

    // Bullet list items: - item or * item or + item
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        resultLines.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        resultLines.push('<ul>');
        inUl = true;
      }
      const content = parseInline(ulMatch[1]);
      resultLines.push(`<li>${content}</li>`);
      continue;
    }

    // Numbered list items: 1. item or 2) item
    const olMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        resultLines.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        resultLines.push('<ol>');
        inOl = true;
      }
      const content = parseInline(olMatch[2]);
      resultLines.push(`<li>${content}</li>`);
      continue;
    }

    // Normal line
    closeLists();
    const content = parseInline(line);
    resultLines.push(`<p>${content}</p>`);
  }

  closeLists();

  let finalHtml = resultLines.join('');

  // Clean up initial/trailing empty tags
  finalHtml = finalHtml.replace(/^(<br \/>|<p><\/p>)+/i, '');
  finalHtml = finalHtml.replace(/(<br \/>|<p><\/p>)+$/i, '');

  return finalHtml;
}
