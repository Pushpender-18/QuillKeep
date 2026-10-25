'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusPill, LeadStatus } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AddEditCompanyModal } from '@/components/companies/add-edit-company-modal';
import { CompaniesFilterPanel, FilterOption } from '@/components/companies/companies-filter-panel';
import { ManageCustomFieldsModal } from '@/components/companies/custom-field-modal';
import { RowQuickActions } from '@/components/companies/row-quick-actions';
import { BulkActionsBar } from '@/components/companies/bulk-actions-bar';
import { ImportExportModal } from '@/components/import-export/import-export-modal';
import { ReminderModal } from '@/components/reminders/reminder-modal';
import { DeleteArchivedCompaniesModal } from '@/components/companies/delete-company-modal';
import { restoreCompanyAction } from '@/app/actions/companies';
import { getMatchingCompanyIdsAction } from '@/app/actions/bulk-companies';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/date-utils';
import { Plus, Building2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, FilterX, ArrowDownUp, Sparkles } from 'lucide-react';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { CustomFieldDefinition } from '@/lib/custom-fields';

export interface CompanyListRow {
  id: string;
  name: string;
  industryName?: string | null;
  location?: string | null;
  status: string;
  priority: string;
  assignedToProfile?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  lastContactedAt?: string | null;
  isArchived: boolean;
  archiveReason?: string | null;
}

export interface CompaniesListClientProps {
  companies: CompanyListRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentView: 'active' | 'archived';
  currentScope: 'my' | 'all';
  currentSort: 'name' | 'last_contact' | 'priority';
  currentDir: 'asc' | 'desc';
  industries: FilterOption[];
  states: FilterOption[];
  profiles: (ProfileOption & { isActive?: boolean })[];
  customFieldDefinitions: CustomFieldDefinition[];
  currentUserId: string;
}

