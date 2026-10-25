import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkArchive } from '@/lib/services/bulk';
import { archiveCompany } from '@/lib/services/companies';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));

    if (body.id && !body.ids) {
      const result = await archiveCompany({ user }, { id: body.id, reason: body.reason, note: body.note });
      return apiSuccess(result);
    }

    const result = await bulkArchive({ user }, body);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
