'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { AddEditCompanyModal } from '@/components/companies/add-edit-company-modal';
import { CompaniesFilterPanel, FilterOption } from '@/components/companies/companies-filter-panel';
import { ManageCustomFieldsModal } from '@/components/companies/custom-field-modal';
import { BulkActionsBar } from '@/components/companies/bulk-actions-bar';
import { ImportExportModal } from '@/components/import-export/import-export-modal';
import { Toast } from '@/components/ui/toast';
import {
  CompaniesSelectionProvider,
  useCompaniesSelection,
} from '@/components/companies/companies-selection-context';
import { Plus, ArrowDownUp } from 'lucide-react';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { CustomFieldDefinition } from '@/lib/custom-fields';

export interface CompaniesControlsProps {
  rankedIndustries: FilterOption[];
  states: FilterOption[];
  profiles: (ProfileOption & { isActive?: boolean })[];
  customFieldDefinitions: CustomFieldDefinition[];
  currentUserId: string;
  /** The keyed <Suspense> containing <CompaniesListRows /> — passed in from the server shell */
  listSlot: React.ReactNode;
}

/**
 * Outer wrapper — provides the selection context so selectedIds live outside
 * the keyed <Suspense> boundary and survive list re-mounts on param changes.
 */
export function CompaniesControls(props: CompaniesControlsProps) {
  return (
    <CompaniesSelectionProvider>
      <CompaniesControlsInner {...props} />
    </CompaniesSelectionProvider>
  );
}

/**
 * Inner client component — reads params from useSearchParams() so it always
 * reflects the current URL without needing server re-renders.
 *
 * Renders:
 *  - Active/Archived toggle
 *  - My Leads/All Team toggle
 *  - Import/Export and Add Company buttons
 *  - Search bar and filter pills (CompaniesFilterPanel)
 *  - listSlot (the keyed Suspense boundary with CompaniesListRows inside)
 *  - BulkActionsBar (uses totalMatchingCount from context, calls callbacks registered
 *    by CompaniesTableBody)
 *  - Add/Edit Company, Manage Custom Fields, and Import/Export modals
 */
function CompaniesControlsInner({
  rankedIndustries,
  states,
  profiles,
  customFieldDefinitions,
  currentUserId,
  listSlot,
}: CompaniesControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    selectedIds,
    setSelectedIds,
    isAllMatchingSelected,
    setIsAllMatchingSelected,
    totalMatchingCount,
    triggerBulkDelete,
    handleSelectAllMatching,
  } = useCompaniesSelection();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isManageCustomFieldsOpen, setIsManageCustomFieldsOpen] = React.useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(
    null
  );

  // Clear selection whenever search, filters, scope or view changes (but NOT page).
  // Excluded from clearing: page param.
  const selectionClearKey = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    return p.toString();
  }, [searchParams]);

  React.useEffect(() => {
    setSelectedIds([]);
    setIsAllMatchingSelected(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionClearKey]);

  // Check for flash_toast from other pages (e.g. redirected after delete)
  const searchParamsString = searchParams.toString();
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem('flash_toast');
      if (stored) {
        sessionStorage.removeItem('flash_toast');
        const parsed = JSON.parse(stored);
        if (parsed?.msg) {
          setToastMessage({ type: parsed.type || 'success', msg: parsed.msg });
        }
      }
    } catch {}
  }, [pathname, searchParamsString]);

  // Handle ?new=1 & hotkeys custom event
  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsAddModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('new');
      router.replace(`${pathname}?${params.toString()}`);
    }

    const handleTriggerAddCompany = () => setIsAddModalOpen(true);
    window.addEventListener('trigger-add-company', handleTriggerAddCompany);
    return () => window.removeEventListener('trigger-add-company', handleTriggerAddCompany);
  }, [searchParams, pathname, router]);

  // Read current view/scope from URL (client-side, always up-to-date)
  const currentView = (searchParams.get('view') === 'archived' ? 'archived' : 'active') as
    | 'active'
    | 'archived';
  const currentScope = (searchParams.get('scope') === 'all' ? 'all' : 'my') as 'my' | 'all';

  // Helper to update search params
  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const filterProfiles = profiles.map((p) => ({
    id: p.id,
    name: p.fullName || p.email || 'User',
    email: p.email,
    isActive: p.isActive,
  }));

  return (
    <div className="flex flex-col gap-5 w-full">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.msg}
          isOpen={Boolean(toastMessage)}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Left Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedControl
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={currentView}
            onChange={(val) => updateParams({ view: val, page: '1' })}
            size="sm"
          />

          <SegmentedControl
            options={[
              { value: 'my', label: 'My Leads' },
              { value: 'all', label: 'All Team Leads' },
            ]}
            value={currentScope}
            onChange={(val) => updateParams({ scope: val, page: '1' })}
            size="sm"
          />
        </div>

        {/* Right Actions: Import/Export & Add Company */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            onClick={() => setIsImportExportOpen(true)}
            className="h-9 px-3 text-xs border border-white/10 hover:bg-white/[0.08]"
          >
            <ArrowDownUp className="w-3.5 h-3.5 mr-1.5 text-[#0A84FF]" />
            Import / Export
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)} className="h-9 px-4">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Search & Filters Panel Component */}
      <CompaniesFilterPanel
        currentScope={currentScope}
        industries={rankedIndustries}
        states={states}
        profiles={filterProfiles}
        customFieldDefinitions={customFieldDefinitions}
        onOpenManageCustomFields={() => setIsManageCustomFieldsOpen(true)}
      />

      {/* List slot: <Suspense key={listKey}><CompaniesListRows /></Suspense> */}
      {listSlot}

      {/* Floating Bulk Actions Bar — outside keyed boundary so it persists during list reloads */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalMatchingCount={totalMatchingCount}
        isAllMatchingSelected={isAllMatchingSelected}
        onSelectAllMatching={handleSelectAllMatching}
        onClearSelection={() => {
          setSelectedIds([]);
          setIsAllMatchingSelected(false);
        }}
        currentView={currentView}
        profiles={profiles}
        onOpenExportModal={() => setIsImportExportOpen(true)}
        onOpenDeleteModal={triggerBulkDelete}
        onSuccess={(msg) => {
          setToastMessage({ type: 'success', msg });
          router.refresh();
        }}
        onError={(msg) => setToastMessage({ type: 'error', msg })}
      />

      {/* Add / Edit Company Modal */}
      <AddEditCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        industries={rankedIndustries.filter((i) => i.isActive !== false)}
        states={states.filter((s) => s.isActive !== false)}
        profiles={profiles.filter((p) => p.isActive !== false)}
        customFieldDefinitions={customFieldDefinitions}
        currentUserId={currentUserId}
        onOpenManageCustomFields={() => setIsManageCustomFieldsOpen(true)}
      />

      {/* Manage Custom Fields Modal */}
      <ManageCustomFieldsModal
        isOpen={isManageCustomFieldsOpen}
        onClose={() => setIsManageCustomFieldsOpen(false)}
        definitions={customFieldDefinitions}
        onRefresh={() => router.refresh()}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        selectedCompanyIds={selectedIds}
        currentSearchParamsStr={searchParams.toString()}
        currentUserId={currentUserId}
        profiles={profiles}
        onRefreshList={() => router.refresh()}
        onSuccessToast={(msg) => setToastMessage({ type: 'success', msg })}
        onErrorToast={(msg) => setToastMessage({ type: 'error', msg })}
      />
    </div>
  );
}
