'use client';

import * as React from 'react';
import { StatusPill, LeadStatus } from '@/components/ui/status-pill';
import { DateTimeField } from '@/components/ui/date-time-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import {
  getCurrentISTDateString,
  getDefaultISTTimeString,
  parseISTDateTimeToISO,
  isPastISTDateTime,
} from '@/lib/date-utils';

export interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  targetStatus: LeadStatus;
  onConfirm: (payload: { dueAt: string; reminderType: string; note?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  isOpen,
  targetStatus,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [dateStr, setDateStr] = React.useState('');
  const [timeStr, setTimeStr] = React.useState('');
  const [reminderType, setReminderType] = React.useState('callback');
  const [note, setNote] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setDateStr(getCurrentISTDateString());
      setTimeStr(getDefaultISTTimeString());
      // Defaults: Call-back for Contact Later and Meeting for Meeting Scheduled
      if (targetStatus === 'meeting_scheduled') {
        setReminderType('meeting');
      } else {
        setReminderType('callback');
      }
      setNote('');
      setErrorMsg('');
    }
  }, [isOpen, targetStatus]);

  if (!isOpen) return null;

  const isPast = isPastISTDateTime(dateStr, timeStr);
  const isValid = Boolean(dateStr && timeStr && !isPast);

  const handleConfirm = () => {
    if (!dateStr || !timeStr) {
      setErrorMsg('Please select both date and time');
      return;
    }
    if (isPast) {
      setErrorMsg('Selected date and time cannot be in the past');
      return;
    }

    const isoDueAt = parseISTDateTimeToISO(dateStr, timeStr);
    onConfirm({
      dueAt: isoDueAt,
      reminderType,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />

      {/* Modal Box */}
      <div className="relative w-full max-w-[440px] bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl z-10 flex flex-col">
        {/* Header Area - NO close X icon as required */}
        <div className="flex flex-col items-start">
          <StatusPill status={targetStatus} />
          <h3 className="text-xl font-semibold text-white tracking-tight mt-3">Schedule follow-up</h3>
          <p className="text-sm text-[#8E8E93] mt-1">Pick a date and time to continue</p>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4 mt-5">
          <DateTimeField
            dateValue={dateStr}
            timeValue={timeStr}
            minDate={getCurrentISTDateString()}
            onDateChange={(val) => {
              setDateStr(val);
              setErrorMsg('');
            }}
            onTimeChange={(val) => {
              setTimeStr(val);
              setErrorMsg('');
            }}
          />

          {/* Reminder Type Selector */}
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

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Note <span className="text-[#8E8E93]/60 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Discuss Q4 rollout schedule..."
              rows={2}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-3 py-2 text-sm text-white placeholder:text-[#71717A] outline-none focus:border-[#0A84FF] transition-colors resize-none"
            />
          </div>

          {/* Helper Notice */}
          <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] mt-0.5">
            <Bell className="w-4 h-4 text-[#8E8E93] shrink-0" />
            <span>A reminder will be created automatically.</span>
          </div>

          {isPast && (
            <p className="text-xs text-[#FF453A]">Selected time is in the past. Please choose a future time.</p>
          )}
          {errorMsg && <p className="text-xs text-[#FF453A]">{errorMsg}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 mt-6 pt-2">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="w-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white font-medium py-2.5 rounded-[10px] text-sm shadow-md"
          >
            {loading ? 'Scheduling...' : 'Confirm'}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-xs text-[#8E8E93] hover:text-white transition-colors text-center cursor-pointer py-1"
          >
            Cancel and revert status
          </button>
        </div>
      </div>
    </div>
  );
};
