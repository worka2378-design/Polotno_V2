import { escapeHtml } from './linkUtils';

export interface PlannerTask {
  text: string;
  completed?: boolean;
}

/**
 * Generates clean HTML for a single checklist item using standard layout structure.
 */
export function createChecklistItemHTML(text: string, completed = false): string {
  const checkedAttr = completed ? 'checked="checked"' : '';
  const textStyles = completed ? 'style="text-decoration: line-through; opacity: 0.5;"' : '';
  const safeText = escapeHtml(text);
  return `<div class="flex items-center gap-2.5 mb-2"><input type="checkbox" ${checkedAttr} /><span ${textStyles}>${safeText}</span></div>`;
}

/**
 * Generates structured HTML for a planner note using clean, maintainable formatting.
 */
export function createPlannerHTML(
  title = 'Планувальник',
  tasks: PlannerTask[] = [
    { text: 'Завдання 1' },
    { text: 'Завдання 2' },
    { text: 'Завдання 3' },
  ]
): string {
  const safeTitle = escapeHtml(title);
  const titleHTML = `<div class="font-bold text-base mb-3 text-inherit flex items-center gap-1.5">${safeTitle}</div>`;
  const tasksHTML = tasks
    .map((task) => createChecklistItemHTML(task.text, task.completed))
    .join('');

  return `${titleHTML}${tasksHTML}`;
}

