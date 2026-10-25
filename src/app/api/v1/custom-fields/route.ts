import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createCustomField } from '@/lib/services/custom-fields';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await createCustomField({ user }, body);
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err);
  }
}
