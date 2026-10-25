import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    await getApiUser(request);

    const minAppVersion = process.env.MIN_APP_VERSION || '1.0.0';

    return apiSuccess({
      apiVersion: 1,
      minAppVersion,
    });
  } catch (err) {
    return apiError(err);
  }
}
