export interface LinkDetails {
  url: string;
  domain: string;
  title: string;
  faviconUrl: string;
}

/**
 * Shared regex pattern for matching web URLs globally
 */
export const URL_REGEX_GLOBAL = /(https?:\/\/[^\s<"']+|www\.[^\s<"']+)/gi;

/**
 * Helper to match all URLs in a string
 */
export function matchUrls(text: string): string[] | null {
  if (!text) return null;
  return text.match(URL_REGEX_GLOBAL);
}

/**
 * Checks if URL is a tracking, schema, or internal helper URL (e.g., favicons, w3.org)
 */
export function isTrackingOrInternalUrl(url: string): boolean {
  if (!url) return true;
  return (
    url.includes('w3.org') ||
    url.includes('schema.org') ||
    url.includes('google.com/s2/favicons')
  );
}

/**
 * Known domain titles mapping for clean branding
 */
const DOMAIN_BRAND_MAP: Record<string, string> = {
  'github.com': 'GitHub',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'google.com': 'Google',
  'wikipedia.org': 'Wikipedia',
  'uk.wikipedia.org': 'Вікіпедія',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'twitter.com': 'Twitter',
  'x.com': 'X (Twitter)',
  'linkedin.com': 'LinkedIn',
  'figma.com': 'Figma',
  'linear.app': 'Linear',
  'notion.so': 'Notion',
  'medium.com': 'Medium',
  'reddit.com': 'Reddit',
  'telegram.org': 'Telegram',
  't.me': 'Telegram',
  'pinterest.com': 'Pinterest',
  'spotify.com': 'Spotify',
  'apple.com': 'Apple',
  'microsoft.com': 'Microsoft',
  'openai.com': 'OpenAI',
  'chatgpt.com': 'ChatGPT',
  'dribbble.com': 'Dribbble',
  'behance.net': 'Behance',
  'codepen.io': 'CodePen',
  'gitlab.com': 'GitLab',
  'stackoverflow.com': 'Stack Overflow',
  'npmjs.com': 'npm',
};

/**
 * Check if string looks like a URL
 */
export function isUrl(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false; // URLs don't have spaces
  return /^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(trimmed);
}

/**
 * Extracts url details: clean target URL, domain, title, and favicon
 */
export function extractUrlDetails(rawUrl: string): LinkDetails {
  let cleanUrl = rawUrl.trim().replace(/[.,;!?)]+$/, '');
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  let domain = cleanUrl;
  let title = cleanUrl;
  let faviconUrl = '';

  try {
    const urlObj = new URL(cleanUrl);
    const host = (urlObj.hostname || '').toLowerCase();
    domain = host.replace(/^www\./, '');

    // Favicon service
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // Title generation
    if (DOMAIN_BRAND_MAP[domain]) {
      const brand = DOMAIN_BRAND_MAP[domain];
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1])
          .replace(/[-_]/g, ' ')
          .trim();
        if (lastSegment && lastSegment.length < 30) {
          title = `${brand} — ${lastSegment}`;
        } else {
          title = brand;
        }
      } else {
        title = brand;
      }
    } else {
      // Capitalize first letter of main domain part
      const mainPart = domain.split('.')[0] || domain;
      const capitalized = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
      
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1])
          .replace(/[-_]/g, ' ')
          .trim();
        if (lastSegment && lastSegment.length < 30) {
          title = `${capitalized} — ${lastSegment}`;
        } else {
          title = capitalized;
        }
      } else {
        title = capitalized;
      }
    }
  } catch (err) {
    title = rawUrl;
    domain = rawUrl;
  }

  return {
    url: cleanUrl,
    domain,
    title,
    faviconUrl,
  };
}

/**
 * Generates HTML string for a graphical link card pill
 */
export function createLinkCardHtml(rawUrl: string): string {
  const details = extractUrlDetails(rawUrl);
  const safeTitle = details.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeUrl = details.url.replace(/"/g, '&quot;');
  const safeDomain = details.domain.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const faviconHtml = details.faviconUrl ? `<img src="${details.faviconUrl}" alt="" class="w-4 h-4 rounded-full shrink-0 object-contain pointer-events-none" onerror="this.style.display='none';" />` : '';

  return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" contenteditable="false" data-graphical-link="true" class="graphical-link-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full my-1 mx-0.5 border border-stone-300 bg-stone-200/90 text-stone-800 hover:bg-stone-300 transition-colors cursor-pointer select-none no-underline max-w-full font-sans text-xs shadow-xs align-middle group/link" title="${safeTitle}">${faviconHtml}<span class="truncate font-medium text-xs text-stone-800">${safeTitle}</span><span class="text-[10px] text-stone-500 truncate hidden sm:inline">(${safeDomain})</span><svg class="w-3 h-3 opacity-50 shrink-0 ml-0.5 group-hover/link:opacity-100 transition-opacity" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span data-action="delete-link" title="Видалити посилання" class="inline-flex items-center justify-center p-0.5 rounded-full text-stone-500 hover:text-red-500 hover:bg-stone-300 transition-colors ml-1 shrink-0 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></a>&nbsp;`;
}

/**
 * Converts text URLs in HTML content to graphical link cards safely
 */
export function convertTextUrlsToLinkCards(content: string): string {
  if (!content) return content;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${content}</body>`, 'text/html');
    const body = doc.body;

    let modified = false;

    function processNode(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        // Do NOT process inside <a> tags or anything marked as a graphical link or media elements
        if (
          el.tagName === 'A' ||
          el.hasAttribute('data-graphical-link') ||
          el.classList.contains('graphical-link-card') ||
          el.tagName === 'SCRIPT' ||
          el.tagName === 'STYLE' ||
          el.tagName === 'IMG' ||
          el.tagName === 'SVG'
        ) {
          return;
        }
        // Process child nodes
        const children = Array.from(node.childNodes);
        children.forEach(processNode);
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text) return;

        const matches = matchUrls(text);
        if (matches) {
          // Filter out w3.org, schema.org, google favicon links
          const validUserUrls = matches.filter(url => !isTrackingOrInternalUrl(url));

          if (validUserUrls.length === 0) return;

          const wrapper = doc.createElement('span');
          const parts = text.split(URL_REGEX_GLOBAL);

          parts.forEach((part) => {
            if (
              /^(https?:\/\/|www\.)[^\s<"']+/i.test(part) &&
              !isTrackingOrInternalUrl(part)
            ) {
              const cardHtml = createLinkCardHtml(part);
              const tempDoc = parser.parseFromString(`<body>${cardHtml}</body>`, 'text/html');
              Array.from(tempDoc.body.childNodes).forEach((child) => {
                wrapper.appendChild(doc.importNode(child, true));
              });
            } else if (part) {
              wrapper.appendChild(doc.createTextNode(part));
            }
          });

          if (node.parentNode) {
            const parent = node.parentNode;
            while (wrapper.firstChild) {
              parent.insertBefore(wrapper.firstChild, node);
            }
            parent.removeChild(node);
            modified = true;
          }
        }
      }
    }

    processNode(body);

    if (modified) {
      return body.innerHTML;
    }
  } catch (err) {
    console.error('Error converting text URLs to link cards:', err);
  }

  return content;
}

