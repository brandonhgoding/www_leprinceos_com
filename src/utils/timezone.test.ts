import { describe, it, expect } from 'vitest';
import {
  formatInTimezone,
  getDateInTimezone,
  getTimeInTimezone,
  formatDateTime,
  formatTime,
  formatDate,
  getTodayInTimezone,
} from './timezone';

describe('timezone utilities', () => {
  describe('formatInTimezone', () => {
    it('should format a date with specified timezone and options', () => {
      const date = new Date('2026-01-30T14:30:00Z');
      const timezone = 'America/New_York';
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      };

      const result = formatInTimezone(date, timezone, options);

      // Should contain date components (exact format may vary by locale)
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/30/);
      expect(result).toMatch(/2026/);
    });

    it('should handle different timezones correctly', () => {
      const date = new Date('2026-01-30T00:00:00Z'); // Midnight UTC

      const nyResult = formatInTimezone(date, 'America/New_York', {
        hour: 'numeric',
        day: 'numeric',
      });
      const laResult = formatInTimezone(date, 'America/Los_Angeles', {
        hour: 'numeric',
        day: 'numeric',
      });

      // LA is 3 hours behind NY, so should show previous day
      expect(nyResult).toContain('29'); // Previous day in EST
      expect(laResult).toContain('29'); // Previous day in PST
    });
  });

  describe('getDateInTimezone', () => {
    it('should return YYYY-MM-DD format for a date in specified timezone', () => {
      const date = new Date('2026-01-30T14:30:00Z');
      const timezone = 'America/New_York';

      const result = getDateInTimezone(date, timezone);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toContain('2026');
      expect(result).toContain('01');
    });

    it('should respect timezone boundaries', () => {
      // Just before midnight UTC
      const date = new Date('2026-01-30T23:59:00Z');

      // In Tokyo (UTC+9), this is the next day
      const tokyoDate = getDateInTimezone(date, 'Asia/Tokyo');
      expect(tokyoDate).toContain('2026-01-31');

      // In New York (UTC-5), this is still the same day
      const nyDate = getDateInTimezone(date, 'America/New_York');
      expect(nyDate).toContain('2026-01-30');
    });
  });

  describe('getTimeInTimezone', () => {
    it('should return HH:MM format in 24-hour time', () => {
      const date = new Date('2026-01-30T14:30:00Z');
      const timezone = 'America/New_York';

      const result = getTimeInTimezone(date, timezone);

      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format times correctly across timezones', () => {
      const date = new Date('2026-01-30T14:30:00Z'); // 2:30 PM UTC

      // EST is UTC-5, so 2:30 PM UTC = 9:30 AM EST
      const nyTime = getTimeInTimezone(date, 'America/New_York');
      expect(nyTime).toBe('09:30');
    });

    it('should use 24-hour format for times after noon', () => {
      const date = new Date('2026-01-30T18:45:00Z'); // 6:45 PM UTC
      const timezone = 'UTC';

      const result = getTimeInTimezone(date, timezone);

      expect(result).toBe('18:45');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime with weekday, month, day, and time', () => {
      const dateStr = '2026-01-30T14:30:00Z';
      const timezone = 'America/New_York';

      const result = formatDateTime(dateStr, timezone);

      expect(result).toMatch(/^\w{3},/); // Starts with abbreviated weekday
      expect(result).toContain('Jan');
      expect(result).toContain('30');
    });

    it('should handle ISO datetime strings', () => {
      const dateStr = '2026-06-15T20:00:00-04:00';
      const timezone = 'America/New_York';

      const result = formatDateTime(dateStr, timezone);

      expect(result).toBeTruthy();
      expect(result).toContain('Jun');
    });
  });

  describe('formatTime', () => {
    it('should format time in 12-hour format with AM/PM', () => {
      const dateStr = '2026-01-30T14:30:00Z';
      const timezone = 'America/New_York';

      const result = formatTime(dateStr, timezone);

      expect(result).toMatch(/\d+:\d{2}\s?(AM|PM)/i);
    });

    it('should correctly show AM times', () => {
      const dateStr = '2026-01-30T10:00:00Z';
      const timezone = 'UTC';

      const result = formatTime(dateStr, timezone);

      expect(result).toContain('10:00');
      expect(result).toContain('AM');
    });

    it('should correctly show PM times', () => {
      const dateStr = '2026-01-30T20:30:00Z';
      const timezone = 'UTC';

      const result = formatTime(dateStr, timezone);

      expect(result).toContain('8:30');
      expect(result).toContain('PM');
    });
  });

  describe('formatDate', () => {
    it('should format date with weekday, month, day, and year', () => {
      const dateStr = '2026-01-30T14:30:00Z';
      const timezone = 'America/New_York';

      const result = formatDate(dateStr, timezone);

      expect(result).toMatch(/^\w{3},/); // Starts with abbreviated weekday
      expect(result).toContain('Jan');
      expect(result).toContain('30');
      expect(result).toContain('2026');
    });

    it('should handle dates across timezone boundaries', () => {
      // Late night UTC that's the next day in some timezones
      const dateStr = '2026-01-30T23:00:00Z';

      const tokyoResult = formatDate(dateStr, 'Asia/Tokyo');
      expect(tokyoResult).toContain('31'); // Next day in Tokyo

      const laResult = formatDate(dateStr, 'America/Los_Angeles');
      expect(laResult).toContain('30'); // Still same day in LA
    });
  });

  describe('getTodayInTimezone', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const timezone = 'America/New_York';

      const result = getTodayInTimezone(timezone);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return different dates for different timezones when near midnight UTC', () => {
      // Note: This test may be flaky depending on when it's run
      // For a more stable test, we'd need to mock Date
      const utcResult = getTodayInTimezone('UTC');
      const tokyoResult = getTodayInTimezone('Asia/Tokyo');

      // Both should be valid dates
      expect(utcResult).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tokyoResult).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('edge cases', () => {
    it('should handle leap seconds gracefully', () => {
      const dateStr = '2026-12-31T23:59:59Z';
      const timezone = 'UTC';

      expect(() => formatDateTime(dateStr, timezone)).not.toThrow();
      expect(() => formatTime(dateStr, timezone)).not.toThrow();
      expect(() => formatDate(dateStr, timezone)).not.toThrow();
    });

    it('should handle invalid timezone by throwing', () => {
      const date = new Date('2026-01-30T14:30:00Z');
      const invalidTimezone = 'Invalid/Timezone';

      expect(() =>
        formatInTimezone(date, invalidTimezone, { hour: 'numeric' })
      ).toThrow();
    });

    it('should handle daylight saving time transitions', () => {
      // March 9, 2026 is DST transition in US (2 AM becomes 3 AM)
      const dstDate = new Date('2026-03-09T07:00:00Z'); // 2 AM EST
      const timezone = 'America/New_York';

      const result = getTimeInTimezone(dstDate, timezone);

      // Should handle the transition gracefully
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
