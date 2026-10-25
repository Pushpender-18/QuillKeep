import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkReassign } from '@/lib/services/bulk';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await bulkReassign({ user }, body);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
