import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { convertBigInts } from '@/lib/utils';

export interface ProfileUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Verifies session with supabase.auth.getUser() and loads matching profile row via Prisma.
 * If no profile or is_active is false, signs user out and redirects to /login.
 */
export async function getCurrentUser(): Promise<ProfileUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Load profile from Prisma profiles table
  let profile: any = null;
  try {
    profile = await prisma.orm.public.Profiles.where({ id: user.id }).first();
  } catch (err: any) {
    console.error('[AUTH GET_CURRENT_USER] Error querying Prisma profiles table:', err?.message || err);
  }

  if (!profile || profile.isActive === false) {
    await supabase.auth.signOut();
    redirect('/login?error=account_disabled');
  }

  const cleanProfile = convertBigInts(profile);

  return {
    id: String(cleanProfile.id),
    fullName: cleanProfile.fullName,
    email: cleanProfile.email,
    isActive: cleanProfile.isActive,
    createdAt: String(cleanProfile.createdAt),
  };
}
