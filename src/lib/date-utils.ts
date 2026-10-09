/**
 * Date utility functions tuned for Asia/Kolkata (IST) timezone.
 */

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Never';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Formats ISO date into readable IST string like "12 Sept, 3:40 PM" or "Today, 11:20 AM"
 */
export function formatAuditDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formatted = new Intl.DateTimeFormat('en-IN', options).format(date);
  
  // Check if today or yesterday in IST
  const now = new Date();
  const istNowString = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const istTargetString = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  
  const timeOnly = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (istNowString === istTargetString) {
    return `Today, ${timeOnly}`;
  }

  const yesterday = new Date(now.getTime() - 86400000);
  const istYesterdayString = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(yesterday);
  if (istYesterdayString === istTargetString) {
    return `Yesterday, ${timeOnly}`;
  }

  return formatted;
}

/**
 * Returns current IST date as YYYY-MM-DD
 */
export function getCurrentISTDateString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // YYYY-MM-DD
}

/**
 * Returns current IST time rounded to next 30 min as HH:mm
 */
export function getDefaultISTTimeString(): string {
  const now = new Date();
  const istHours = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now));
  const istMinutes = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', minute: 'numeric' }).format(now));

  let roundedMin = Math.ceil(istMinutes / 30) * 30;
  let addHours = 0;
  if (roundedMin >= 60) {
    roundedMin = 0;
    addHours = 1;
  }
  const finalHour = (istHours + addHours) % 24;
  
  const hStr = String(finalHour).padStart(2, '0');
  const mStr = String(roundedMin).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

/**
 * Converts a YYYY-MM-DD date and HH:mm time input in IST into ISO timestamptz string
 */
export function parseISTDateTimeToISO(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return '';
  // IST is UTC+05:30
  const combined = `${dateStr}T${timeStr}:00+05:30`;
  const date = new Date(combined);
  return date.toISOString();
}

/**
 * Validates if dateStr and timeStr combined in IST is in the past
 */
export function isPastISTDateTime(dateStr: string, timeStr: string): boolean {
  if (!dateStr || !timeStr) return false;
  const isoStr = parseISTDateTimeToISO(dateStr, timeStr);
  if (!isoStr) return false;
  const targetTime = new Date(isoStr).getTime();
  const currentTime = new Date().getTime();
  return targetTime < currentTime;
}
