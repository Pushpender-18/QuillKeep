'use client';

import * as React from 'react';

interface CompaniesSelectionContextValue {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  isAllMatchingSelected: boolean;
  setIsAllMatchingSelected: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Total count of matching companies for the current params.
   * Set by CompaniesTableBody once data loads (inside keyed boundary).
   * Used by BulkActionsBar (outside keyed boundary) to show correct count.
   */
  totalMatchingCount: number;
  setTotalMatchingCount: React.Dispatch<React.SetStateAction<number>>;
  /**
   * Callback registered by CompaniesTableBody to open the delete modal.
   * Called by BulkActionsBar (outside keyed boundary) when the user clicks delete.
   */
  triggerBulkDelete: () => void;
  setTriggerBulkDelete: (fn: () => void) => void;
  /**
   * Callback registered by CompaniesTableBody to select all matching companies.
   * Called by BulkActionsBar (outside keyed boundary).
   */
  handleSelectAllMatching: () => Promise<void>;
  setHandleSelectAllMatching: (fn: () => Promise<void>) => void;
}

const CompaniesSelectionContext = React.createContext<CompaniesSelectionContextValue | null>(null);

export function CompaniesSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isAllMatchingSelected, setIsAllMatchingSelected] = React.useState(false);
  const [totalMatchingCount, setTotalMatchingCount] = React.useState(0);
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
