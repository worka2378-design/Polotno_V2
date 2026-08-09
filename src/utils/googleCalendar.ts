import { getGoogleDriveToken } from './googleDrive';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay?: boolean;
}

/**
 * List upcoming calendar events from Google Calendar API
 */
export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const token = await getGoogleDriveToken();
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&singleEvents=true&orderBy=startTime&maxResults=30`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка завантаження подій Google Calendar: ${res.statusText} (${errText})`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new event in Google Calendar
 */
export async function createCalendarEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const token = await getGoogleDriveToken();

  const body: any = {
    summary: input.summary,
    description: input.description,
  };

  if (input.isAllDay) {
    body.start = { date: input.startDateTime.split('T')[0] };
    body.end = { date: input.endDateTime.split('T')[0] };
  } else {
    body.start = { dateTime: new Date(input.startDateTime).toISOString() };
    body.end = { dateTime: new Date(input.endDateTime).toISOString() };
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка створення події у Google Calendar: ${res.statusText} (${errText})`);
  }

  return await res.json();
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getGoogleDriveToken();
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Помилка видалення події з Google Calendar: ${res.statusText} (${errText})`);
  }
}
