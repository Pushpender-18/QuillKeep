import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkChangeStatus } from '@/lib/services/bulk';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await bulkChangeStatus({ user }, body);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
