import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { listCompanies, createCompany } from '@/lib/services/companies';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;
    const result = await listCompanies({ user }, searchParams);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await createCompany({ user }, body);
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err);
  }
}
