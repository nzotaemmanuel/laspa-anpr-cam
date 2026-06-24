/**
 * time.ts — Centralised date/time formatting for LASPA ANPR Console
 *
 * All timestamps from the backend are UTC ISO-8601 strings.
 * Display timezone: WAT — West Africa Time (UTC+1), Africa/Lagos.
 */

const WAT_LOCALE = 'en-NG';
const WAT_TZ    = 'Africa/Lagos';  // WAT = UTC+1, no DST

const BASE_OPTS: Intl.DateTimeFormatOptions = { timeZone: WAT_TZ };

// ─── Core Formatters ──────────────────────────────────────────────────────────

/**
 * Format: "24 Jun 2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat(WAT_LOCALE, {
      ...BASE_OPTS,
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    }).format(new Date(isoString));
  } catch {
    return '—';
  }
}

/**
 * Format: "14:32:05 WAT"
 */
export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat(WAT_LOCALE, {
      ...BASE_OPTS,
      hour:        '2-digit',
      minute:      '2-digit',
      second:      '2-digit',
      hour12:      false,
      timeZoneName: 'short',
    }).format(new Date(isoString));
  } catch {
    return '—';
  }
}

/**
 * Format: "24 Jun 2026, 14:32:05 WAT"  — full datetime
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat(WAT_LOCALE, {
      ...BASE_OPTS,
      day:          '2-digit',
      month:        'short',
      year:         'numeric',
      hour:         '2-digit',
      minute:       '2-digit',
      second:       '2-digit',
      hour12:       false,
      timeZoneName: 'short',
    }).format(new Date(isoString));
  } catch {
    return '—';
  }
}

/**
 * Format: "14:32 WAT"  — compact, no seconds (good for tables/cards)
 */
export function formatTimeShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat(WAT_LOCALE, {
      ...BASE_OPTS,
      hour:         '2-digit',
      minute:       '2-digit',
      hour12:       false,
      timeZoneName: 'short',
    }).format(new Date(isoString));
  } catch {
    return '—';
  }
}

/**
 * Returns today's date as YYYY-MM-DD in WAT.
 * Use this instead of new Date().toISOString().split('T')[0] which returns UTC date.
 */
export function todayWAT(): string {
  return new Intl.DateTimeFormat('en-CA', {  // en-CA gives YYYY-MM-DD
    ...BASE_OPTS,
  }).format(new Date());
}
