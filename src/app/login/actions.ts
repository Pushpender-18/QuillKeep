'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const supabase = await createClient();
  const res = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (res.error) {
    console.error('[AUTH LOGIN ACTION] Login failed:', res.error.message);
    return { error: res.error.message || 'Incorrect email or password. Please try again.' };
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[AUTH SIGN OUT] Sign out error:', error.message);
  }
  redirect('/login');
}
