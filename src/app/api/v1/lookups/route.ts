import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getLookups } from '@/lib/services/lookups';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const data = await getLookups({ user });
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}
