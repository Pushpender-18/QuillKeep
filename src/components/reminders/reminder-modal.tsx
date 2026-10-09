'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DateTimeField } from '@/components/ui/date-time-field';
import { SelectWithAvatars, ProfileOption } from '@/components/ui/select-with-avatars';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SerializableReminder } from '@/lib/reminders';
import {
  getCurrentISTDateString,
  getDefaultISTTimeString,
  isPastISTDateTime,
} from '@/lib/date-utils';
import {
  createReminderAction,
  updateReminderAction,
  deleteReminderAction,
} from '@/app/actions/reminders';
import { Toast } from '@/components/ui/toast';
import { BellRing, AlertCircle, Trash2, Search, Building2 } from 'lucide-react';

export interface CompanyOption {
  id: string;
  name: string;
  isArchived?: boolean;
}

export interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SerializableReminder | null;
  prefilledCompanyId?: string | null;
  companies: CompanyOption[];
  profiles: ProfileOption[];
  currentUserId: string;
  focusField?: 'date' | 'general';
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  initialData,
  prefilledCompanyId,
  companies,
  profiles,
  currentUserId,
  focusField = 'general',
}) => {
  const isEdit = Boolean(initialData?.id);

  // Form states
  const [companyId, setCompanyId] = React.useState('');
  const [companySearch, setCompanySearch] = React.useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false);
  const companyRef = React.useRef<HTMLDivElement>(null);

  const [type, setType] = React.useState<'callback' | 'missed_call' | 'meeting' | 'manual'>('callback');
  const [dateStr, setDateStr] = React.useState('');
  const [timeStr, setTimeStr] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState(currentUserId);
  const [note, setNote] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Delete confirm dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Filter non-archived active companies
  const activeCompanies = React.useMemo(() => {
    return companies.filter((c) => !c.isArchived);
  }, [companies]);

  const filteredCompanyOptions = React.useMemo(() => {
    if (!companySearch.trim()) return activeCompanies;
    const q = companySearch.trim().toLowerCase();
    return activeCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeCompanies, companySearch]);

  const selectedCompany = activeCompanies.find((c) => c.id === companyId);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCompanyId(initialData.companyId);
        setType(initialData.type);
        setAssignedTo(initialData.assignedTo || currentUserId);
        setNote(initialData.note || '');

        // Extract IST date and time strings from dueAt ISO
        const due = new Date(initialData.dueAt);
        const yyyyMmDd = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(due);

        const hhMm = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(due);

        setDateStr(yyyyMmDd);
        setTimeStr(hhMm);
      } else {
        setCompanyId(prefilledCompanyId || (activeCompanies[0]?.id || ''));
        setType('callback');
        setDateStr(getCurrentISTDateString());
        setTimeStr(getDefaultISTTimeString());
        setAssignedTo(currentUserId);
        setNote('');
      }
      setErrors({});
      setIsCompanyDropdownOpen(false);
    }
  }, [isOpen, initialData, prefilledCompanyId, activeCompanies, currentUserId]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!companyId) {
      newErrors.company = 'Please select a company';
    }
    if (!dateStr || !timeStr) {
      newErrors.dateTime = 'Please select both date and time';
    } else if (isPastISTDateTime(dateStr, timeStr)) {
      newErrors.dateTime = 'Past date and time is not allowed';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      if (isEdit && initialData?.id) {
        const res = await updateReminderAction(initialData.id, {
          type,
          dateStr,
          timeStr,
          assignedTo,
          note: note.trim() || null,
        });

        if (!res.success) {
          setErrors({ form: res.error || 'Failed to update reminder' });
        } else {
          setToastMessage({ type: 'success', msg: 'Reminder updated successfully' });
          onClose();
        }
      } else {
        const res = await createReminderAction({
          companyId,
          type,
          dateStr,
          timeStr,
          assignedTo,
          note: note.trim() || null,
        });

        if (!res.success) {
          setErrors({ form: res.error || 'Failed to create reminder' });
        } else {
          setToastMessage({ type: 'success', msg: 'Reminder created successfully' });
          onClose();
        }
      }
    } catch (err: any) {
      setErrors({ form: err?.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!initialData?.id) return;
    setDeleteLoading(true);
    const res = await deleteReminderAction(initialData.id);
    setDeleteLoading(false);
    setIsDeleteDialogOpen(false);

    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Reminder deleted' });
      onClose();
    } else {
      setErrors({ form: res.error || 'Failed to delete reminder' });
    }
  };

  const isCompanyLocked = isEdit || Boolean(prefilledCompanyId);

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

      <Modal isOpen={isOpen && !isDeleteDialogOpen} onClose={onClose} className="max-w-[480px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {isEdit
                  ? focusField === 'date'
                    ? 'Reschedule Reminder'
                    : 'Edit Reminder'
                  : 'Add Reminder'}
              </h2>
            </div>

            {isEdit && (
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-1.5 rounded-lg text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors text-xs flex items-center gap-1"
                title="Delete reminder"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {errors.form && (
            <div className="p-3 rounded-lg bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Company Picker */}
          <div className="flex flex-col gap-1.5 relative" ref={companyRef}>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Company *
            </label>

            {isCompanyLocked ? (
              <div className="w-full h-9 px-3 bg-[#1C1C1F]/60 border border-white/10 rounded-[10px] flex items-center gap-2 text-xs text-white opacity-80 cursor-not-allowed">
                <Building2 className="w-4 h-4 text-[#8E8E93]" />
                <span className="font-medium truncate">{selectedCompany?.name || 'Selected Company'}</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                  className="w-full h-9 px-3 bg-[#1C1C1F] border border-[#27272A] hover:border-white/20 rounded-[10px] flex items-center justify-between text-xs text-white transition-colors cursor-pointer outline-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-[#8E8E93] shrink-0" />
                    <span className="truncate">{selectedCompany?.name || 'Select company...'}</span>
                  </div>
                  <Search className="w-4 h-4 text-[#71717A] shrink-0" />
                </button>

                {isCompanyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-2 max-h-56 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Search company..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#1C1C1E] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#0A84FF]"
                    />

                    <div className="flex flex-col gap-0.5">
                      {filteredCompanyOptions.length === 0 ? (
                        <p className="text-xs text-[#8E8E93] py-2 text-center">No companies found</p>
                      ) : (
                        filteredCompanyOptions.map((comp) => (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={() => {
                              setCompanyId(comp.id);
                              setIsCompanyDropdownOpen(false);
                              setErrors((prev) => ({ ...prev, company: '' }));
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                              comp.id === companyId
                                ? 'bg-[#0A84FF]/20 text-white font-semibold'
                                : 'text-[#E4E4E7] hover:bg-white/[0.08]'
                            }`}
                          >
                            {comp.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.company && <p className="text-xs text-[#FF453A]">{errors.company}</p>}
          </div>

          {/* Reminder Type (Segmented Control) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Reminder Type
            </label>
            <SegmentedControl
              options={[
                { value: 'callback', label: 'Call-back' },
                { value: 'missed_call', label: 'Missed call' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'manual', label: 'Manual' },
              ]}
              value={type}
              onChange={(val) => setType(val as any)}
            />
          </div>

          {/* Date & Time Field */}
          <DateTimeField
            dateValue={dateStr}
            timeValue={timeStr}
            minDate={getCurrentISTDateString()}
            onDateChange={(val) => {
              setDateStr(val);
              setErrors((prev) => ({ ...prev, dateTime: '' }));
            }}
            onTimeChange={(val) => {
              setTimeStr(val);
              setErrors((prev) => ({ ...prev, dateTime: '' }));
            }}
            error={errors.dateTime}
          />

          {/* Assigned To */}
          <SelectWithAvatars
            label="Assigned To"
            options={profiles}
            value={assignedTo}
            onChange={setAssignedTo}
          />

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Notes <span className="text-[#8E8E93]/60 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add follow-up details or notes..."
              rows={2}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-3 py-2 text-sm text-white placeholder:text-[#71717A] outline-none focus:border-[#0A84FF] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Reminder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Reminder"
          description="Are you sure you want to delete this scheduled reminder?"
          confirmText="Delete Reminder"
          variant="danger"
          loading={deleteLoading}
        />
      )}
    </>
  );
};
