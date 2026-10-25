import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createContact } from '@/lib/services/contacts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id: companyId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await createContact({ user }, { companyId, ...body });
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err);
  }
}
