'use client';

import * as React from 'react';
import { LeadStatus, StatusPill } from '@/components/ui/status-pill';
import { changeCompanyStatusAction } from '@/app/actions/companies';
import { createRemarkAction } from '@/app/actions/remarks';
import { ScheduleFollowUpModal } from '@/components/companies/schedule-follow-up-modal';
import { Check, Edit3, Bell, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { ProfileOption } from '@/components/ui/select-with-avatars';

export interface RowQuickActionsProps {
  companyId: string;
  companyName: string;
  currentStatus: LeadStatus;
  isArchived: boolean;
  profiles: ProfileOption[];
  onOpenReminderModal: (companyId: string) => void;
  onRestoreCompany?: (companyId: string) => void;
  onDeletePermanently?: (companyId: string, companyName: string) => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const RowQuickActions: React.FC<RowQuickActionsProps> = ({
  companyId,
  companyName,
  currentStatus,
  isArchived,
  profiles,
  onOpenReminderModal,
  onRestoreCompany,
  onDeletePermanently,
  onSuccessToast,
  onErrorToast,
}) => {
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = React.useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = React.useState(false);
  const [targetFollowUpStatus, setTargetFollowUpStatus] = React.useState<LeadStatus | null>(null);
  const [scheduleLoading, setScheduleLoading] = React.useState(false);

  // Quick Note States
  const [noteText, setNoteText] = React.useState('');
  const [mentionIds, setMentionIds] = React.useState<string[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [noteLoading, setNoteLoading] = React.useState(false);
  const [discardWarning, setDiscardWarning] = React.useState(false);

  const statusRef = React.useRef<HTMLDivElement>(null);
  const noteRef = React.useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusPopoverOpen(false);
      }
      if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
        if (noteText.trim().length > 0 && !discardWarning) {
          setDiscardWarning(true);
        } else {
          setIsQuickNoteOpen(false);
          setDiscardWarning(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [noteText, discardWarning]);

  if (isArchived) {
    return (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onRestoreCompany && onRestoreCompany(companyId)}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity h-7 px-2 text-[11px] flex items-center gap-1 rounded bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] hover:bg-[#30D158]/25 font-medium cursor-pointer"
          title="Restore company"
          aria-label="Restore company"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restore</span>
        </button>
        <button
          type="button"
          onClick={() => onDeletePermanently && onDeletePermanently(companyId, companyName)}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity h-7 px-2 text-[11px] flex items-center gap-1 rounded bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/25 font-medium cursor-pointer"
          title="Delete permanently"
          aria-label="Delete permanently"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete permanently</span>
        </button>
      </div>
    );
  }

  const allStatuses: Array<{ value: LeadStatus; label: string; dotColor: string }> = [
    { value: 'new', label: 'New', dotColor: 'bg-[#0A84FF]' },
    { value: 'contacted', label: 'Contacted', dotColor: 'bg-[#FF9F0A]' },
    { value: 'not_interested', label: 'Not Interested', dotColor: 'bg-[#8E8E93]' },
    { value: 'contact_later', label: 'Contact Later', dotColor: 'bg-[#BF5AF2]' },
    { value: 'meeting_scheduled', label: 'Meeting Scheduled', dotColor: 'bg-[#30D158]' },
  ];

  const handlePickStatus = async (statusVal: LeadStatus) => {
    setIsStatusPopoverOpen(false);
    if (statusVal === currentStatus) return;

    if (statusVal === 'contact_later' || statusVal === 'meeting_scheduled') {
      setTargetFollowUpStatus(statusVal);
    } else {
      const res = await changeCompanyStatusAction(companyId, statusVal);
      if (res.success) {
        onSuccessToast(`Status updated to ${statusVal.replace('_', ' ')}`);
      } else {
        onErrorToast(res.error || 'Failed to update status');
      }
    }
  };

  const handleConfirmScheduleFollowUp = async (payload: { dueAt: string; reminderType: string; note?: string }) => {
    if (!targetFollowUpStatus) return;
    setScheduleLoading(true);
    const res = await changeCompanyStatusAction(
      companyId,
      targetFollowUpStatus,
      payload.dueAt,
      payload.reminderType,
      payload.note
    );
    setScheduleLoading(false);
    setTargetFollowUpStatus(null);

    if (res.success) {
      onSuccessToast(`Status updated to ${targetFollowUpStatus.replace('_', ' ')}`);
    } else {
      onErrorToast(res.error || 'Failed to schedule follow-up');
    }
  };

  const handleNoteTextChange = (val: string) => {
    setNoteText(val);
    setDiscardWarning(false);
    // Detect "@" for mention
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex >= val.length - 15) {
      const query = val.slice(lastAtIndex + 1);
      if (!query.includes(' ')) {
        setMentionQuery(query.toLowerCase());
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleSelectMention = (profile: ProfileOption) => {
    const lastAtIndex = noteText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const name = profile.fullName || profile.email;
      const newText = noteText.slice(0, lastAtIndex) + `@${name} `;
      setNoteText(newText);
      if (!mentionIds.includes(profile.id)) {
        setMentionIds([...mentionIds, profile.id]);
      }
    }
    setShowMentionDropdown(false);
  };

  const handleSaveQuickNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    const res = await createRemarkAction(companyId, noteText.trim(), mentionIds);
    setNoteLoading(false);

    if (res.success) {
      onSuccessToast('Quick note added');
      setNoteText('');
      setMentionIds([]);
      setIsQuickNoteOpen(false);
      setDiscardWarning(false);
    } else {
      onErrorToast(res.error || 'Failed to add note');
    }
  };

  const handleKeyDownNote = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveQuickNote();
    } else if (e.key === 'Escape') {
      if (noteText.trim().length > 0 && !discardWarning) {
        setDiscardWarning(true);
      } else {
        setIsQuickNoteOpen(false);
        setDiscardWarning(false);
      }
    }
  };

  const filteredMentionProfiles = profiles.filter((p) => {
    const nameStr = (p.fullName || p.email || '').toLowerCase();
    return nameStr.includes(mentionQuery);
  });

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {/* 1. Change Status Button & Popover */}
      <div className="relative" ref={statusRef}>
        <button
          type="button"
          onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
          className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
          title="Change status"
        >
          <CheckCircle2 className="w-4 h-4 text-[#0A84FF]" />
        </button>

        {isStatusPopoverOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-48 bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5">
            {allStatuses.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => handlePickStatus(st.value)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  st.value === currentStatus
                    ? 'bg-[#0A84FF]/20 text-white font-medium'
                    : 'text-[#E4E4E7] hover:bg-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${st.dotColor}`} />
                  <span>{st.label}</span>
                </div>
                {st.value === currentStatus && <Check className="w-3.5 h-3.5 text-[#0A84FF]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Quick Note Button & Popover */}
      <div className="relative" ref={noteRef}>
        <button
          type="button"
          onClick={() => {
            setIsQuickNoteOpen(!isQuickNoteOpen);
            setDiscardWarning(false);
          }}
          className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
          title="Quick note"
        >
          <Edit3 className="w-4 h-4 text-[#FF9F0A]" />
        </button>

        {isQuickNoteOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-80 bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8E8E93] truncate max-w-[200px]">
                Note for <strong className="text-white">{companyName}</strong>
              </span>
              <span className="text-[10px] text-[#71717A] font-mono">⌘/Ctrl + Enter</span>
            </div>

            <div className="relative">
              <textarea
                value={noteText}
                onChange={(e) => handleNoteTextChange(e.target.value)}
                onKeyDown={handleKeyDownNote}
                placeholder="Add a quick note... Use @ to mention team"
                rows={3}
                autoFocus
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#71717A] outline-none focus:border-[#0A84FF] transition-colors resize-none"
              />

              {/* Mention dropdown */}
              {showMentionDropdown && filteredMentionProfiles.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1A1A1E] border border-white/10 rounded-lg shadow-xl max-h-36 overflow-y-auto p-1 z-50 flex flex-col gap-0.5">
                  {filteredMentionProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectMention(p)}
                      className="w-full text-left px-2.5 py-1.5 rounded text-xs text-[#E4E4E7] hover:bg-[#0A84FF]/20 hover:text-white transition-colors truncate"
                    >
                      @{p.fullName || p.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {discardWarning && (
              <div className="text-[11px] text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 rounded-lg p-2 flex items-center justify-between">
                <span>Discard unposted text?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickNoteOpen(false);
                      setNoteText('');
                      setDiscardWarning(false);
                    }}
                    className="text-white underline font-semibold text-[10px]"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscardWarning(false)}
                    className="text-[#8E8E93] text-[10px]"
                  >
                    Keep
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setIsQuickNoteOpen(false);
                  setNoteText('');
                  setDiscardWarning(false);
                }}
                className="px-2.5 py-1 text-xs text-[#8E8E93] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickNote}
                disabled={!noteText.trim() || noteLoading}
                className="px-3 py-1 bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white font-medium rounded-md text-xs transition-colors disabled:opacity-50"
              >
                {noteLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Set Reminder Button */}
      <button
        type="button"
        onClick={() => onOpenReminderModal(companyId)}
        className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
        title="Set reminder"
      >
        <Bell className="w-4 h-4 text-[#BF5AF2]" />
      </button>

      {/* Mandatory Date/Time Modal for Contact Later or Meeting Scheduled */}
      {targetFollowUpStatus && (
        <ScheduleFollowUpModal
          isOpen={Boolean(targetFollowUpStatus)}
          targetStatus={targetFollowUpStatus}
          onConfirm={handleConfirmScheduleFollowUp}
          onCancel={() => setTargetFollowUpStatus(null)}
          loading={scheduleLoading}
        />
      )}
    </div>
  );
};
