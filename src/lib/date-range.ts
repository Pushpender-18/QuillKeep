/**
 * Date range resolution for Dashboard in Asia/Kolkata (IST, +05:30) timezone.
 */

export type DateRangePreset = 'today' | '7d' | '30d' | 'month' | 'lastmonth' | 'custom';

export interface ResolvedRange {
  preset: DateRangePreset;
  from: Date; // 00:00:00.000 IST
  to: Date; // 23:59:59.999 IST
  prevFrom: Date;
  prevTo: Date;
  days: number;
  label: string;
  isCustomFallback?: boolean;
  notice?: string;
}

/**
 * Returns current date/time parts in IST (Asia/Kolkata).
 */
export function getISTParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);

  return {
    year: getPart('year'),
    month: getPart('month'), // 1-12
    day: getPart('day'), // 1-31
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

/**
 * Creates a JS Date object representing a specific date and time in IST (+05:30).
 */
export function createISTDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  ms: number = 0
): Date {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');
  const mss = String(ms).padStart(3, '0');

  const isoStr = `${y}-${m}-${d}T${hh}:${mm}:${ss}.${mss}+05:30`;
  return new Date(isoStr);
}

/**
 * Formats a Date in short IST format, e.g. "3 Oct" or "3 Oct 2026"
 */
export function formatISTShortDate(date: Date, includeYear = false): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

/**
 * Formats date as YYYY-MM-DD in IST timezone.
 */
export function formatISTYYYYMMDD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Resolves search parameters into a ResolvedRange with boundaries and previous period.
 */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date()
): ResolvedRange {
  const istNow = getISTParts(now);
  const todayStart = createISTDate(istNow.year, istNow.month, istNow.day, 0, 0, 0, 0);
  const todayEnd = createISTDate(istNow.year, istNow.month, istNow.day, 23, 59, 59, 999);

  let preset: DateRangePreset = (params.range as DateRangePreset) || '7d';
  if (!['today', '7d', '30d', 'month', 'lastmonth', 'custom'].includes(preset)) {
    preset = '7d';
  }

  let from: Date = todayStart;
  let to: Date = todayEnd;
  let isCustomFallback = false;
  let notice: string | undefined;

  if (preset === 'today') {
    from = todayStart;
    to = todayEnd;
  } else if (preset === '7d') {
    const startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startParts = getISTParts(startDate);
    from = createISTDate(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0);
    to = todayEnd;
  } else if (preset === '30d') {
    const startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    const startParts = getISTParts(startDate);
    from = createISTDate(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0);
    to = todayEnd;
  } else if (preset === 'month') {
    from = createISTDate(istNow.year, istNow.month, 1, 0, 0, 0, 0);
    to = todayEnd;
  } else if (preset === 'lastmonth') {
    let prevMonth = istNow.month - 1;
    let prevYear = istNow.year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    from = createISTDate(prevYear, prevMonth, 1, 0, 0, 0, 0);
    to = createISTDate(prevYear, prevMonth, lastDay, 23, 59, 59, 999);
  } else if (preset === 'custom') {
    const fromStr = params.from || '';
    const toStr = params.to || '';

    const validFromPattern = /^\d{4}-\d{2}-\d{2}$/.test(fromStr);
    const validToPattern = /^\d{4}-\d{2}-\d{2}$/.test(toStr);

    if (validFromPattern && validToPattern) {
      const [fy, fm, fd] = fromStr.split('-').map(Number);
      const [ty, tm, td] = toStr.split('-').map(Number);

      const customFrom = createISTDate(fy, fm, fd, 0, 0, 0, 0);
      const customTo = createISTDate(ty, tm, td, 23, 59, 59, 999);

      const nowTime = todayEnd.getTime();
      const diffMs = customTo.getTime() - customFrom.getTime();
      const spanDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      if (customTo.getTime() > nowTime) {
        preset = '7d';
        isCustomFallback = true;
        notice = 'End date cannot be in the future. Defaulted to Last 7 Days.';
      } else if (customFrom.getTime() > customTo.getTime()) {
        preset = '7d';
        isCustomFallback = true;
        notice = 'Start date cannot be after end date. Defaulted to Last 7 Days.';
      } else if (spanDays > 366) {
        preset = '7d';
        isCustomFallback = true;
        notice = 'Maximum custom range span is 366 days. Defaulted to Last 7 Days.';
      } else {
        from = customFrom;
        to = customTo;
      }
    } else {
      preset = '7d';
      isCustomFallback = true;
      notice = 'Invalid custom date format. Defaulted to Last 7 Days.';
    }

    if (isCustomFallback) {
      const startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startParts = getISTParts(startDate);
      from = createISTDate(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0);
      to = todayEnd;
    }
  }

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));

  const prevTo = new Date(from.getTime() - 1);
  const prevToParts = getISTParts(prevTo);
  const prevToIST = createISTDate(prevToParts.year, prevToParts.month, prevToParts.day, 23, 59, 59, 999);

  const prevFromDate = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  const prevFromParts = getISTParts(prevFromDate);
  const prevFromIST = createISTDate(prevFromParts.year, prevFromParts.month, prevFromParts.day, 0, 0, 0, 0);

  let label = '';
  const fromText = formatISTShortDate(from);
  const toText = formatISTShortDate(to);

  if (preset === 'today') {
    label = `Today, ${fromText}`;
  } else if (preset === '7d') {
    label = `Last 7 Days, ${fromText} to ${toText}`;
  } else if (preset === '30d') {
    label = `Last 30 Days, ${fromText} to ${toText}`;
  } else if (preset === 'month') {
    label = `This Month, ${fromText} to ${toText}`;
  } else if (preset === 'lastmonth') {
    label = `Last Month, ${fromText} to ${toText}`;
  } else {
    label = `Custom, ${fromText} to ${toText}`;
  }

  return {
    preset,
    from,
    to,
    prevFrom: prevFromIST,
    prevTo: prevToIST,
    days,
    label,
    isCustomFallback,
    notice,
  };
}
