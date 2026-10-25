import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkArchive } from '@/lib/services/bulk';
import { archiveCompany } from '@/lib/services/companies';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));

    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const result = await bulkArchive({ user }, { ...body, ids });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
