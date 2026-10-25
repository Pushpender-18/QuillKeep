import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { searchAll } from '@/lib/services/search';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const q = request.nextUrl.searchParams.get('q') || '';
    const result = await searchAll({ user }, { q });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
