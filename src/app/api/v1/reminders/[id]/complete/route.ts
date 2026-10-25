import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { completeReminder } from '@/lib/services/reminders';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const result = await completeReminder({ user }, { id });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
