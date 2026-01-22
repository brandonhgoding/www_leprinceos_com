// src/utils/timezone.ts
// Timezone utility functions for displaying and formatting dates/times
// in the cinema's local timezone

/**
 * Format a date in the specified timezone using Intl.DateTimeFormat
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(date);
}

/**
 * Get the date portion (YYYY-MM-DD) of a Date object in the specified timezone
 */
export function getDateInTimezone(date: Date, timezone: string): string {
  // en-CA format is YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Get the time portion (HH:MM) of a Date object in the specified timezone
 */
export function getTimeInTimezone(date: Date, timezone: string): string {
  // en-GB format with hour12: false gives HH:MM
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Format a datetime string for display (e.g., "Mon, Jan 21, 2:30 PM")
 */
export function formatDateTime(dateStr: string, timezone: string): string {
  return formatInTimezone(new Date(dateStr), timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format just the time portion of a datetime string (e.g., "2:30 PM")
 */
export function formatTime(dateStr: string, timezone: string): string {
  return formatInTimezone(new Date(dateStr), timezone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date string for display (e.g., "Mon, Jan 21, 2026")
 */
export function formatDate(dateStr: string, timezone: string): string {
  return formatInTimezone(new Date(dateStr), timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get today's date as YYYY-MM-DD in the specified timezone
 */
export function getTodayInTimezone(timezone: string): string {
  return getDateInTimezone(new Date(), timezone);
}
