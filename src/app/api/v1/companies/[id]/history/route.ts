import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getCompanyHistory } from '@/lib/services/companies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const page = request.nextUrl.searchParams.get('page') || '1';
    const result = await getCompanyHistory({ user }, { id, page });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
