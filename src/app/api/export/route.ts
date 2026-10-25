import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exportCompanies } from '@/lib/services/export';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

async function handleExport(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;

    const result = await exportCompanies({ user }, searchParams);

    return new NextResponse(result.data as any, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[EXPORT_ROUTE_ERROR]', err);
    return NextResponse.json({ error: err?.message || 'Export failed' }, { status: err?.status || 500 });
  }
}
