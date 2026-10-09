'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface HotkeysConfig {
  onOpenShortcutsModal?: () => void;
}

export function useHotkeys({ onOpenShortcutsModal }: HotkeysConfig = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const gKeyTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Always handle Esc regardless of typing or modal state
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('close-all-modals'));
        return;
      }

      // Check if user is typing in input elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const isTyping =
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable;
        if (isTyping) return;
      }

      // Check if any modal or dialog is open
      const isModalOpen = Boolean(document.querySelector('[role="dialog"], .modal-backdrop'));
      if (isModalOpen) return;

      // Ignore when modifier keys are pressed (except specific combos handled elsewhere like Cmd+K)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const keyUpper = e.key.toUpperCase();
      const now = Date.now();

      // Check for two-key sequence: G then D / C / T
      if (gKeyTimeRef.current && now - gKeyTimeRef.current <= 1500) {
        gKeyTimeRef.current = null;
        if (keyUpper === 'D') {
          e.preventDefault();
          router.push('/dashboard');
          return;
        } else if (keyUpper === 'C') {
          e.preventDefault();
          router.push('/companies');
          return;
        } else if (keyUpper === 'T') {
          e.preventDefault();
          router.push('/tasks');
          return;
        }
      }

      if (keyUpper === 'G') {
        gKeyTimeRef.current = now;
        return;
      }

      // Single key shortcuts
      if (e.key === '/') {
        e.preventDefault();
        if (pathname !== '/companies') {
          router.push('/companies');
          setTimeout(() => {
            const input = document.getElementById('companies-search-input') as HTMLInputElement | null;
            if (input) input.focus();
          }, 200);
        } else {
          const input = document.getElementById('companies-search-input') as HTMLInputElement | null;
          if (input) input.focus();
        }
        return;
      }

      if (keyUpper === 'N') {
        e.preventDefault();
        if (pathname.startsWith('/companies')) {
          window.dispatchEvent(new CustomEvent('trigger-add-company'));
        } else if (pathname.startsWith('/tasks')) {
          window.dispatchEvent(new CustomEvent('trigger-add-reminder'));
        }
        return;
      }

      if (keyUpper === 'R') {
        if (pathname.startsWith('/companies/')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('focus-remark-composer'));
        }
        return;
      }

      if (keyUpper === 'S') {
        if (pathname.startsWith('/companies/')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('open-status-dropdown'));
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        if (onOpenShortcutsModal) {
          onOpenShortcutsModal();
        } else {
          window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts-modal'));
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname, onOpenShortcutsModal]);
}
