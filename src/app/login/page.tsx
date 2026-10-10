'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

function LoginFormContent() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = React.useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const displayError = state?.error || (errorParam === 'session_expired' ? 'Session expired. Please sign in again.' : errorParam === 'account_disabled' ? 'Your account has been disabled.' : null);

  return (
    <div className="relative w-full max-w-[400px] bg-[#161618]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 sm:p-10 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col items-center overflow-hidden">
      {/* Subtle Top Inner Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Glowing Brand Logo with Ambient Center Bloom */}
      <div className="relative flex items-center justify-center mb-5">
        <div className="absolute top-1 w-16 h-16 bg-[#0A84FF]/25 rounded-full blur-xl pointer-events-none" />
        <Image
          src="/logo.png"
          alt="QuillKeep Logo"
          width={120}
          height={120}
          className="w-28 h-auto object-contain relative z-10 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
          priority
        />
      </div>

      <h1 className="text-[26px] font-normal text-white tracking-tight mb-1 text-center">
        Welcome back
      </h1>
      <p className="text-sm text-[#8E8E93] text-center mb-8">
        Sign in to continue
      </p>

      <form action={formAction} className="w-full flex flex-col gap-4">
        <Input
          label="Email"
          id="email"
          name="email"
          type="email"
          placeholder="name@company.com"
          required
          autoComplete="email"
          icon={<Mail className="w-4 h-4" />}
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label
            htmlFor="password"
            className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]"
          >
            Password
          </label>
          <div className="relative w-full flex items-center">
            <div className="absolute left-3.5 text-[#8E8E93] pointer-events-none flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className={`w-full bg-[#1C1C1E] text-white placeholder:text-zinc-500 text-sm px-3.5 py-2.5 pl-10 pr-10 rounded-[10px] border outline-none transition duration-150 ${
                displayError
                  ? 'border-[#FF453A]/60 focus:border-[#FF453A] focus:ring-2 focus:ring-[#FF453A]/25'
                  : 'border-white/[0.08] focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/25 hover:border-white/[0.14]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[#8E8E93] hover:text-white transition p-1"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {displayError && (
          <div className="flex items-center gap-1.5 mt-1 text-[#FF453A] bg-[#FF453A]/10 border border-[#FF453A]/20 p-2.5 rounded-[10px]">
            <span className="text-xs text-[#FF453A] font-medium">{displayError}</span>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isPending}
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0B] flex items-center justify-center p-4 selection:bg-[#0A84FF]/30 selection:text-white">
      <React.Suspense fallback={<div className="text-sm text-[#8E8E93]">Loading login form...</div>}>
        <LoginFormContent />
      </React.Suspense>
    </div>
  );
}
