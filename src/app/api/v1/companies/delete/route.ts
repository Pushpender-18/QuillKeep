import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { deleteArchived } from '@/lib/services/delete-archived';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const result = await deleteArchived({ user }, { ids, confirmText: body.confirmText });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
