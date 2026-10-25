import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkRestore } from '@/lib/services/bulk';
import { restoreCompany } from '@/lib/services/companies';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));

    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const result = await bulkRestore({ user }, { ...body, ids });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
