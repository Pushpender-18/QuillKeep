import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'validation_error'
  | 'not_found'
  | 'forbidden'
  | 'duplicate_name'
  | 'archived_company'
  | 'date_required'
  | 'past_date'
  | 'confirm_mismatch'
  | 'too_many'
  | 'timeout'
  | 'unauthenticated'
  | 'account_inactive'
  | 'server_error';

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly fields?: Record<string, string>;
  public readonly details?: any;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 400,
    fields?: Record<string, string>,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static unauthenticated(message = 'Authentication required'): ApiError {
    return new ApiError('unauthenticated', message, 401);
  }

  static accountInactive(message = 'Your account has been deactivated'): ApiError {
    return new ApiError('account_inactive', message, 403);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError('forbidden', message, 403);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError('not_found', message, 404);
  }

  static duplicateName(
    message = 'A record with this name already exists',
    details?: { existingCompanyId: string; existingName: string; existingIsArchived: boolean } | any
  ): ApiError {
    return new ApiError('duplicate_name', message, 409, undefined, details);
  }

  static archivedCompany(message = 'Cannot modify an archived company'): ApiError {
    return new ApiError('archived_company', message, 400);
  }

  static dateRequired(message = 'A date and time is required'): ApiError {
    return new ApiError('date_required', message, 400);
  }

  static pastDate(message = 'Past date/time is not allowed'): ApiError {
    return new ApiError('past_date', message, 400);
  }

  static confirmMismatch(message = 'Confirmation text does not match'): ApiError {
    return new ApiError('confirm_mismatch', message, 400);
  }

  static tooMany(message = 'Bulk operations cannot exceed 500 companies'): ApiError {
    return new ApiError('too_many', message, 400);
  }

  static timeout(message = 'Request timed out'): ApiError {
    return new ApiError('timeout', message, 504);
  }

  static validation(message = 'Validation error', fields?: Record<string, string>): ApiError {
    return new ApiError('validation_error', message, 400, fields);
  }

  static serverError(message = 'An unexpected server error occurred'): ApiError {
    return new ApiError('server_error', message, 500);
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    let isTooMany = false;

    for (const issue of err.issues) {
      const fieldPath = issue.path.join('.') || 'root';
      fields[fieldPath] = issue.message;

      if (issue.message.includes('500') || issue.message.includes('exceed 500')) {
        isTooMany = true;
      }
    }

    if (isTooMany) {
      return ApiError.tooMany(err.issues[0]?.message || 'Bulk operations cannot exceed 500 companies');
    }

    const firstMsg = err.issues[0]?.message || 'Invalid input data';
    return ApiError.validation(firstMsg, fields);
  }

  const raw = err as any;
  const errCode = raw?.code || raw?.name || '';
  const rawMsg = typeof raw?.message === 'string' ? raw.message : String(err);

  // Check specific business messages
  if (rawMsg.includes('archived') || rawMsg.includes('This company is archived')) {
    return ApiError.archivedCompany(rawMsg);
  }

  if (
    rawMsg.includes('Confirmation mismatch') ||
    rawMsg.includes('Please type DELETE') ||
    rawMsg.includes('Please type "')
  ) {
    return ApiError.confirmMismatch(rawMsg);
  }

  if (rawMsg.includes('Past date/time is not allowed')) {
    return ApiError.pastDate(rawMsg);
  }

  if (rawMsg.includes('A date and time is required')) {
    return ApiError.dateRequired(rawMsg);
  }

  if (rawMsg.includes('Only the author can edit')) {
    return ApiError.forbidden(rawMsg);
  }

  if (rawMsg.includes('Cannot modify') || rawMsg.includes('Not allowed')) {
    return ApiError.forbidden(rawMsg);
  }

  if (
    errCode === 'P2002' ||
    rawMsg.includes('P2002') ||
    rawMsg.includes('unique constraint') ||
    rawMsg.includes('already exists') ||
    rawMsg.includes('duplicate key')
  ) {
    return ApiError.duplicateName(
      rawMsg.includes('already exists') ? rawMsg : 'A record with this name or identifier already exists'
    );
  }

  if (
    errCode === 'P2025' ||
    rawMsg.includes('P2025') ||
    rawMsg.includes('not found') ||
    rawMsg.includes('Target company not found') ||
    rawMsg.includes('Company not found') ||
    rawMsg.includes('Reminder not found') ||
    rawMsg.includes('Contact not found') ||
    rawMsg.includes('Custom field not found')
  ) {
    return ApiError.notFound(rawMsg.includes('not found') ? rawMsg : 'Resource not found');
  }

  if (
    errCode === 'P2028' ||
    rawMsg.includes('P2028') ||
    rawMsg.includes('transaction timeout') ||
    rawMsg.includes('Transaction API error') ||
    rawMsg.includes('took too long')
  ) {
    return ApiError.timeout('The operation timed out. Please try again.');
  }

  if (rawMsg.includes('exceed 500') || rawMsg.includes('500 items')) {
    return ApiError.tooMany(rawMsg);
  }

  // Never leak stack traces, Postgres error, SQL queries, or internal prisma traces
  return ApiError.serverError('An unexpected error occurred. Please try again.');
}
