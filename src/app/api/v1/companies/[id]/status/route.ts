import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { changeCompanyStatus } from '@/lib/services/companies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await changeCompanyStatus({ user }, { id, ...body });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
