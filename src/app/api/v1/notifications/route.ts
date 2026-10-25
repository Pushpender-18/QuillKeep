import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { listNotifications } from '@/lib/services/notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const result = await listNotifications({ user }, { limit });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
