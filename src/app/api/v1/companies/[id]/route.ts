import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getCompany, updateCompany } from '@/lib/services/companies';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const result = await getCompany({ user }, { id });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await updateCompany({ user }, { id, data: body });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
