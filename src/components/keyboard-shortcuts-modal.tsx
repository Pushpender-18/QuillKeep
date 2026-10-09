'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Search, Keyboard, X } from 'lucide-react';

export interface ShortcutItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'General';
  description: string;
  keys: string[];
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(navigator.platform.toUpperCase().includes('MAC'));
    }
  }, []);

  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: ShortcutItem[] = [
    // Navigation
    { id: '1', category: 'Navigation', description: 'Open Quick Find / Command Palette', keys: [modKey, 'K'] },
    { id: '2', category: 'Navigation', description: 'Focus Companies search bar', keys: ['/'] },
    { id: '3', category: 'Navigation', description: 'Go to Dashboard', keys: ['G', 'D'] },
    { id: '4', category: 'Navigation', description: 'Go to Companies', keys: ['G', 'C'] },
    { id: '5', category: 'Navigation', description: 'Go to Task Hub', keys: ['G', 'T'] },

    // Actions
    { id: '6', category: 'Actions', description: 'New item (Company on /companies, Reminder on /tasks)', keys: ['N'] },
    { id: '7', category: 'Actions', description: 'Focus remark composer on Company Detail', keys: ['R'] },
    { id: '8', category: 'Actions', description: 'Open status dropdown on Company Detail', keys: ['S'] },
    { id: '9', category: 'Actions', description: 'Save remark, quick note or inline edit', keys: [modKey, 'Enter'] },

    // General
    { id: '10', category: 'General', description: 'Show keyboard shortcuts', keys: ['?'] },
    { id: '11', category: 'General', description: 'Close any modal, popover or palette', keys: ['Esc'] },
  ];

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories: Array<'Navigation' | 'Actions' | 'General'> = ['Navigation', 'Actions', 'General'];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[540px] p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF]">
              <Keyboard className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Keyboard Shortcuts</h2>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#1C1C1E] border border-white/10 rounded-xl text-xs text-white placeholder:text-[#71717A] outline-none focus:border-[#0A84FF] transition-colors"
          />
        </div>

        {/* Shortcuts List by Category */}
        <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
          {filteredShortcuts.length === 0 ? (
            <p className="text-xs text-[#8E8E93] py-6 text-center">No matching shortcuts found</p>
          ) : (
            categories.map((cat) => {
              const catShortcuts = filteredShortcuts.filter((s) => s.category === cat);
              if (catShortcuts.length === 0) return null;

              return (
                <div key={cat} className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    {cat}
                  </span>

                  <div className="flex flex-col gap-1 rounded-xl bg-[#18181B] border border-white/5 divide-y divide-white/5 p-1">
                    {catShortcuts.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 flex items-center justify-between text-xs text-[#E4E4E7]"
                      >
                        <span>{item.description}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, idx) => (
                            <kbd
                              key={idx}
                              className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 font-mono text-[11px] font-medium text-white shadow-sm"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
