'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useHotkeys } from '@/hooks/use-hotkeys';

const DynamicKeyboardShortcutsModal = dynamic(
  () => import('@/components/keyboard-shortcuts-modal').then((mod) => ({ default: mod.KeyboardShortcutsModal })),
  { ssr: false }
);

export const LayoutHotkeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = React.useState(false);

  useHotkeys({
    onOpenShortcutsModal: () => setIsShortcutsModalOpen(true),
  });

  React.useEffect(() => {
    const handleOpenModal = () => setIsShortcutsModalOpen(true);
    const handleCloseModal = () => setIsShortcutsModalOpen(false);

    window.addEventListener('open-keyboard-shortcuts-modal', handleOpenModal);
    window.addEventListener('preload-keyboard-shortcuts-modal', () => {
      import('@/components/keyboard-shortcuts-modal');
    });
    window.addEventListener('close-all-modals', handleCloseModal);

    return () => {
      window.removeEventListener('open-keyboard-shortcuts-modal', handleOpenModal);
      window.removeEventListener('close-all-modals', handleCloseModal);
    };
  }, []);

  return (
    <>
      {children}
      {isShortcutsModalOpen && (
        <DynamicKeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      )}
    </>
  );
};
