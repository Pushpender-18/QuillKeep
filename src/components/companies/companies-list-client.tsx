'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusPill } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AddEditCompanyModal } from '@/components/companies/add-edit-company-modal';
import { restoreCompanyAction } from '@/app/actions/companies';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/date-utils';
import { Plus, Building2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { ProfileOption } from '@/components/ui/select-with-avatars';

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
  industries: { id: string; name: string }[];
  states: { id: string; name: string }[];
  profiles: ProfileOption[];
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
  currentUserId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

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

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent row click navigation
    setRestoringId(id);
    const res = await restoreCompanyAction(id);
    setRestoringId(null);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Company restored successfully' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to restore company' });
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
        {/* Left Toggles: Active/Archived & My Leads/All Team Leads */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Active vs Archived segmented toggle */}
          <SegmentedControl
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={currentView}
            onChange={(val) => updateParams({ view: val, page: '1' })}
            size="sm"
          />

          {/* My Leads vs All Team Leads toggle */}
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

        {/* Right Action: Add Company */}
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsAddModalOpen(true)} className="h-9 px-4">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Companies Data Table Card */}
      {companies.length === 0 ? (
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
      ) : (
        <div className="w-full bg-[#141417] border border-[#242428] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="h-11 bg-[#1A1A1E] border-b border-[#26262A] text-[#A1A1AA] text-[11px] font-semibold uppercase tracking-wider select-none">
                  {/* Checkbox column (visual only) */}
                  <th className="w-12 px-3 text-center">
                    <input type="checkbox" disabled className="w-4 h-4 rounded accent-[#0A84FF] opacity-60 cursor-not-allowed" />
                  </th>

                  {/* Company Name (Sortable) */}
                  <th
                    onClick={() => handleToggleSort('name')}
                    className="w-[24%] px-3.5 cursor-pointer hover:text-white transition-colors group"
                  >
                    <div className="flex items-center">
                      <span>Company Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>

                  {/* Industry */}
                  <th className="w-[14%] px-3.5">Industry</th>

                  {/* Location */}
                  <th className="w-[14%] px-3">Location</th>

                  {/* Status Pill */}
                  <th className="w-[14%] px-3">Status</th>

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
                  <th className="w-[12%] px-3">Assigned To</th>

                  {/* Last Contacted (Sortable) / Archive Reason */}
                  {currentView === 'archived' ? (
                    <th className="w-[12%] px-3">Archive Reason</th>
                  ) : (
                    <th
                      onClick={() => handleToggleSort('last_contact')}
                      className="w-[12%] px-3 cursor-pointer hover:text-white transition-colors group"
                    >
                      <div className="flex items-center">
                        <span>Last Contacted</span>
                        {getSortIcon('last_contact')}
                      </div>
                    </th>
                  )}

                  {/* Actions column for hover Restore */}
                  <th className="w-16 px-2 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1F1F24] text-sm text-white">
                {companies.map((row) => {
                  const assignedProfile = row.assignedToProfile;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/companies/${row.id}`)}
                      className={`h-[56px] transition-colors whitespace-nowrap group cursor-pointer ${
                        row.isArchived
                          ? 'opacity-60 bg-[#161618]/60 hover:bg-[#1C1C1F]/80'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer opacity-50 group-hover:opacity-100" />
                      </td>

                      {/* Company Name */}
                      <td className="px-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#242428] text-[#D1D1D6] border border-[#34343A] flex items-center justify-center font-bold text-[13px] shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[13px] font-semibold text-white group-hover:text-[#0A84FF] transition-colors truncate">
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="px-3.5 text-[13px] text-[#D4D4D8] truncate">
                        {row.industryName || '—'}
                      </td>

                      {/* Location */}
                      <td className="px-3 text-[13px] text-[#A1A1AA] truncate">
                        {row.location || '—'}
                      </td>

                      {/* Status */}
                      <td className="px-3">
                        {row.isArchived ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/20">
                            Archived
                          </span>
                        ) : (
                          <StatusPill status={row.status} />
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-3">
                        <PriorityTag priority={row.priority} />
                      </td>

                      {/* Assigned To */}
                      <td className="px-3">
                        {assignedProfile ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={assignedProfile.fullName} email={assignedProfile.email} size="sm" />
                            <span className="text-[13px] text-[#E4E4E7] truncate">
                              {assignedProfile.fullName || assignedProfile.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#71717A]">Unassigned</span>
                        )}
                      </td>

                      {/* Last Contacted or Archive Reason */}
                      {row.isArchived ? (
                        <td className="px-3 text-[12px] text-[#FFD60A] truncate">
                          {row.archiveReason || 'No reason provided'}
                        </td>
                      ) : (
                        <td className="px-3 text-[12px] text-[#A1A1AA] truncate">
                          {formatRelativeTime(row.lastContactedAt)}
                        </td>
                      )}

                      {/* Hover action (Restore button for archived) */}
                      <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {row.isArchived && (
                          <button
                            type="button"
                            onClick={(e) => handleRestore(e, row.id)}
                            disabled={restoringId === row.id}
                            className="px-2 py-1 rounded bg-[#0A84FF]/15 hover:bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/30 text-xs font-medium transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
                            title="Restore Company"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3 bg-[#1A1A1E] border-t border-[#242428] flex items-center justify-between gap-4 text-[12px] text-[#A1A1AA]">
            <span>
              Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong className="text-white">{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
              <strong className="text-white">{totalCount}</strong> companies
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ page: String(currentPage - 1) })}
              >
                Previous
              </Button>
              <span className="px-2 text-white font-medium">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => updateParams({ page: String(currentPage + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <AddEditCompanyModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            router.refresh();
          }}
          industries={industries}
          states={states}
          profiles={profiles}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};
