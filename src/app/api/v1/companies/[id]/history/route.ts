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
    const result = await getCompanyHistory({ user }, { id });
    return apiSuccess({ items: result });
  } catch (err) {
    return apiError(err);
  }
}
