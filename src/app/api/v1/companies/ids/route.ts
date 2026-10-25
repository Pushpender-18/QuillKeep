import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getCompanyIds } from '@/lib/services/companies';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;
    const result = await getCompanyIds({ user }, searchParams);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
