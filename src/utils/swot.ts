import { escapeHtml } from './linkUtils';

export interface SwotData {
  projectTitle: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/**
 * Generates structured HTML for a graphical 4-quadrant SWOT Analysis widget.
 */
export function createSwotHTML(
  projectTitle: string,
  strengths: string[] = [],
  weaknesses: string[] = [],
  opportunities: string[] = [],
  threats: string[] = []
): string {
  const safeTitle = escapeHtml(projectTitle || 'SWOT-аналіз');

  const formatList = (items: string[], colorDot: string) => {
    if (!items || items.length === 0) {
      return '<div style="color: #9ca3af; font-size: 11px; font-style: italic;">• Пусто</div>';
    }
    return items
      .map(
        (item) =>
          `<div style="display: flex; align-items: flex-start; gap: 6px; margin-top: 4px; margin-bottom: 4px;"><span style="color: ${colorDot}; font-weight: bold; font-size: 13px; line-height: 1;">•</span><span style="font-size: 12px; color: #1c1917; line-height: 1.35;">${escapeHtml(item)}</span></div>`
      )
      .join('');
  };

  return `
<div style="width: 100%; height: 100%; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif;">
  <div style="display: flex; items-center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.12); padding-bottom: 6px; margin-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; background: #1c1917; color: #f5f5f4;">SWOT</span>
      <span style="font-weight: 700; font-size: 14px; color: #1c1917;">${safeTitle}</span>
    </div>
  </div>
  
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1;">
    <!-- Strengths -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 8px; display: flex; flex-direction: column;">
      <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
        💪 S — Сильні сторони
      </div>
      <div style="flex: 1; overflow-y: auto;">
        ${formatList(strengths, '#059669')}
      </div>
    </div>

    <!-- Weaknesses -->
    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 8px; display: flex; flex-direction: column;">
      <div style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
        ⚠️ W — Слабкі сторони
      </div>
      <div style="flex: 1; overflow-y: auto;">
        ${formatList(weaknesses, '#dc2626')}
      </div>
    </div>

    <!-- Opportunities -->
    <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 12px; padding: 8px; display: flex; flex-direction: column;">
      <div style="font-size: 11px; font-weight: 700; color: #075985; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
        🚀 O — Можливості
      </div>
      <div style="flex: 1; overflow-y: auto;">
        ${formatList(opportunities, '#0284c7')}
      </div>
    </div>

    <!-- Threats -->
    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 12px; padding: 8px; display: flex; flex-direction: column;">
      <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
        🛡️ T — Загрози
      </div>
      <div style="flex: 1; overflow-y: auto;">
        ${formatList(threats, '#d97706')}
      </div>
    </div>
  </div>
</div>
  `.trim();
}
