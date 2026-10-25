import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/api/auth';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);

    return apiSuccess({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return apiError(err);
  }
}
