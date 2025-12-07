/**
 * Date utility functions for SmartFinHub
 */

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(day: number): string {
  if (day < 1 || day > 31) return `${day}th`;
  
  const j = day % 10;
  const k = day % 100;
  
  if (j === 1 && k !== 11) {
    return `${day}st`;
  }
  if (j === 2 && k !== 12) {
    return `${day}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${day}rd`;
  }
  return `${day}th`;
}

/**
 * Calculate the next occurrence of a specific day of month
 */
export function getNextOccurrence(dayOfMonth: number): Date {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // If the day hasn't occurred this month yet, use this month
  if (dayOfMonth > currentDay) {
    return new Date(currentYear, currentMonth, dayOfMonth);
  }
  
  // Otherwise, use next month
  return new Date(currentYear, currentMonth + 1, dayOfMonth);
}

/**
 * Format a day of month with ordinal suffix
 */
export function formatDayOfMonth(day: number | null | undefined): string {
  if (!day) return 'Not set';
  return getOrdinalSuffix(day);
}

/**
 * Calculate days until a specific day of month
 */
export function daysUntil(dayOfMonth: number): number {
  const nextDate = getNextOccurrence(dayOfMonth);
  const today = new Date();
  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if a date is coming soon (within 7 days)
 */
export function isComingSoon(dayOfMonth: number): boolean {
  const days = daysUntil(dayOfMonth);
  return days >= 0 && days <= 7;
}