export const CompaniesListClient: React.FC<CompaniesListClientProps> = ({
  companies,
  totalCount,
  currentPage,
  pageSize,
  currentView,
  currentScope,
  currentSort,
  currentDir,
  industries,
  states,
  profiles,
  customFieldDefinitions,
  currentUserId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isManageCustomFieldsOpen, setIsManageCustomFieldsOpen] = React.useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
  const [reminderModalCompanyId, setReminderModalCompanyId] = React.useState<string | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isAllMatchingSelected, setIsAllMatchingSelected] = React.useState(false);
  const [isLoadingAllMatching, setIsLoadingAllMatching] = React.useState(false);
  const lastSelectedIndexRef = React.useRef<number | null>(null);

  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  // Permanent Delete Modal state
  const [deleteModalConfig, setDeleteModalConfig] = React.useState<{
    isOpen: boolean;
    ids: string[];
    singleCompanyName?: string;
  }>({
    isOpen: false,
    ids: [],
  });

  // Clear selection whenever search, filters, scope or view changes
  const searchParamsString = searchParams.toString();
  React.useEffect(() => {
    setSelectedIds([]);
    setIsAllMatchingSelected(false);
  }, [searchParamsString, currentView, currentScope]);

  // Check for flash_toast from other pages (e.g. redirected after delete)
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

  // Helper to update search params
  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggleSort = (column: 'name' | 'last_contact' | 'priority') => {
    if (currentSort === column) {
      const nextDir = currentDir === 'asc' ? 'desc' : 'asc';
      updateParams({ sort: column, dir: nextDir, page: '1' });
    } else {
      updateParams({ sort: column, dir: 'asc', page: '1' });
    }
  };

  const handleRestore = async (companyId: string) => {
    setRestoringId(companyId);
    const res = await restoreCompanyAction(companyId);
    setRestoringId(null);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Company restored successfully' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to restore company' });
    }
  };

  const handleClearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('status');
    params.delete('state');
    params.delete('industry');
    params.delete('assigned');
    params.delete('priority');
    params.delete('location');

    Array.from(params.keys()).forEach((key) => {
      if (key.startsWith('cf_')) {
        params.delete(key);
      }
    });

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Selection Logic
  const pageCompanyIds = companies.map((c) => c.id);
  const isAllPageSelected = pageCompanyIds.length > 0 && pageCompanyIds.every((id) => selectedIds.includes(id));
  const isPartialPageSelected = pageCompanyIds.some((id) => selectedIds.includes(id)) && !isAllPageSelected;

  const handleHeaderCheckboxChange = () => {
    if (isAllPageSelected) {
      // Unselect current page items
      setSelectedIds(selectedIds.filter((id) => !pageCompanyIds.includes(id)));
      setIsAllMatchingSelected(false);
    } else {
      // Select current page items
      const newSelected = Array.from(new Set([...selectedIds, ...pageCompanyIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleRowCheckboxChange = (e: React.MouseEvent, index: number, companyId: string) => {
    e.stopPropagation();

    let newSelected: string[];
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = companies.slice(start, end + 1).map((c) => c.id);

      if (selectedIds.includes(companyId)) {
        newSelected = selectedIds.filter((id) => !rangeIds.includes(id));
      } else {
        newSelected = Array.from(new Set([...selectedIds, ...rangeIds]));
      }
    } else {
      if (selectedIds.includes(companyId)) {
        newSelected = selectedIds.filter((id) => id !== companyId);
      } else {
        newSelected = [...selectedIds, companyId];
      }
    }

    lastSelectedIndexRef.current = index;
    setSelectedIds(newSelected);
    setIsAllMatchingSelected(false);
  };

  const handleSelectAllMatching = async () => {
    setIsLoadingAllMatching(true);
    const rawParamsObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      rawParamsObj[k] = v;
    });

    const res = await getMatchingCompanyIdsAction(
      rawParamsObj,
      currentView === 'archived' ? { overrideView: 'archived' } : undefined
    );
    setIsLoadingAllMatching(false);

    if (res.success && res.ids) {
      if (res.hasMoreThan500) {
        setToastMessage({
          type: 'error',
          msg: `More than 500 companies match (${res.totalCount} total). Selection is capped at 500 maximum. Kept current page selection.`,
        });
        // keep current page selection
        return;
      }
      setSelectedIds(res.ids);
      setIsAllMatchingSelected(true);
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to select all matching' });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getSortIcon = (column: 'name' | 'last_contact' | 'priority') => {
    if (currentSort !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#52525B] opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    }
    return currentDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#0A84FF] ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#0A84FF] ml-1" />
    );
  };

  const hasActiveFilters =
    Boolean(searchParams.get('q')) ||
    Boolean(searchParams.get('status')) ||
    Boolean(searchParams.get('state')) ||
    Boolean(searchParams.get('industry')) ||
    Boolean(searchParams.get('assigned')) ||
    Boolean(searchParams.get('priority')) ||
    Boolean(searchParams.get('location')) ||
    Array.from(searchParams.keys()).some((k) => k.startsWith('cf_'));

  const filterProfiles = profiles.map((p) => ({
    id: p.id,
    name: p.fullName || p.email || 'User',
    email: p.email,
    isActive: p.isActive,
  }));

  // Map for ReminderModal options
  const reminderCompaniesOptions = companies.map((c) => ({
    id: c.id,
    name: c.name,
    isArchived: c.isArchived,
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
        industries={industries}
        states={states}
        profiles={filterProfiles}
        customFieldDefinitions={customFieldDefinitions}
        onOpenManageCustomFields={() => setIsManageCustomFieldsOpen(true)}
      />

      {/* Select All Matching Banner */}
      {isAllPageSelected && totalCount > pageSize && !isAllMatchingSelected && (
        <div className="w-full bg-[#0A84FF]/10 border border-[#0A84FF]/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0A84FF]" />
            <span>
              All <strong>{companies.length}</strong> companies on this page are selected.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSelectAllMatching}
            disabled={isLoadingAllMatching}
            className="text-[#0A84FF] hover:underline font-semibold cursor-pointer"
          >
            {isLoadingAllMatching ? 'Selecting...' : `Select all ${totalCount} matching companies`}
          </button>
        </div>
      )}

      {isAllMatchingSelected && (
        <div className="w-full bg-[#0A84FF]/10 border border-[#0A84FF]/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0A84FF]" />
            <span>
              All <strong>{selectedIds.length}</strong> matching companies are selected.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setIsAllMatchingSelected(false);
            }}
            className="text-[#8E8E93] hover:text-white underline cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Companies Data Table Card */}
      {companies.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={<FilterX className="w-6 h-6 text-[#FF9F0A]" />}
            title="No companies match your filters"
            description="Try adjusting or clearing your search criteria and filter selections."
            action={
              <Button size="sm" variant="ghost" onClick={handleClearAllFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Building2 className="w-6 h-6 text-[#0A84FF]" />}
            title={currentView === 'archived' ? 'No archived companies' : 'No companies found'}
            description={
              currentView === 'archived'
                ? 'There are no archived companies matching the selected view.'
                : 'Your company lead pipeline is empty. Add a new company to get started.'
            }
            action={
              currentView === 'active' ? (
                <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Company
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="w-full bg-white dark:bg-[#161618] border border-slate-200/70 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
              <thead>
                <tr className="h-11 bg-slate-50/75 dark:bg-[#1A1A1E]/80 border-b border-slate-200/60 dark:border-white/[0.06] text-slate-500 dark:text-[#A1A1AA] text-[11px] font-semibold uppercase tracking-wider select-none">
                  {/* Header Checkbox */}
                  <th className="w-12 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartialPageSelected;
                      }}
                      onChange={handleHeaderCheckboxChange}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#1F1F23] accent-[#0A84FF] cursor-pointer"
                    />
                  </th>

                  {/* Company Name (Sortable) */}
                  <th
                    onClick={() => handleToggleSort('name')}
                    className="w-[22%] px-3.5 cursor-pointer hover:text-white transition-colors group"
                  >
                    <div className="flex items-center">
                      <span>Company Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>

                  {/* Industry */}
                  <th className="w-[13%] px-3.5">Industry</th>

                  {/* Location */}
                  <th className="w-[13%] px-3">Location</th>

                  {/* Status Pill */}
                  <th className="w-[13%] px-3">Status</th>

                  {/* Priority (Sortable) */}
                  <th
                    onClick={() => handleToggleSort('priority')}
                    className="w-[10%] px-3 cursor-pointer hover:text-white transition-colors group"
                  >
                    <div className="flex items-center">
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </div>
                  </th>

                  {/* Assigned To */}
                  <th className={`${currentView === 'archived' ? 'w-[11%]' : 'w-[12%]'} px-3`}>Assigned To</th>

                  {/* Last Contacted / Archive Reason */}
                  {currentView === 'archived' ? (
                    <th className="w-[14%] px-3">Archive Reason</th>
                  ) : (
                    <th
                      onClick={() => handleToggleSort('last_contact')}
                      className="w-[11%] px-3 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center">
                        <span>Last Contacted</span>
                        {getSortIcon('last_contact')}
                      </div>
                    </th>
                  )}

                  {/* Row Actions column */}
                  <th className="w-24 px-2 text-right"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs font-normal text-slate-800 dark:text-[#E4E4E7]">
                {companies.map((c, index) => {
                  const isSelected = selectedIds.includes(c.id);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/companies/${c.id}`)}
                      className={`h-14 hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                        isSelected ? 'bg-blue-50/70 dark:bg-[#0A84FF]/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 text-center" onClick={(e) => handleRowCheckboxChange(e, index, c.id)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#1F1F23] accent-[#0A84FF] cursor-pointer"
                        />
                      </td>

                      {/* Company Name */}
                      <td className="px-3.5 font-medium text-white truncate">
                        {c.name}
                      </td>

                      {/* Industry */}
                      <td className="px-3.5 text-[#A1A1AA] truncate">
                        {c.industryName || <span className="text-[#52525B]">—</span>}
                      </td>

                      {/* Location */}
                      <td className="px-3 text-[#A1A1AA] truncate">
                        {c.location || <span className="text-[#52525B]">—</span>}
                      </td>

                      {/* Status Pill */}
                      <td className="px-3">
                        <StatusPill status={c.status as any} />
                      </td>

                      {/* Priority Tag */}
                      <td className="px-3">
                        <PriorityTag priority={c.priority as any} />
                      </td>

                      {/* Assigned To Avatar */}
                      <td className="px-3">
                        {c.assignedToProfile ? (
                          <div className="flex items-center gap-2 min-w-0" title={c.assignedToProfile.email}>
                            <Avatar
                              name={c.assignedToProfile.fullName}
                              email={c.assignedToProfile.email}
                              size="sm"
                            />
                            <span className="truncate text-xs text-[#E4E4E7]">
                              {c.assignedToProfile.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#52525B] text-xs">—</span>
                        )}
                      </td>

                      {/* Last Contacted / Archive Reason */}
                      {currentView === 'archived' ? (
                        <td className="px-3 text-[#A1A1AA] truncate italic">
                          {c.archiveReason || 'No reason specified'}
                        </td>
                      ) : (
                        <td className="px-3 text-[#A1A1AA] truncate">
                          {c.lastContactedAt ? (
                            formatRelativeTime(c.lastContactedAt)
                          ) : (
                            <span className="text-[#52525B]">—</span>
                          )}
                        </td>
                      )}

                      {/* Hover Action Buttons */}
                      <td className="px-2 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                        <RowQuickActions
                          companyId={c.id}
                          companyName={c.name}
                          currentStatus={c.status as LeadStatus}
                          isArchived={c.isArchived}
                          profiles={profiles}
                          onOpenReminderModal={(cId) => setReminderModalCompanyId(cId)}
                          onRestoreCompany={(cId) => handleRestore(cId)}
                          onDeletePermanently={(cId, cName) =>
                            setDeleteModalConfig({
                              isOpen: true,
                              ids: [cId],
                              singleCompanyName: cName,
                            })
                          }
                          onSuccessToast={(msg) => setToastMessage({ type: 'success', msg })}
                          onErrorToast={(msg) => setToastMessage({ type: 'error', msg })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Server-Side Pagination */}
          <div className="h-12 px-4 bg-slate-50/50 dark:bg-[#18181B] border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-[#8E8E93]">
            <div>
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} companies
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => updateParams({ page: String(currentPage - 1) })}
                  className="h-7 px-2.5 text-xs text-[#8E8E93] hover:text-white"
                >
                  Previous
                </Button>
                <span className="font-medium text-white px-1">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateParams({ page: String(currentPage + 1) })}
                  className="h-7 px-2.5 text-xs text-[#8E8E93] hover:text-white"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalMatchingCount={totalCount}
        isAllMatchingSelected={isAllMatchingSelected}
        onSelectAllMatching={handleSelectAllMatching}
        onClearSelection={() => setSelectedIds([])}
        currentView={currentView}
        profiles={profiles}
        onOpenExportModal={() => setIsImportExportOpen(true)}
        onOpenDeleteModal={() =>
          setDeleteModalConfig({
            isOpen: true,
            ids: selectedIds,
          })
        }
        onSuccess={(msg) => {
          setToastMessage({ type: 'success', msg });
          router.refresh();
        }}
        onError={(msg) => setToastMessage({ type: 'error', msg })}
      />

      {/* Permanent Delete Modal for Archived Companies */}
      {deleteModalConfig.isOpen && (
        <DeleteArchivedCompaniesModal
          isOpen={deleteModalConfig.isOpen}
          ids={deleteModalConfig.ids}
          singleCompanyName={deleteModalConfig.singleCompanyName}
          onClose={() =>
            setDeleteModalConfig({
              isOpen: false,
              ids: [],
            })
          }
          onExportFirst={() => {
            setIsImportExportOpen(true);
          }}
          onSuccess={(deletedCount, skippedCount) => {
            const skippedNote =
              skippedCount > 0 ? ` (${skippedCount} skipped because they were restored)` : '';
            setToastMessage({
              type: 'success',
              msg: `Deleted ${deletedCount} ${deletedCount === 1 ? 'company' : 'companies'}${skippedNote}`,
            });
            setSelectedIds([]);
            setIsAllMatchingSelected(false);
            setDeleteModalConfig({ isOpen: false, ids: [] });
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
            router.refresh();
          }}
          onError={(errorMsg) => {
            // Keep the selection and the modal open with the error
            setToastMessage({ type: 'error', msg: errorMsg });
          }}
        />
      )}

      {/* Add / Edit Company Modal */}
      <AddEditCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        industries={industries.filter((i) => i.isActive !== false)}
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

      {/* Quick Action Reminder Modal (with company locked) */}
      {reminderModalCompanyId && (
        <ReminderModal
          isOpen={Boolean(reminderModalCompanyId)}
          onClose={() => setReminderModalCompanyId(null)}
          prefilledCompanyId={reminderModalCompanyId}
          companies={reminderCompaniesOptions}
          profiles={profiles}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};
