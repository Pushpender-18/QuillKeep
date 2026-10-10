'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomFieldDefinition } from '@/lib/custom-fields';
import { Search, X, Filter, ChevronDown, SlidersHorizontal, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface CompaniesFilterPanelProps {
  totalCount: number;
  currentScope: 'my' | 'all';
  industries: FilterOption[];
  states: FilterOption[];
  profiles: (FilterOption & { email?: string })[];
  customFieldDefinitions: CustomFieldDefinition[];
  onOpenManageCustomFields: () => void;
}

export const CompaniesFilterPanel: React.FC<CompaniesFilterPanelProps> = ({
  totalCount,
  currentScope,
  industries,
  states,
  profiles,
  customFieldDefinitions,
  onOpenManageCustomFields,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search input debounced state
  const rawQ = searchParams.get('q') || '';
  const [searchValue, setSearchValue] = React.useState(rawQ);

  // Sync internal search state when URL param changes externally
  React.useEffect(() => {
    setSearchValue(rawQ);
  }, [rawQ]);

  // Active pill popover states
  const [openPill, setOpenPill] = React.useState<string | null>(null);

  // Pill inner search terms (for dropdowns with >8 options)
  const [stateSearch, setStateSearch] = React.useState('');
  const [industrySearch, setIndustrySearch] = React.useState('');
  const [profileSearch, setProfileSearch] = React.useState('');

  const [isPending, startTransition] = React.useTransition();

  // Helper to update search params
  const updateParams = (newParams: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.set('page', '1'); // Reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Debounced search handler (300 ms)
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const currentParam = searchParams.get('q') || '';
      if (searchValue.trim().length >= 2) {
        if (searchValue.trim() !== currentParam) {
          updateParams({ q: searchValue.trim() });
        }
      } else if (searchValue.trim().length === 0 && currentParam !== '') {
        updateParams({ q: null });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue]);

  // Read URL filter states
  const selectedStatuses = (searchParams.get('status') || '').split(',').filter(Boolean);
  const selectedStates = (searchParams.get('state') || '').split(',').filter(Boolean);
  const selectedIndustries = (searchParams.get('industry') || '').split(',').filter(Boolean);
  const selectedAssigned = (searchParams.get('assigned') || '').split(',').filter(Boolean);
  const selectedPriorities = (searchParams.get('priority') || '').split(',').filter(Boolean);
  const locationParam = searchParams.get('location') || '';

  // Extract active custom field parameters from URL (params prefixed with cf_)
  const activeCustomFieldFilters: {
    fieldId: string;
    def: CustomFieldDefinition;
    type: string;
    val: string;
  }[] = [];

  customFieldDefinitions
    .filter((d) => d.isActive)
    .forEach((def) => {
      if (def.fieldType === 'text') {
        const v = searchParams.get(`cf_text_${def.id}`);
        if (v) activeCustomFieldFilters.push({ fieldId: def.id, def, type: 'text', val: v });
      } else if (def.fieldType === 'dropdown') {
        const v = searchParams.get(`cf_drop_${def.id}`);
        if (v) activeCustomFieldFilters.push({ fieldId: def.id, def, type: 'dropdown', val: v });
      } else if (def.fieldType === 'number') {
        const min = searchParams.get(`cf_num_min_${def.id}`);
        const max = searchParams.get(`cf_num_max_${def.id}`);
        if (min || max) {
          activeCustomFieldFilters.push({
            fieldId: def.id,
            def,
            type: 'number',
            val: `${min || 'Any'} - ${max || 'Any'}`,
          });
        }
      } else if (def.fieldType === 'date') {
        const from = searchParams.get(`cf_date_from_${def.id}`);
        const to = searchParams.get(`cf_date_to_${def.id}`);
        if (from || to) {
          activeCustomFieldFilters.push({
            fieldId: def.id,
            def,
            type: 'date',
            val: `${from || 'Start'} to ${to || 'End'}`,
          });
        }
      }
    });

  // Calculate total active filter categories
  const activeFilterCount =
    (selectedStatuses.length ? 1 : 0) +
    (selectedStates.length ? 1 : 0) +
    (selectedIndustries.length ? 1 : 0) +
    (selectedAssigned.length ? 1 : 0) +
    (selectedPriorities.length ? 1 : 0) +
    (locationParam ? 1 : 0) +
    activeCustomFieldFilters.length;

  const handleToggleMultiSelect = (paramKey: string, currentValues: string[], id: string) => {
    let next: string[];
    if (currentValues.includes(id)) {
      next = currentValues.filter((v) => v !== id);
    } else {
      next = [...currentValues, id];
    }
    updateParams({ [paramKey]: next.length > 0 ? next.join(',') : null });
  };

  const handleClearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('status');
    params.delete('state');
    params.delete('industry');
    params.delete('assigned');
    params.delete('priority');
    params.delete('location');

    // Delete custom field params
    Array.from(params.keys()).forEach((key) => {
      if (key.startsWith('cf_')) {
        params.delete(key);
      }
    });

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Close popover when clicking outside
  const popoverRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPill(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusOptions = [
    { id: 'new', name: 'New' },
    { id: 'contacted', name: 'Contacted' },
    { id: 'meeting_scheduled', name: 'Meeting Scheduled' },
    { id: 'contact_later', name: 'Contact Later' },
    { id: 'not_interested', name: 'Not Interested' },
  ];

  const priorityOptions = [
    { id: 'high', name: 'High' },
    { id: 'medium', name: 'Medium' },
    { id: 'low', name: 'Low' },
  ];

  const filteredStates = states.filter((s) =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredIndustries = industries.filter((i) =>
    i.name.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const filteredProfiles = profiles.filter((p) =>
    p.name.toLowerCase().includes(profileSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 relative" ref={popoverRef}>
      {/* Search Bar & Primary Filter Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input Bar (300ms debounced, stores in "q", minimum 2 chars) */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <Input
            placeholder="Search company name, contact, email, phone, remarks..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-[#161618] border-white/[0.08] focus:border-[#0A84FF]"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="text-xs text-[#8E8E93] font-medium">
          <span className="text-white font-semibold">{totalCount}</span> companies match
        </div>
      </div>

      {/* Row of Pill Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Status Pill */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'status' ? null : 'status')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              selectedStatuses.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>Status</span>
            {selectedStatuses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'status' && (
            <div className="absolute left-0 top-10 z-50 w-52 p-2 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] px-2 py-1 uppercase">Filter by Status</span>
              {statusOptions.map((opt) => {
                const isChecked = selectedStatuses.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMultiSelect('status', selectedStatuses, opt.id)}
                      className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                    />
                    <span>{opt.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* State Pill */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'state' ? null : 'state')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              selectedStates.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>State</span>
            {selectedStates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {selectedStates.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'state' && (
            <div className="absolute left-0 top-10 z-50 w-60 p-2 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-1.5">
              {states.length > 8 && (
                <Input
                  placeholder="Search states..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="h-7 text-xs bg-[#2C2C2E]"
                />
              )}
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {filteredStates.map((st) => {
                  const isChecked = selectedStates.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMultiSelect('state', selectedStates, st.id)}
                        className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                      />
                      <span className="truncate">
                        {st.name} {st.isActive === false && <span className="text-[#8E8E93] text-[11px] ml-1">(inactive)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Industry Pill */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'industry' ? null : 'industry')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              selectedIndustries.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>Industry</span>
            {selectedIndustries.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {selectedIndustries.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'industry' && (
            <div className="absolute left-0 top-10 z-50 w-60 p-2 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-1.5">
              {industries.length > 8 && (
                <Input
                  placeholder="Search industries..."
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  className="h-7 text-xs bg-[#2C2C2E]"
                />
              )}
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {filteredIndustries.map((ind) => {
                  const isChecked = selectedIndustries.includes(ind.id);
                  return (
                    <label
                      key={ind.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMultiSelect('industry', selectedIndustries, ind.id)}
                        className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                      />
                      <span className="truncate">
                        {ind.name} {ind.isActive === false && <span className="text-[#8E8E93] text-[11px] ml-1">(inactive)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Assigned To Pill (Disabled when Scope is "my") */}
        <div className="relative">
          <button
            disabled={currentScope === 'my'}
            onClick={() => setOpenPill(openPill === 'assigned' ? null : 'assigned')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              currentScope === 'my'
                ? 'opacity-40 cursor-not-allowed bg-[#1C1C1E] border-white/[0.04] text-[#8E8E93]'
                : selectedAssigned.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
            title={currentScope === 'my' ? 'Disabled in My Leads scope' : 'Filter by Assignee'}
          >
            <span>Assigned To</span>
            {selectedAssigned.length > 0 && currentScope !== 'my' && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {selectedAssigned.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'assigned' && currentScope !== 'my' && (
            <div className="absolute left-0 top-10 z-50 w-64 p-2 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-1.5">
              {profiles.length > 8 && (
                <Input
                  placeholder="Search teammates..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="h-7 text-xs bg-[#2C2C2E]"
                />
              )}
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {/* Unassigned Option */}
                <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAssigned.includes('unassigned')}
                    onChange={() => handleToggleMultiSelect('assigned', selectedAssigned, 'unassigned')}
                    className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                  />
                  <span className="text-[#FF9F0A]">Unassigned</span>
                </label>

                {filteredProfiles.map((p) => {
                  const isChecked = selectedAssigned.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMultiSelect('assigned', selectedAssigned, p.id)}
                        className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                      />
                      <span className="truncate">
                        {p.name} {p.isActive === false && <span className="text-[#8E8E93] text-[11px] ml-1">(inactive)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Priority Pill */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'priority' ? null : 'priority')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              selectedPriorities.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>Priority</span>
            {selectedPriorities.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {selectedPriorities.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'priority' && (
            <div className="absolute left-0 top-10 z-50 w-48 p-2 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#8E8E93] px-2 py-1 uppercase">Filter Priority</span>
              {priorityOptions.map((opt) => {
                const isChecked = selectedPriorities.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMultiSelect('priority', selectedPriorities, opt.id)}
                      className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                    />
                    <span>{opt.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Location Pill */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'location' ? null : 'location')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              locationParam
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>Location</span>
            {locationParam && <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'location' && (
            <div className="absolute left-0 top-10 z-50 w-64 p-3 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Location Contains</span>
              <Input
                placeholder="e.g. Mumbai, Bengaluru"
                defaultValue={locationParam}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    updateParams({ location: target.value.trim() || null });
                    setOpenPill(null);
                  }
                }}
                className="h-8 text-xs bg-[#2C2C2E]"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateParams({ location: null });
                    setOpenPill(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Custom Fields Pill & Filter Panel */}
        <div className="relative">
          <button
            onClick={() => setOpenPill(openPill === 'custom_fields' ? null : 'custom_fields')}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150',
              activeCustomFieldFilters.length > 0
                ? 'bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]'
                : 'bg-[#1C1C1E] border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Custom Fields</span>
            {activeCustomFieldFilters.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A84FF] text-white text-[10px]">
                {activeCustomFieldFilters.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {openPill === 'custom_fields' && (
            <div className="absolute left-0 top-10 z-50 w-80 p-4 rounded-xl bg-[#1C1C1E] border border-white/[0.12] shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Custom Field Filters
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOpenPill(null);
                    onOpenManageCustomFields();
                  }}
                  className="text-xs text-[#0A84FF] hover:underline flex items-center gap-1 font-medium"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Manage Fields
                </button>
              </div>

              {customFieldDefinitions.filter((d) => d.isActive).length === 0 ? (
                <div className="text-xs text-[#8E8E93] py-2 text-center">
                  No active custom fields defined.
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
                  {customFieldDefinitions
                    .filter((d) => d.isActive)
                    .map((field) => (
                      <CustomFieldFilterItem
                        key={field.id}
                        field={field}
                        searchParams={searchParams}
                        updateParams={updateParams}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clear Filters Link */}
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearAllFilters}
            className="h-8 px-2.5 text-xs font-semibold text-[#FF453A] hover:bg-[#FF453A]/10 rounded-lg transition-colors flex items-center gap-1 ml-auto"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] font-semibold text-[#8E8E93] uppercase mr-1">Active:</span>

          {selectedStatuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
            >
              <span>Status: {statusOptions.find((o) => o.id === st)?.name || st}</span>
              <button
                onClick={() => handleToggleMultiSelect('status', selectedStatuses, st)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {selectedStates.map((stId) => {
            const name = states.find((s) => s.id === stId)?.name || stId;
            return (
              <span
                key={stId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
              >
                <span>State: {name}</span>
                <button
                  onClick={() => handleToggleMultiSelect('state', selectedStates, stId)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {selectedIndustries.map((indId) => {
            const name = industries.find((i) => i.id === indId)?.name || indId;
            return (
              <span
                key={indId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
              >
                <span>Industry: {name}</span>
                <button
                  onClick={() => handleToggleMultiSelect('industry', selectedIndustries, indId)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {selectedAssigned.map((pId) => {
            const name = pId === 'unassigned' ? 'Unassigned' : profiles.find((p) => p.id === pId)?.name || pId;
            return (
              <span
                key={pId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
              >
                <span>Assignee: {name}</span>
                <button
                  onClick={() => handleToggleMultiSelect('assigned', selectedAssigned, pId)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {selectedPriorities.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
            >
              <span>Priority: {p}</span>
              <button
                onClick={() => handleToggleMultiSelect('priority', selectedPriorities, p)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {locationParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30">
              <span>Location: {locationParam}</span>
              <button onClick={() => updateParams({ location: null })} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeCustomFieldFilters.map((cf) => (
            <span
              key={cf.fieldId}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium border border-[#0A84FF]/30"
            >
              <span>{cf.def.name}: {cf.val}</span>
              <button
                onClick={() => {
                  updateParams({
                    [`cf_text_${cf.fieldId}`]: null,
                    [`cf_drop_${cf.fieldId}`]: null,
                    [`cf_num_min_${cf.fieldId}`]: null,
                    [`cf_num_max_${cf.fieldId}`]: null,
                    [`cf_date_from_${cf.fieldId}`]: null,
                    [`cf_date_to_${cf.fieldId}`]: null,
                  });
                }}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Component for rendering custom field filter controls inside custom fields popover
const CustomFieldFilterItem: React.FC<{
  field: CustomFieldDefinition;
  searchParams: ReturnType<typeof useSearchParams>;
  updateParams: (newParams: Record<string, string | null>) => void;
}> = ({ field, searchParams, updateParams }) => {
  if (field.fieldType === 'text') {
    const textVal = searchParams.get(`cf_text_${field.id}`) || '';
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-white">{field.name}</label>
        <Input
          placeholder="Contains text..."
          defaultValue={textVal}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim();
              updateParams({ [`cf_text_${field.id}`]: val || null });
            }
          }}
          className="h-7 text-xs bg-[#2C2C2E]"
        />
      </div>
    );
  }

  if (field.fieldType === 'dropdown') {
    const selected = (searchParams.get(`cf_drop_${field.id}`) || '').split(',').filter(Boolean);
    const options = field.options || [];
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-white">{field.name}</label>
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pl-1">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 text-xs text-[#8E8E93] hover:text-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const next = isChecked
                      ? selected.filter((o) => o !== opt)
                      : [...selected, opt];
                    updateParams({
                      [`cf_drop_${field.id}`]: next.length > 0 ? next.join(',') : null,
                    });
                  }}
                  className="rounded border-white/[0.2] bg-[#2C2C2E] text-[#0A84FF] focus:ring-0"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.fieldType === 'number') {
    const minVal = searchParams.get(`cf_num_min_${field.id}`) || '';
    const maxVal = searchParams.get(`cf_num_max_${field.id}`) || '';
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-white">{field.name} (Range)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            defaultValue={minVal}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                updateParams({ [`cf_num_min_${field.id}`]: val || null });
              }
            }}
            className="h-7 text-xs bg-[#2C2C2E]"
          />
          <Input
            type="number"
            placeholder="Max"
            defaultValue={maxVal}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                updateParams({ [`cf_num_max_${field.id}`]: val || null });
              }
            }}
            className="h-7 text-xs bg-[#2C2C2E]"
          />
        </div>
      </div>
    );
  }

  if (field.fieldType === 'date') {
    const fromVal = searchParams.get(`cf_date_from_${field.id}`) || '';
    const toVal = searchParams.get(`cf_date_to_${field.id}`) || '';
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-white">{field.name} (Date Range)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            defaultValue={fromVal}
            onChange={(e) => updateParams({ [`cf_date_from_${field.id}`]: e.target.value || null })}
            className="h-7 text-xs bg-[#2C2C2E] text-white"
          />
          <Input
            type="date"
            defaultValue={toVal}
            onChange={(e) => updateParams({ [`cf_date_to_${field.id}`]: e.target.value || null })}
            className="h-7 text-xs bg-[#2C2C2E] text-white"
          />
        </div>
      </div>
    );
  }

  return null;
};
