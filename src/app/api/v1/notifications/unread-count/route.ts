import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getUnreadCount } from '@/lib/services/notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const result = await getUnreadCount({ user });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
