'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { globalSearchAction, GlobalSearchResultItem } from '@/app/actions/search';
import { Search, X, Building2, User, MessageSquare, PlusCircle, CalendarPlus, LayoutDashboard, CheckSquare, ArrowRight, CornerDownLeft, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { useTheme } from '@/components/theme-provider';

interface QuickActionItem {
  id: string;
  type: 'action';
  title: string;
  icon: React.ElementType;
  shortcut?: string;
  href?: string;
  onSelect?: () => void;
}

export interface CommandPaletteRef {
  open: () => void;
  close: () => void;
}

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    companies: GlobalSearchResultItem[];
    contacts: GlobalSearchResultItem[];
    remarks: GlobalSearchResultItem[];
  }>({ companies: [], contacts: [], remarks: [] });

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const requestCountRef = React.useRef(0);

  // Global keyboard listener for Cmd+K / Ctrl+K & Esc
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for custom trigger event (e.g. from Sidebar click)
  React.useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-command-palette', handleOpenEvent);
    return () => window.removeEventListener('open-command-palette', handleOpenEvent);
  }, []);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ companies: [], contacts: [], remarks: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search (200 ms)
  React.useEffect(() => {
    if (!isOpen) return;

    const clean = query.trim();
    if (clean.length < 2) {
      setResults({ companies: [], contacts: [], remarks: [] });
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    const currentReq = ++requestCountRef.current;

    const handler = setTimeout(async () => {
      const res = await globalSearchAction(clean);
      if (currentReq === requestCountRef.current) {
        setLoading(false);
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setResults({ companies: [], contacts: [], remarks: [] });
        }
        setSelectedIndex(0);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [query, isOpen]);

  // Quick actions definition
  const allQuickActions: QuickActionItem[] = [
    {
      id: 'qa-add-company',
      type: 'action',
      title: 'Create new company',
      icon: PlusCircle,
      href: '/companies?new=1',
    },
    {
      id: 'qa-add-reminder',
      type: 'action',
      title: 'Set follow-up reminder',
      icon: CalendarPlus,
      href: '/tasks?new=1',
    },
    {
      id: 'qa-dashboard',
      type: 'action',
      title: 'Go to Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    {
      id: 'qa-companies',
      type: 'action',
      title: 'Go to Companies',
      icon: Building2,
      href: '/companies',
    },
    {
      id: 'qa-task-hub',
      type: 'action',
      title: 'Go to Task Hub',
      icon: CheckSquare,
      href: '/tasks',
    },
    {
      id: 'qa-toggle-theme',
      type: 'action',
      title: `Toggle Theme (Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode)`,
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      onSelect: () => toggleTheme(),
    },
    {
      id: 'qa-light-theme',
      type: 'action',
      title: 'Switch to Light Theme',
      icon: Sun,
      onSelect: () => setTheme('light'),
    },
    {
      id: 'qa-dark-theme',
      type: 'action',
      title: 'Switch to Dark Theme',
      icon: Moon,
      onSelect: () => setTheme('dark'),
    },
  ];

  // Filter quick actions if query is typed
  const filteredQuickActions = query.trim()
    ? allQuickActions.filter((a) => a.title.toLowerCase().includes(query.trim().toLowerCase()))
    : allQuickActions;

  // Build flattened array of visible items for unified keyboard navigation (Up / Down / Enter)
  const visibleItems: (GlobalSearchResultItem | QuickActionItem)[] = [
    ...results.companies,
    ...results.contacts,
    ...results.remarks,
    ...filteredQuickActions,
  ];

  const handleSelect = (item: GlobalSearchResultItem | QuickActionItem) => {
    setIsOpen(false);
    if ('onSelect' in item && typeof item.onSelect === 'function') {
      item.onSelect();
    } else if ('href' in item && item.href) {
      router.push(item.href);
    } else if ('companyId' in item) {
      router.push(`/companies/${item.companyId}`);
    }
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = visibleItems[selectedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  if (!isOpen) return null;

  // Helper to safely highlight text without dangerouslySetInnerHTML
  const renderHighlightedSnippet = (text: string, highlight: string) => {
    if (!text || !highlight.trim()) return <span>{text}</span>;
    const cleanH = highlight.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(cleanH);
    if (idx === -1) return <span>{text}</span>;

    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + cleanH.length);
    const after = text.substring(idx + cleanH.length);

    return (
      <span>
        {before}
        <mark className="bg-[#0A84FF]/25 text-[#0A84FF] font-medium px-1 rounded">
          {match}
        </mark>
        {after}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/70 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-20 px-4">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      {/* Command Palette Card (Spotlight style, 640px max-width) */}
      <div
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-[640px] rounded-2xl bg-[#161618]/95 border border-white/[0.12] shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <Search className="w-5 h-5 text-[#8E8E93] mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search companies, contacts, remarks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-[#8E8E93] text-base font-normal focus:outline-none tracking-tight"
          />
          <div className="flex items-center gap-2 pl-3">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-[#8E8E93] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="px-2 py-0.5 rounded bg-white/[0.08] text-[#8E8E93] font-mono text-[11px]">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="flex flex-col max-h-[440px] overflow-y-auto divide-y divide-white/[0.06] p-2">
          {loading && (
            <div className="p-8 text-center text-xs text-[#8E8E93] font-medium">
              Searching...
            </div>
          )}

          {!loading && query.trim().length >= 2 && visibleItems.length === 0 && (
            <div className="p-8 text-center text-xs text-[#8E8E93]">
              No results for &quot;<span className="text-white font-medium">{query}</span>&quot;
            </div>
          )}

          {/* Group 1: Companies */}
          {results.companies.length > 0 && (
            <div className="flex flex-col gap-1 py-1.5">
              <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                <span>Companies</span>
                <span>{results.companies.length} matches</span>
              </div>
              {results.companies.map((item) => {
                const itemIndex = visibleItems.indexOf(item);
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-[#0A84FF]/20 text-white border border-[#0A84FF]/30'
                        : 'hover:bg-white/[0.04] text-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.08] text-[#0A84FF] flex items-center justify-center font-bold text-xs shrink-0">
                        {item.companyName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{item.companyName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.status && <StatusPill status={item.status as any} />}
                          {item.isArchived && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FF9F0A]/20 text-[#FF9F0A] text-[10px] font-semibold">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-3">
                      {item.assignedToProfile && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] text-xs text-[#8E8E93]">
                          <Avatar
                            name={item.assignedToProfile.fullName}
                            email={item.assignedToProfile.email}
                            size="sm"
                          />
                          <span className="truncate max-w-[90px]">
                            {item.assignedToProfile.fullName}
                          </span>
                        </div>
                      )}
                      <CornerDownLeft className="w-4 h-4 text-[#8E8E93]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Group 2: Contacts */}
          {results.contacts.length > 0 && (
            <div className="flex flex-col gap-1 py-1.5">
              <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                <span>Contacts</span>
                <span>{results.contacts.length} matches</span>
              </div>
              {results.contacts.map((item) => {
                const itemIndex = visibleItems.indexOf(item);
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-[#0A84FF]/20 text-white border border-[#0A84FF]/30'
                        : 'hover:bg-white/[0.04] text-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/[0.08] text-[#8E8E93] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{item.snippet}</span>
                        <span className="text-xs text-[#8E8E93] truncate">
                          {item.companyName}
                        </span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-[#8E8E93] shrink-0 ml-3" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Group 3: Remarks */}
          {results.remarks.length > 0 && (
            <div className="flex flex-col gap-1 py-1.5">
              <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                <span>Remarks & Notes</span>
                <span>{results.remarks.length} matches</span>
              </div>
              {results.remarks.map((item) => {
                const itemIndex = visibleItems.indexOf(item);
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-[#0A84FF]/20 text-white border border-[#0A84FF]/30'
                        : 'hover:bg-white/[0.04] text-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.08] text-[#8E8E93] flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-white line-clamp-1">
                          {renderHighlightedSnippet(item.snippet || '', query)}
                        </span>
                        <span className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                          {item.companyName}
                        </span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-[#8E8E93] shrink-0 ml-3" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Group 4: Quick Actions */}
          {filteredQuickActions.length > 0 && (
            <div className="flex flex-col gap-1 py-1.5">
              <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                <span>Quick Actions</span>
              </div>
              {filteredQuickActions.map((action) => {
                const Icon = action.icon;
                const itemIndex = visibleItems.indexOf(action);
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={action.id}
                    onClick={() => handleSelect(action)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-150',
                      isSelected
                        ? 'bg-[#0A84FF]/20 text-white border border-[#0A84FF]/30'
                        : 'hover:bg-white/[0.04] text-[#8E8E93] hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#0A84FF]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-white">{action.title}</span>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#8E8E93]" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Keyboard Hint Strip */}
        <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#8E8E93]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.08] font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-white/[0.08] font-mono text-[10px]">↓</kbd>
              <span className="ml-1">Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono text-[10px]">↵</kbd>
              <span className="ml-1">Open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono text-[10px]">Esc</kbd>
              <span className="ml-1">Close</span>
            </div>
          </div>
          <div className="text-[11px] font-mono">
            {visibleItems.length} items
          </div>
        </div>
      </div>
    </div>
  );
};
