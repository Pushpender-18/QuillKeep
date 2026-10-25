import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiError, apiHeaders } from '@/lib/api/response';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await getApiUser(request);

    const specPath = path.resolve(process.cwd(), 'docs/openapi.json');
    const content = fs.readFileSync(specPath, 'utf-8');
    const json = JSON.parse(content);

    return new NextResponse(JSON.stringify(json, null, 2), {
      status: 200,
      headers: apiHeaders({
        'Content-Type': 'application/json',
      }),
    });
  } catch (err) {
    return apiError(err);
  }
}
