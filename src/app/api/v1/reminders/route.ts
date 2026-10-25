import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { listReminders, createReminder } from '@/lib/services/reminders';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;

    const rawParams: any = {};
    if (searchParams.get('scope')) rawParams.scope = searchParams.get('scope');
    if (searchParams.get('day')) rawParams.day = searchParams.get('day');
    if (searchParams.get('month')) rawParams.month = searchParams.get('month');
    if (searchParams.get('companyId')) rawParams.companyId = searchParams.get('companyId');
    if (searchParams.get('completedWindow')) {
      rawParams.completedWindow = searchParams.get('completedWindow') === 'true';
    }

    const result = await listReminders({ user }, rawParams);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await createReminder({ user }, body);
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err);
  }
}
