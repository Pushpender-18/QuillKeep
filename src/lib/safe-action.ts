import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export type ActionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export async function safeAction<T>(
  actionName: string,
  fn: (user: { id: string; fullName: string; email: string }) => Promise<T>
): Promise<ActionResponse<T>> {
  let userId = 'unauthenticated';
  try {
    const user = await getCurrentUser();
    userId = user.id;

    if (!user || !user.isActive) {
      redirect('/login?error=session_expired');
    }

    const data = await fn(user);
    return { ok: true, data };
  } catch (err: any) {
    // Handle Next.js redirect thrown inside action functions
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err;
    }

    const errCode = err?.code || err?.name || 'UNKNOWN_ERROR';
    const rawMsg = err?.message || String(err);

    // Server-side logging without logging request body or PII
    console.error(`[SAFE_ACTION_ERROR] Action: ${actionName} | UserID: ${userId} | Code: ${errCode} | Message: ${rawMsg}`);

    // Friendly error mappings
    let userMessage = 'An unexpected error occurred. Please try again.';

    if (err instanceof z.ZodError) {
      userMessage = err.issues[0]?.message || 'Invalid input data provided.';
    } else if (errCode === 'P2002' || rawMsg.includes('P2002') || rawMsg.includes('unique constraint')) {
      userMessage = 'A record with this name or unique field already exists.';
    } else if (errCode === 'P2003' || rawMsg.includes('P2003') || rawMsg.includes('foreign key constraint')) {
      userMessage = 'A related record was not found or is invalid.';
    } else if (errCode === 'P2025' || rawMsg.includes('P2025') || rawMsg.includes('Record to update not found') || rawMsg.includes('Record to delete not found')) {
      userMessage = 'The requested record was not found.';
    } else if (errCode === 'P2028' || rawMsg.includes('P2028') || rawMsg.includes('transaction timeout') || rawMsg.includes('Transaction API error')) {
      userMessage = 'That took too long, please try again.';
    } else if (rawMsg.includes('A date and time is required')) {
      userMessage = 'A date and time is required.';
    } else if (rawMsg.includes('Company not found')) {
      userMessage = 'Company not found.';
    } else if (rawMsg.includes('archived')) {
      userMessage = rawMsg;
    } else if (rawMsg.includes('Past date/time is not allowed')) {
      userMessage = 'Past date/time is not allowed when setting reminders.';
    } else if (typeof rawMsg === 'string' && rawMsg.length > 0 && !rawMsg.includes('PostgresError') && !rawMsg.includes('prisma') && !rawMsg.includes('SELECT')) {
      userMessage = rawMsg;
    }

    return { ok: false, message: userMessage };
  }
}
