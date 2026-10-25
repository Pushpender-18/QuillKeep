import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { bulkRestore } from '@/lib/services/bulk';
import { restoreCompany } from '@/lib/services/companies';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));

    if (body.id && !body.ids) {
      const result = await restoreCompany({ user }, { id: body.id });
      return apiSuccess(result);
    }

    const result = await bulkRestore({ user }, body);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