/**
 * Ensures all link cards in HTML content have up-to-date markup (e.g. trash icon)
 */
export function ensureLinkCardsUpToDate(content: string): string {
  if (!content) return content;
  
  // First sanitize any corrupted legacy HTML
  let sanitized = sanitizeCorruptedLinkContent(content);

  if (!sanitized.includes('graphical-link-card') && !sanitized.includes('data-graphical-link')) {
    return sanitized;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${sanitized}</body>`, 'text/html');
    let modified = false;

    doc.querySelectorAll('a.graphical-link-card, a[data-graphical-link]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !a.querySelector('[data-action="delete-link"]')) {
        const freshCardHtml = createLinkCardHtml(href);
        const tempDoc = parser.parseFromString(`<body>${freshCardHtml}</body>`, 'text/html');
        const freshNode = tempDoc.body.firstElementChild;
        if (freshNode && a.parentNode) {
          a.parentNode.replaceChild(doc.importNode(freshNode, true), a);
          modified = true;
        }
      }
    });

    if (modified) {
      return doc.body.innerHTML;
    }
  } catch (err) {
    console.error('Error updating link cards:', err);
  }

  return sanitized;
}

/**
 * Repairs note content if it was corrupted by legacy broken HTML parsing
 */
export function sanitizeCorruptedLinkContent(content: string): string {
  if (!content) return content;
  if (
    content.includes('onerror="this.onerror=null') ||
    content.includes('http:=""') ||
    content.includes('svg=""') ||
    content.includes('2000=""')
  ) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${content}</body>`, 'text/html');

      const validUrls = new Set<string>();
      
      // Find hrefs in <a> tags
      doc.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href && !isTrackingOrInternalUrl(href)) {
          validUrls.add(href);
        }
      });

      // Also search text content for standalone user URLs
      const text = doc.body.textContent || '';
      const matches = matchUrls(text);
      if (matches) {
        matches.forEach((url) => {
          if (!isTrackingOrInternalUrl(url)) {
            validUrls.add(url);
          }
        });
      }

      if (validUrls.size > 0) {
        return Array.from(validUrls).map((url) => createLinkCardHtml(url)).join(' ');
      }
    } catch (e) {
      console.error('Error sanitizing corrupted content:', e);
    }
  }
  return content;
}

/**
 * Counts valid links in HTML content
 */
export function countLinksInContent(content: string): number {
  if (!content) return 0;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${content}</body>`, 'text/html');
    const links = new Set<string>();
    
    // Check <a> elements with href
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !isTrackingOrInternalUrl(href)) {
        links.add(href.trim());
      }
    });

    // Also check text content for standalone user URLs
    const text = doc.body.textContent || '';
    const matches = matchUrls(text);
    if (matches) {
      matches.forEach((url) => {
        if (!isTrackingOrInternalUrl(url)) {
          links.add(url.trim());
        }
      });
    }

    return links.size;
  } catch {
    return 0;
  }
}

/**
 * Extracts structured link details list from HTML content
 */
export function extractLinksFromContent(content: string): LinkDetails[] {
  if (!content) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${content}</body>`, 'text/html');
    const urlMap = new Map<string, LinkDetails>();

    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !isTrackingOrInternalUrl(href)) {
        const details = extractUrlDetails(href);
        const linkText = a.textContent?.trim();
        if (linkText && !isUrl(linkText) && linkText.length > 1 && !linkText.includes('(')) {
          details.title = linkText;
        }
        urlMap.set(details.url, details);
      }
    });

    const text = doc.body.textContent || '';
    const matches = matchUrls(text);
    if (matches) {
      matches.forEach((rawUrl) => {
        if (!isTrackingOrInternalUrl(rawUrl)) {
          const details = extractUrlDetails(rawUrl);
          if (!urlMap.has(details.url)) {
            urlMap.set(details.url, details);
          }
        }
      });
    }

    return Array.from(urlMap.values());
  } catch {
    return [];
  }
}

/**
 * Escapes special HTML characters to prevent XSS vulnerability
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
