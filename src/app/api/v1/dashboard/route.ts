import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getDashboard } from '@/lib/services/dashboard';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;

    const rawParams: any = {};
    if (searchParams.get('range')) rawParams.range = searchParams.get('range');
    if (searchParams.get('from')) rawParams.from = searchParams.get('from');
    if (searchParams.get('to')) rawParams.to = searchParams.get('to');
    if (searchParams.get('scope')) rawParams.scope = searchParams.get('scope');

    const result = await getDashboard({ user }, rawParams);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
