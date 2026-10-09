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
import { CompaniesFilterPanel, FilterOption } from '@/components/companies/companies-filter-panel';
import { ManageCustomFieldsModal } from '@/components/companies/custom-field-modal';
import { restoreCompanyAction } from '@/app/actions/companies';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/date-utils';
import { Plus, Building2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, FilterX } from 'lucide-react';
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

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isManageCustomFieldsOpen, setIsManageCustomFieldsOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  // Check for ?new=1 param on mount / param change to open Add Company modal and clean up param
  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsAddModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('new');
      router.replace(`${pathname}?${params.toString()}`);
    }
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

  // Determine if any filters are active
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

      {/* Search & Filters Row Component */}
      <CompaniesFilterPanel
        totalCount={totalCount}
        currentScope={currentScope}
        industries={industries}
        states={states}
        profiles={filterProfiles}
        customFieldDefinitions={customFieldDefinitions}
        onOpenManageCustomFields={() => setIsManageCustomFieldsOpen(true)}
      />

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

              <tbody className="divide-y divide-[#242428] text-xs font-normal text-[#E4E4E7]">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/companies/${c.id}`)}
                    className="h-14 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* Checkbox */}
                    <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-[#1F1F23] accent-[#0A84FF] cursor-pointer" />
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

                    {/* Hover Action: Restore button for archived rows */}
                    <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {c.isArchived && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleRestore(e, c.id)}
                          isLoading={restoringId === c.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-[11px]"
                          title="Restore company"
                        >
                          <RotateCcw className="w-3 h-3 mr-1 text-[#30D158]" /> Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Server-Side Pagination */}
          <div className="h-12 px-4 bg-[#18181B] border-t border-[#26262A] flex items-center justify-between text-xs text-[#8E8E93]">
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
    </div>
  );
};
