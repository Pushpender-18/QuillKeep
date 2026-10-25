import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { ApiError } from './errors';
import { ProfileUser } from '@/lib/auth';

const requestUserCache = new WeakMap<Request, ProfileUser>();

/**
 * Validates bearer token from Authorization header and returns profile user.
 * Verification uses getClaims(token) locally when asymmetric signature can be verified,
 * falling back to getUser(token).
 * Cached per request instance. Never reads cookies. Never logs tokens.
 */
export async function getApiUser(request: NextRequest | Request): Promise<ProfileUser> {
  const cached = requestUserCache.get(request);
  if (cached) {
    return cached;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw ApiError.unauthenticated('Missing or invalid Authorization Bearer header');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw ApiError.unauthenticated('Missing Bearer token');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let userId: string | null = null;

  // 1. Attempt local JWT verification via getClaims
  try {
    const claimsResult = await supabase.auth.getClaims(token);
    if (!claimsResult.error && claimsResult.data?.claims?.sub) {
      userId = String(claimsResult.data.claims.sub);
    }
  } catch {
    // Local verification failed or unavailable, fallback to getUser
  }

  // 2. Fallback to getUser(token) if getClaims didn't resolve userId
  if (!userId) {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      throw ApiError.unauthenticated('Invalid or expired token');
    }
    userId = String(userData.user.id);
  }

  // 3. Load profile from Prisma profiles table (exact same check as getCurrentUser)
  let rawProfile: any = null;
  try {
    rawProfile = await prisma.orm.public.Profiles.where({ id: userId }).first();
  } catch (err: unknown) {
    console.error('[AUTH GET_API_USER] Error querying Prisma profiles table');
    throw ApiError.serverError('Failed to verify profile status');
  }

  if (!rawProfile || rawProfile.isActive === false) {
    throw ApiError.accountInactive('Account is inactive or disabled');
  }

  const cleanProfile = convertBigInts(rawProfile);
  const profileUser: ProfileUser = {
    id: String(cleanProfile.id),
    fullName: String(cleanProfile.fullName || cleanProfile.email || 'User'),
    email: String(cleanProfile.email || ''),
    isActive: Boolean(cleanProfile.isActive),
    createdAt: String(cleanProfile.createdAt),
  };

  requestUserCache.set(request, profileUser);
  return profileUser;
}
