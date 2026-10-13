'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StatusPill, LeadStatus } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RowQuickActions } from '@/components/companies/row-quick-actions';
import { ReminderModal } from '@/components/reminders/reminder-modal';
import { DeleteArchivedCompaniesModal } from '@/components/companies/delete-company-modal';
import { restoreCompanyAction } from '@/app/actions/companies';
import { getMatchingCompanyIdsAction } from '@/app/actions/bulk-companies';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/date-utils';
import { Building2, ArrowUpDown, ArrowUp, ArrowDown, FilterX, Sparkles } from 'lucide-react';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { useCompaniesSelection } from '@/components/companies/companies-selection-context';
import type { CompanyListRow } from '@/components/companies/companies-list-client';

export interface CompaniesTableBodyProps {
  companies: CompanyListRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentView: 'active' | 'archived';
  currentScope: 'my' | 'all';
  currentSort: 'name' | 'last_contact' | 'priority';
  currentDir: 'asc' | 'desc';
  profiles: (ProfileOption & { isActive?: boolean })[];
  currentUserId: string;
}

/**
 * Client component that renders the table card (header + body + pagination + empty state).
 * Lives INSIDE the keyed <Suspense> boundary — re-mounts on every param change.
 *
 * Selection state is read from / written to CompaniesSelectionContext, which lives OUTSIDE
 * the keyed boundary. This means:
 *  - selection survives paging (page param change → key change → this unmounts/remounts
 *    but selectedIds in context survives)
 *  - filter/scope/search changes clear selection via effect in CompaniesControls
 *
 * On mount, registers handleSelectAllMatching and openDeleteModal callbacks into the context
 * so CompaniesControls (outside keyed boundary) can call them from BulkActionsBar.
 */
