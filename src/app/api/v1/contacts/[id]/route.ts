import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateContact, deleteContact } from '@/lib/services/contacts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await updateContact({ user }, { id, data: body });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const result = await deleteContact({ user }, { id });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
