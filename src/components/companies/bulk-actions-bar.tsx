'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { StatusPill, LeadStatus } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { DateTimeField } from '@/components/ui/date-time-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  bulkChangeStatusAction,
  bulkReassignAction,
  bulkArchiveAction,
  bulkRestoreAction,
  getTeammateLeadCountsAction,
} from '@/app/actions/bulk-companies';
import {
  getCurrentISTDateString,
  getDefaultISTTimeString,
  parseISTDateTimeToISO,
  isPastISTDateTime,
} from '@/lib/date-utils';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import {
  X,
  CheckCircle2,
  UserCheck,
  Archive,
  Download,
  RotateCcw,
  Check,
  Search,
  Bell,
  Info,
  Trash2,
} from 'lucide-react';

export interface BulkActionsBarProps {
  selectedIds: string[];
  totalMatchingCount?: number;
  isAllMatchingSelected?: boolean;
  onSelectAllMatching?: () => void;
  onClearSelection: () => void;
  currentView: 'active' | 'archived';
  profiles: ProfileOption[];
  onOpenExportModal: () => void;
  onOpenDeleteModal?: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  totalMatchingCount = 0,
  isAllMatchingSelected = false,
  onSelectAllMatching,
  onClearSelection,
  currentView,
  profiles,
  onOpenExportModal,
  onOpenDeleteModal,
  onSuccess,
  onError,
}) => {
  const [activeModal, setActiveModal] = React.useState<
    'status' | 'reassign' | 'archive' | 'restore' | null
  >(null);

  // Lead counts for teammates
  const [leadCounts, setLeadCounts] = React.useState<Record<string, number>>({});
  const [teammateSearch, setTeammateSearch] = React.useState('');

  // Bulk Status state
  const [targetStatus, setTargetStatus] = React.useState<LeadStatus>('contacted');
  const [dateStr, setDateStr] = React.useState('');
  const [timeStr, setTimeStr] = React.useState('');
  const [reminderType, setReminderType] = React.useState('callback');
  const [statusNote, setStatusNote] = React.useState('');
  const [statusError, setStatusError] = React.useState('');

  // Bulk Reassign state
  const [selectedOwnerId, setSelectedOwnerId] = React.useState<string | null>(null);

  // Bulk Archive state
  const [archiveReason, setArchiveReason] = React.useState('Closed down');
  const [archiveNote, setArchiveNote] = React.useState('');

  const [actionLoading, setActionLoading] = React.useState(false);

  // Fetch teammate lead counts when reassign modal opens
  React.useEffect(() => {
    if (activeModal === 'reassign') {
      getTeammateLeadCountsAction().then((res) => {
        if (res.success && res.leadCounts) {
          setLeadCounts(res.leadCounts);
        }
      });
    } else if (activeModal === 'status') {
      setDateStr(getCurrentISTDateString());
      setTimeStr(getDefaultISTTimeString());
      setStatusNote('');
      setStatusError('');
    }
  }, [activeModal]);

  if (selectedIds.length === 0) return null;

  const count = selectedIds.length;

  const allStatuses: Array<{ value: LeadStatus; label: string; dotColor: string }> = [
    { value: 'new', label: 'New', dotColor: 'bg-[#0A84FF]' },
    { value: 'contacted', label: 'Contacted', dotColor: 'bg-[#FF9F0A]' },
    { value: 'not_interested', label: 'Not Interested', dotColor: 'bg-[#8E8E93]' },
    { value: 'contact_later', label: 'Contact Later', dotColor: 'bg-[#BF5AF2]' },
    { value: 'meeting_scheduled', label: 'Meeting Scheduled', dotColor: 'bg-[#30D158]' },
  ];

  const handleBulkStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError('');

    let dueAtIso: string | undefined = undefined;
    if (targetStatus === 'contact_later' || targetStatus === 'meeting_scheduled') {
      if (!dateStr || !timeStr) {
        setStatusError('Date and time are required for Contact Later / Meeting Scheduled');
        return;
      }
      if (isPastISTDateTime(dateStr, timeStr)) {
        setStatusError('Past date and time is not allowed');
        return;
      }
      dueAtIso = parseISTDateTimeToISO(dateStr, timeStr);
    }

    setActionLoading(true);
    const res = await bulkChangeStatusAction(
      selectedIds,
      targetStatus,
      dueAtIso,
      reminderType,
      statusNote.trim() || undefined
    );
    setActionLoading(false);

    if (res.success) {
      const msg =
        res.skippedCount && res.skippedCount > 0
          ? `Updated ${res.updatedCount} companies, ${res.skippedCount} skipped because they are archived`
          : `Updated ${res.updatedCount} companies`;
      onSuccess(msg);
      setActiveModal(null);
      onClearSelection();
    } else {
      onError(res.error || 'Failed to update status');
    }
  };

  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await bulkReassignAction(selectedIds, selectedOwnerId);
    setActionLoading(false);

    if (res.success) {
      const msg =
        res.skippedCount && res.skippedCount > 0
          ? `Reassigned ${res.updatedCount} companies, ${res.skippedCount} skipped because they are archived`
          : `Reassigned ${res.updatedCount} companies`;
      onSuccess(msg);
      setActiveModal(null);
      onClearSelection();
    } else {
      onError(res.error || 'Failed to reassign owner');
    }
  };

  const handleBulkArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await bulkArchiveAction(selectedIds, archiveReason, archiveNote);
    setActionLoading(false);

    if (res.success) {
      const msg =
        res.skippedCount && res.skippedCount > 0
          ? `Archived ${res.updatedCount} companies, ${res.skippedCount} skipped`
          : `Archived ${res.updatedCount} companies`;
      onSuccess(msg);
      setActiveModal(null);
      onClearSelection();
    } else {
      onError(res.error || 'Failed to archive companies');
    }
  };

  const handleBulkRestoreConfirm = async () => {
    setActionLoading(true);
    const res = await bulkRestoreAction(selectedIds);
    setActionLoading(false);

    if (res.success) {
      const msg =
        res.skippedCount && res.skippedCount > 0
          ? `Restored ${res.updatedCount} companies, ${res.skippedCount} skipped`
          : `Restored ${res.updatedCount} companies`;
      onSuccess(msg);
      setActiveModal(null);
      onClearSelection();
    } else {
      onError(res.error || 'Failed to restore companies');
    }
  };

  const filteredTeammates = profiles.filter((p) => {
    const nameStr = (p.fullName || p.email || '').toLowerCase();
    return nameStr.includes(teammateSearch.toLowerCase());
  });

  return (
    <>
      {/* Floating Glassmorphism Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#141417]/90 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2 pr-3 border-r border-white/10 font-semibold text-white">
          <span className="w-6 h-6 rounded-full bg-[#0A84FF] text-white text-xs flex items-center justify-center font-bold">
            {count}
          </span>
          <span>{count} selected</span>
        </div>

        {currentView === 'active' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveModal('status')}
              className="h-8 px-3 text-xs text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0A84FF]" />
              Update Status
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveModal('reassign')}
              className="h-8 px-3 text-xs text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#30D158]" />
              Reassign Owner
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveModal('archive')}
              className="h-8 px-3 text-xs text-[#FF453A] hover:bg-[#FF453A]/10 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenExportModal}
              className="h-8 px-3 text-xs text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#BF5AF2]" />
              Export
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveModal('restore')}
              className="h-8 px-3 text-xs text-[#30D158] hover:bg-[#30D158]/10 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenExportModal}
              className="h-8 px-3 text-xs text-white hover:bg-white/10 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#BF5AF2]" />
              Export
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenDeleteModal}
              className="h-8 px-3 text-xs text-[#FF453A] hover:bg-[#FF453A]/10 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete permanently
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors ml-1"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Update Status Modal */}
      <Modal
        isOpen={activeModal === 'status'}
        onClose={() => setActiveModal(null)}
        className="max-w-[440px]"
      >
        <form onSubmit={handleBulkStatusSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.08]">
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Update status for {count} companies
            </h3>
            <p className="text-xs text-[#8E8E93]">Choose a new lead status to apply</p>
          </div>

          {statusError && <p className="text-xs text-[#FF453A]">{statusError}</p>}

          <div className="flex flex-col gap-1">
            {allStatuses.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setTargetStatus(st.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                  targetStatus === st.value
                    ? 'bg-[#0A84FF]/15 border-[#0A84FF] text-white font-medium'
                    : 'bg-[#1C1C1E] border-white/5 text-[#E4E4E7] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.dotColor}`} />
                  <span>{st.label}</span>
                </div>
                {targetStatus === st.value && <Check className="w-4 h-4 text-[#0A84FF]" />}
              </button>
            ))}
          </div>

          {(targetStatus === 'contact_later' || targetStatus === 'meeting_scheduled') && (
            <div className="flex flex-col gap-4 mt-2 p-3 bg-[#18181B] border border-white/10 rounded-xl">
              <p className="text-[11px] text-[#FF9F0A] font-medium">
                Applies to all selected companies
              </p>

              <DateTimeField
                dateValue={dateStr}
                timeValue={timeStr}
                minDate={getCurrentISTDateString()}
                onDateChange={(val) => setDateStr(val)}
                onTimeChange={(val) => setTimeStr(val)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Reminder Type
                </label>
                <SegmentedControl
                  options={[
                    { value: 'callback', label: 'Call-back' },
                    { value: 'meeting', label: 'Meeting' },
                    { value: 'missed_call', label: 'Missed call' },
                  ]}
                  value={reminderType}
                  onChange={setReminderType}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Note <span className="text-[#8E8E93]/60 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Q4 Follow-up campaign..."
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#0A84FF]"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading}>
              {actionLoading ? 'Updating...' : `Update ${count} Companies`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Reassign Owner Modal */}
      <Modal
        isOpen={activeModal === 'reassign'}
        onClose={() => setActiveModal(null)}
        className="max-w-[460px]"
      >
        <form onSubmit={handleBulkReassignSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.08]">
            <h3 className="text-lg font-semibold text-white tracking-tight">
              Reassign owner for {count} companies
            </h3>
            <p className="text-xs text-[#8E8E93]">Select a new team member to assign lead ownership</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search teammates..."
              value={teammateSearch}
              onChange={(e) => setTeammateSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#1C1C1E] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#0A84FF]"
            />
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {/* Unassigned Option */}
            <button
              type="button"
              onClick={() => setSelectedOwnerId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors border ${
                selectedOwnerId === null
                  ? 'bg-[#0A84FF]/20 border-[#0A84FF] text-white font-semibold'
                  : 'bg-[#1C1C1E] border-white/5 text-[#E4E4E7] hover:border-white/20'
              }`}
            >
              <span>Unassigned</span>
              {selectedOwnerId === null && <Check className="w-4 h-4 text-[#0A84FF]" />}
            </button>

            {filteredTeammates.map((p) => {
              const leadCount = leadCounts[p.id] || 0;
              const isSelected = selectedOwnerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedOwnerId(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors border ${
                    isSelected
                      ? 'bg-[#0A84FF]/20 border-[#0A84FF] text-white font-semibold'
                      : 'bg-[#1C1C1E] border-white/5 text-[#E4E4E7] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.fullName} email={p.email} size="sm" />
                    <div className="flex flex-col text-left">
                      <span className="text-white font-medium">{p.fullName || 'User'}</span>
                      <span className="text-[10px] text-[#8E8E93]">{p.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-[#8E8E93]">
                      {leadCount} leads
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#0A84FF]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#18181B] border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-[#0A84FF] font-medium">
              <Info className="w-4 h-4 shrink-0" />
              <span>This will be recorded in each company's history log.</span>
            </div>
            <p className="text-[11px] text-[#8E8E93] pl-5">
              The new owner gets one notification per company.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading}>
              {actionLoading ? 'Reassigning...' : `Reassign ${count} Companies`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Archive Modal */}
      <Modal
        isOpen={activeModal === 'archive'}
        onClose={() => setActiveModal(null)}
        className="max-w-[420px]"
      >
        <form onSubmit={handleBulkArchiveSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.08]">
            <h3 className="text-lg font-semibold text-[#FF453A] tracking-tight">
              Archive {count} companies
            </h3>
            <p className="text-xs text-[#8E8E93]">
              Archived companies are hidden from active pipeline views.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Reason
            </label>
            <select
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#0A84FF]"
            >
              <option value="Closed down">Closed down</option>
              <option value="Duplicate">Duplicate</option>
              <option value="Not a fit">Not a fit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Note <span className="text-[#8E8E93]/60 lowercase">(optional)</span>
            </label>
            <textarea
              value={archiveNote}
              onChange={(e) => setArchiveNote(e.target.value)}
              placeholder="Add additional archiving details..."
              rows={2}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#0A84FF] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="danger"
              disabled={actionLoading}
            >
              {actionLoading ? 'Archiving...' : `Archive ${count} Companies`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Restore Confirm Dialog */}
      {activeModal === 'restore' && (
        <ConfirmDialog
          isOpen={activeModal === 'restore'}
          onClose={() => setActiveModal(null)}
          onConfirm={handleBulkRestoreConfirm}
          title={`Restore ${count} companies?`}
          description="These companies will be moved back into your active lead directory."
          confirmText={`Restore ${count} Companies`}
          loading={actionLoading}
        />
      )}
    </>
  );
};