export const CompaniesTableBody: React.FC<CompaniesTableBodyProps> = ({
  companies,
  totalCount,
  currentPage,
  pageSize,
  currentView,
  currentSort,
  currentDir,
  profiles,
  currentUserId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    selectedIds,
    setSelectedIds,
    isAllMatchingSelected,
    setIsAllMatchingSelected,
    setTotalMatchingCount,
    setTriggerBulkDelete,
    setHandleSelectAllMatching,
    setCurrentUserId,
    optimisticParams,
    updateParams,
  } = useCompaniesSelection();

  // Report currentUserId to context so modals outside keyed boundary can use it
  React.useEffect(() => {
    if (currentUserId) {
      setCurrentUserId(currentUserId);
    }
  }, [currentUserId, setCurrentUserId]);

  const [isLoadingAllMatching, setIsLoadingAllMatching] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [reminderModalCompanyId, setReminderModalCompanyId] = React.useState<string | null>(null);
  const [isImportExportTrigger, setIsImportExportTrigger] = React.useState(false);

  const [deleteModalConfig, setDeleteModalConfig] = React.useState<{
    isOpen: boolean;
    ids: string[];
    singleCompanyName?: string;
  }>({
    isOpen: false,
    ids: [],
  });

  const lastSelectedIndexRef = React.useRef<number | null>(null);

  // Publish totalCount to context so BulkActionsBar (outside keyed boundary) shows correct count
  React.useEffect(() => {
    setTotalMatchingCount(totalCount);
  }, [totalCount, setTotalMatchingCount]);

  // Reset lastSelectedIndex when companies change (list refreshed)
  React.useEffect(() => {
    lastSelectedIndexRef.current = null;
  }, [companies]);

  // Register the select-all-matching handler with the context
  React.useEffect(() => {
    setHandleSelectAllMatching(handleSelectAllMatchingInner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), currentView]);

  // Register the bulk-delete trigger with the context
  React.useEffect(() => {
    setTriggerBulkDelete(() => {
      setDeleteModalConfig({
        isOpen: true,
        ids: selectedIds,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const effectiveSort = (optimisticParams.sort === 'last_contact' || optimisticParams.sort === 'priority' ? optimisticParams.sort : currentSort) as 'name' | 'last_contact' | 'priority';
  const effectiveDir = (optimisticParams.dir === 'desc' || optimisticParams.dir === 'asc' ? optimisticParams.dir : currentDir) as 'asc' | 'desc';
  const effectivePage = optimisticParams.page ? Math.max(1, parseInt(optimisticParams.page, 10)) : currentPage;

  const handleToggleSort = (column: 'name' | 'last_contact' | 'priority') => {
    if (effectiveSort === column) {
      const nextDir = effectiveDir === 'asc' ? 'desc' : 'asc';
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
    const updates: Record<string, string | null> = {
      q: null,
      status: null,
      state: null,
      industry: null,
      assigned: null,
      priority: null,
      location: null,
      page: '1',
    };
    Object.keys(optimisticParams).forEach((key) => {
      if (key.startsWith('cf_')) updates[key] = null;
    });
    updateParams(updates);
  };

  // Selection Logic
  const pageCompanyIds = companies.map((c) => c.id);
  const isAllPageSelected = pageCompanyIds.length > 0 && pageCompanyIds.every((id) => selectedIds.includes(id));
  const isPartialPageSelected = pageCompanyIds.some((id) => selectedIds.includes(id)) && !isAllPageSelected;

  const handleHeaderCheckboxChange = () => {
    if (isAllPageSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageCompanyIds.includes(id)));
      setIsAllMatchingSelected(false);
    } else {
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

  async function handleSelectAllMatchingInner() {
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
        return;
      }
      setSelectedIds(res.ids);
      setIsAllMatchingSelected(true);
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to select all matching' });
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  const getSortIcon = (column: 'name' | 'last_contact' | 'priority') => {
    if (effectiveSort !== column) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-[#52525B] opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
      );
    }
    return effectiveDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#0A84FF] ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#0A84FF] ml-1" />
    );
  };

  const hasActiveFilters =
    Boolean(optimisticParams.q) ||
    Boolean(optimisticParams.status) ||
    Boolean(optimisticParams.state) ||
    Boolean(optimisticParams.industry) ||
    Boolean(optimisticParams.assigned) ||
    Boolean(optimisticParams.priority) ||
    Boolean(optimisticParams.location) ||
    Object.keys(optimisticParams).some((k) => k.startsWith('cf_'));

  // Map for ReminderModal options
  const reminderCompaniesOptions = companies.map((c) => ({
    id: c.id,
    name: c.name,
    isArchived: c.isArchived,
  }));

  return (
    <>
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.msg}
          isOpen={Boolean(toastMessage)}
          onClose={() => setToastMessage(null)}
        />
      )}

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
            onClick={handleSelectAllMatchingInner}
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
          />
        )
      ) : (
        <div className="w-full bg-[#141417] border border-[#242428] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
              <thead>
                <tr className="h-11 bg-[#1A1A1E] border-b border-[#26262A] text-[#A1A1AA] text-[11px] font-semibold uppercase tracking-wider select-none">
                  {/* Header Checkbox */}
                  <th className="w-12 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartialPageSelected;
                      }}
                      onChange={handleHeaderCheckboxChange}
                      className="w-4 h-4 rounded border-white/20 bg-[#1F1F23] accent-[#0A84FF] cursor-pointer"
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
                  <th className={`${currentView === 'archived' ? 'w-[11%]' : 'w-[12%]'} px-3`}>
                    Assigned To
                  </th>

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

              <tbody className="divide-y divide-[#242428] text-xs font-normal text-[#E4E4E7]">
                {companies.map((c, index) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/companies/${c.id}`)}
                      className={`h-14 hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#0A84FF]/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 text-center" onClick={(e) => handleRowCheckboxChange(e, index, c.id)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-white/20 bg-[#1F1F23] accent-[#0A84FF] cursor-pointer"
                        />
                      </td>

                      {/* Company Name */}
                      <td className="px-3.5 font-medium text-white truncate">{c.name}</td>

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
                        <StatusPill status={c.status as LeadStatus} />
                      </td>

                      {/* Priority Tag */}
                      <td className="px-3">
                        <PriorityTag priority={c.priority as 'low' | 'medium' | 'high'} />
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
          <div className="h-12 px-4 bg-[#18181B] border-t border-[#26262A] flex items-center justify-between text-xs text-[#8E8E93]">
            <div>
              Showing {totalCount === 0 ? 0 : (effectivePage - 1) * pageSize + 1} to{' '}
              {Math.min(effectivePage * pageSize, totalCount)} of {totalCount} companies
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={effectivePage <= 1}
                  onClick={() => updateParams({ page: String(effectivePage - 1) })}
                  className="h-7 px-2.5 text-xs text-[#8E8E93] hover:text-white"
                >
                  Previous
                </Button>
                <span className="font-medium text-white px-1">
                  {effectivePage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={effectivePage >= totalPages}
                  onClick={() => updateParams({ page: String(effectivePage + 1) })}
                  className="h-7 px-2.5 text-xs text-[#8E8E93] hover:text-white"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permanent Delete Modal for Archived Companies */}
      {deleteModalConfig.isOpen && (
        <DeleteArchivedCompaniesModal
          isOpen={deleteModalConfig.isOpen}
          ids={deleteModalConfig.ids}
          singleCompanyName={deleteModalConfig.singleCompanyName}
          onClose={() => setDeleteModalConfig({ isOpen: false, ids: [] })}
          onExportFirst={() => {
            /* Import/Export modal is managed in CompaniesControls (outside keyed boundary) */
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
            setToastMessage({ type: 'error', msg: errorMsg });
          }}
        />
      )}

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
    </>
  );
};
