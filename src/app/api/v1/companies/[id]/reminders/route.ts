import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getCompanyReminders } from '@/lib/services/reminders';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id: companyId } = await params;
    const result = await getCompanyReminders({ user }, { companyId });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
