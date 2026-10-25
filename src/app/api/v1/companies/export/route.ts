import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiError, apiHeaders } from '@/lib/api/response';
import { exportCompanies } from '@/lib/services/export';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    const searchParams = request.nextUrl.searchParams;

    const result = await exportCompanies({ user }, searchParams);

    const headers = apiHeaders({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });

    return new NextResponse(result.data as any, {
      status: 200,
      headers,
    });
  } catch (err) {
    return apiError(err);
  }
}
