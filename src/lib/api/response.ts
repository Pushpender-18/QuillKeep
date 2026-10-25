import { NextResponse } from 'next/server';
import { ApiError, toApiError } from './errors';

export const API_VERSION_HEADER = 'X-Api-Version';
export const API_VERSION_VALUE = '1';

/**
 * Recursively normalizes response data:
 * - BigInt / Decimal -> number
 * - Date objects -> ISO-8601 UTC with 'Z'
 * - Arrays and nested objects traversed
 */
export function normalizeApiData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'object') {
    // Check if it looks like a Decimal object with toNumber or toString
    if (typeof obj.toNumber === 'function') {
      return obj.toNumber();
    }

    if (Array.isArray(obj)) {
      return obj.map(normalizeApiData);
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Ensure id fields are strings
      if ((key === 'id' || key.endsWith('Id')) && value !== null && value !== undefined) {
        clean[key] = String(value);
      } else {
        clean[key] = normalizeApiData(value);
      }
    }
    return clean;
  }

  return obj;
}

export function apiHeaders(customHeaders: Record<string, string> = {}): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  headers.set(API_VERSION_HEADER, API_VERSION_VALUE);

  for (const [key, value] of Object.entries(customHeaders)) {
    headers.set(key, value);
  }

  return headers;
}

export function apiSuccess<T>(data: T, status = 200, customHeaders: Record<string, string> = {}): NextResponse {
  const normalized = normalizeApiData(data);
  return NextResponse.json(
    { ok: true, data: normalized },
    {
      status,
      headers: apiHeaders(customHeaders),
    }
  );
}

export function apiError(err: unknown, customHeaders: Record<string, string> = {}): NextResponse {
  const apiErr = toApiError(err);
  const errorPayload: Record<string, any> = {
    code: apiErr.code,
    message: apiErr.message,
  };

  if (apiErr.fields && Object.keys(apiErr.fields).length > 0) {
    errorPayload.fields = apiErr.fields;
  }

  return NextResponse.json(
    { ok: false, error: errorPayload },
    {
      status: apiErr.status,
      headers: apiHeaders(customHeaders),
    }
  );
}
