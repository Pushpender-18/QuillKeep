'use client';

import * as React from 'react';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal';

export const LayoutHotkeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = React.useState(false);

  useHotkeys({
    onOpenShortcutsModal: () => setIsShortcutsModalOpen(true),
  });

  React.useEffect(() => {
    const handleOpenModal = () => setIsShortcutsModalOpen(true);
    const handleCloseModal = () => setIsShortcutsModalOpen(false);

    window.addEventListener('open-keyboard-shortcuts-modal', handleOpenModal);
    window.addEventListener('close-all-modals', handleCloseModal);

    return () => {
      window.removeEventListener('open-keyboard-shortcuts-modal', handleOpenModal);
      window.removeEventListener('close-all-modals', handleCloseModal);
    };
  }, []);

  return (
    <>
      {children}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </>
  );
};
