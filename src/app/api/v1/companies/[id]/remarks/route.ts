import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { listRemarks, createRemark } from '@/lib/services/remarks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id: companyId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;

    const result = await listRemarks({ user }, { companyId, limit, offset, page });
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    const { id: companyId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await createRemark({ user }, { companyId, ...body });
    return apiSuccess(result, 201);
  } catch (err) {
    return apiError(err);
  }
}
