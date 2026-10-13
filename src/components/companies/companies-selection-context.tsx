'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

interface CompaniesSelectionContextValue {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  isAllMatchingSelected: boolean;
  setIsAllMatchingSelected: React.Dispatch<React.SetStateAction<boolean>>;
  totalMatchingCount: number;
  setTotalMatchingCount: React.Dispatch<React.SetStateAction<number>>;
  triggerBulkDelete: () => void;
  setTriggerBulkDelete: (fn: () => void) => void;
  handleSelectAllMatching: () => Promise<void>;
  setHandleSelectAllMatching: (fn: () => Promise<void>) => void;
  currentUserId: string | null;
  setCurrentUserId: (id: string) => void;
  // Optimistic URL parameters state & transition updater
  optimisticParams: Record<string, string>;
  latestOptimisticRef: React.MutableRefObject<Record<string, string>>;
  updateParams: (
    newParams: Record<string, string | null>,
    options?: { replace?: boolean }
  ) => void;
  isPending: boolean;
}

const CompaniesSelectionContext = React.createContext<CompaniesSelectionContextValue | null>(null);

export function CompaniesSelectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isAllMatchingSelected, setIsAllMatchingSelected] = React.useState(false);
  const [totalMatchingCount, setTotalMatchingCount] = React.useState(0);
  const [currentUserId, setCurrentUserIdState] = React.useState<string | null>(null);

  const setCurrentUserId = React.useCallback((id: string) => {
    setCurrentUserIdState((prev) => (prev === id ? prev : id));
  }, []);

  // Base state derived strictly from the URL (source of truth)
  const urlParams = React.useMemo(() => {
    const map: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      map[key] = value;
    });
    return map;
  }, [searchParams]);

  // useOptimistic over URL-derived state
  const [optimisticParams, setOptimisticParams] = useOptimistic(
    urlParams,
    (current: Record<string, string>, update: Record<string, string | null>) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(update)) {
        if (value === null || value === '') {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      return next;
    }
  );

  // Ref tracking the latest optimistic state for rapid sequential clicks
  const latestOptimisticRef = React.useRef<Record<string, string>>(optimisticParams);
  React.useEffect(() => {
    latestOptimisticRef.current = optimisticParams;
  }, [optimisticParams]);

  // Use refs for callbacks to avoid stale closure issues
  const triggerBulkDeleteRef = React.useRef<() => void>(() => {});
  const handleSelectAllMatchingRef = React.useRef<() => Promise<void>>(async () => {});

  const setTriggerBulkDelete = React.useCallback((fn: () => void) => {
    triggerBulkDeleteRef.current = fn;
  }, []);

  const setHandleSelectAllMatching = React.useCallback((fn: () => Promise<void>) => {
    handleSelectAllMatchingRef.current = fn;
  }, []);

  const triggerBulkDelete = React.useCallback(() => {
    triggerBulkDeleteRef.current();
  }, []);

  const handleSelectAllMatching = React.useCallback(async () => {
    await handleSelectAllMatchingRef.current();
  }, []);

  // Helper to update search params optimistically and push/replace URL
  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>, options?: { replace?: boolean }) => {
      // 1. Compute next URL params dictionary starting from the freshest optimistic state
      const base = { ...latestOptimisticRef.current };
      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === '') {
          delete base[key];
        } else {
          base[key] = value;
        }
      }
      latestOptimisticRef.current = base;

      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(base)) {
        sp.set(k, v);
      }
      const targetUrl = `${pathname}?${sp.toString()}`;

      // 2. Call BOTH setOptimistic and router.push (or replace) inside the SAME startTransition!
      startTransition(() => {
        setOptimisticParams(newParams);

        if (options?.replace) {
          router.replace(targetUrl);
        } else {
          router.push(targetUrl);
        }
      });
    },
    [pathname, router, setOptimisticParams]
  );

  return (
    <CompaniesSelectionContext.Provider
      value={{
        selectedIds,
        setSelectedIds,
        isAllMatchingSelected,
        setIsAllMatchingSelected,
        totalMatchingCount,
        setTotalMatchingCount,
        triggerBulkDelete,
        setTriggerBulkDelete,
        handleSelectAllMatching,
        setHandleSelectAllMatching,
        currentUserId,
        setCurrentUserId,
        optimisticParams,
        latestOptimisticRef,
        updateParams,
        isPending,
      }}
    >
      {children}
    </CompaniesSelectionContext.Provider>
  );
}

export function useCompaniesSelection() {
  const ctx = React.useContext(CompaniesSelectionContext);
  if (!ctx) throw new Error('useCompaniesSelection must be used inside CompaniesSelectionProvider');
  return ctx;
}

