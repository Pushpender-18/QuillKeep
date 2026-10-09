import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts BigInt values to Number recursively in objects/arrays
 * to prevent serialization errors when returning data to the client.
 */
export function convertBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj) as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      res[key] = convertBigInts((obj as any)[key]);
    }
    return res as T;
  }
  return obj;
}

/**
 * Helper to get user initials from full name or email
 */
export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}
