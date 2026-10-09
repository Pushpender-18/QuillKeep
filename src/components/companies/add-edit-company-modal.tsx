'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SelectWithAvatars, ProfileOption } from '@/components/ui/select-with-avatars';
import { ScheduleFollowUpModal } from '@/components/companies/schedule-follow-up-modal';
import { LeadStatus } from '@/components/ui/status-pill';
import { usePresence } from '@/components/presence/presence-context';
import { Building2, AlertCircle, AlertTriangle } from 'lucide-react';
import { createCompanyAction, updateCompanyAction, checkCompanyNameAction, restoreCompanyAction } from '@/app/actions/companies';
import { Toast } from '@/components/ui/toast';

export interface AddEditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    name: string;
    industryId?: string | null;
    stateId?: string | null;
    location?: string | null;
    priority: string;
    assignedTo?: string | null;
  } | null;
  industries: { id: string; name: string }[];
  states: { id: string; name: string }[];
  profiles: ProfileOption[];
  currentUserId: string;
}

export const AddEditCompanyModal: React.FC<AddEditCompanyModalProps> = ({
  isOpen,
  onClose,
  initialData,
  industries,
  states,
  profiles,
  currentUserId,
}) => {
  const isEdit = Boolean(initialData?.id);
  const presence = usePresence();

  // Track presence editing state when modal is open
  React.useEffect(() => {
    if (isOpen && presence?.setEditing) {
      presence.setEditing(true);
      return () => {
        presence.setEditing(false);
      };
    }
  }, [isOpen, presence]);

  const otherEditingUser = presence?.otherUsers.find((u) => u.editing);

  // Form states
  const [name, setName] = React.useState('');
  const [industryId, setIndustryId] = React.useState('');
  const [stateId, setStateId] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [contactName, setContactName] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState<string>(currentUserId);
  const [priority, setPriority] = React.useState<string>('medium');
  const [status, setStatus] = React.useState<LeadStatus>('new');

  // Multi-step for status follow-up if contact_later or meeting_scheduled chosen on creation
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [pendingCreationPayload, setPendingCreationPayload] = React.useState<any>(null);

  // UI state
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [archivedMatchId, setArchivedMatchId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setIndustryId(initialData.industryId || '');
        setStateId(initialData.stateId || '');
        setLocation(initialData.location || '');
        setAssignedTo(initialData.assignedTo || currentUserId);
        setPriority(initialData.priority?.toLowerCase() || 'medium');
        setStatus('new');
      } else {
        setName('');
        setIndustryId(industries[0]?.id || '');
        setStateId(states[0]?.id || '');
        setLocation('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setAssignedTo(currentUserId);
        setPriority('medium');
        setStatus('new');
      }
      setErrors({});
      setArchivedMatchId(null);
      setShowScheduleModal(false);
      setPendingCreationPayload(null);
    }
  }, [isOpen, initialData, industries, states, currentUserId]);

  if (!isOpen) return null;

  const handleValidateAndSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setArchivedMatchId(null);

    try {
      // Name uniqueness pre-check
      const checkRes = await checkCompanyNameAction(name.trim(), initialData?.id);
      if (checkRes.exists) {
        if (checkRes.isArchived) {
          setArchivedMatchId(checkRes.companyId || null);
          setErrors({ name: 'This company is archived.' });
        } else {
          setErrors({ name: 'A company with this name already exists' });
        }
        setLoading(false);
        return;
      }

      if (isEdit && initialData?.id) {
        // Edit action
        const res = await updateCompanyAction(initialData.id, {
          name: name.trim(),
          industryId: industryId || null,
          stateId: stateId || null,
          location: location.trim() || null,
          priority,
          assignedTo: assignedTo || null,
        });

        if (!res.success) {
          setErrors({ form: res.error || 'Failed to update company' });
        } else {
          setToastMessage({ type: 'success', msg: 'Company updated successfully' });
          onClose();
        }
      } else {
        // Create action
        const payload = {
          name: name.trim(),
          industryId: industryId || null,
          stateId: stateId || null,
          location: location.trim() || null,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          assignedTo: assignedTo || null,
          priority,
          initialStatus: status,
        };

        if (status === 'contact_later' || status === 'meeting_scheduled') {
          // Open follow-up schedule step modal
          setPendingCreationPayload(payload);
          setShowScheduleModal(true);
          setLoading(false);
          return;
        }

        // Standard creation (status = new, contacted, not_interested)
        const res = await createCompanyAction(payload);
        if (!res.success) {
          setErrors({ form: res.error || 'Failed to create company' });
        } else {
          setToastMessage({ type: 'success', msg: 'Company created successfully' });
          onClose();
        }
      }
    } catch (err: any) {
      setErrors({ form: err?.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmScheduledCreation = async (schedulePayload: { dueAt: string; reminderType: string; note?: string }) => {
    if (!pendingCreationPayload) return;
    setLoading(true);

    try {
      const fullPayload = {
        ...pendingCreationPayload,
        dueAt: schedulePayload.dueAt,
        reminderType: schedulePayload.reminderType,
        note: schedulePayload.note,
      };

      const res = await createCompanyAction(fullPayload);
      if (!res.success) {
        setShowScheduleModal(false);
        setErrors({ form: res.error || 'Failed to create company with scheduled status' });
      } else {
        setShowScheduleModal(false);
        setToastMessage({ type: 'success', msg: 'Company created and reminder scheduled' });
        onClose();
      }
    } catch (err: any) {
      setShowScheduleModal(false);
      setErrors({ form: err?.message || 'Failed to create company' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreArchivedMatch = async () => {
    if (!archivedMatchId) return;
    setLoading(true);
    const res = await restoreCompanyAction(archivedMatchId);
    setLoading(false);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Archived company restored successfully' });
      onClose();
    } else {
      setErrors({ form: res.error || 'Failed to restore archived company' });
    }
  };

  const industryOptions = industries.map((ind) => ({ value: ind.id, label: ind.name }));
  const stateOptions = states.map((st) => ({ value: st.id, label: st.name }));

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

      {/* Main Form Modal */}
      <Modal isOpen={isOpen && !showScheduleModal} onClose={onClose} className="max-w-[560px]">
        <form onSubmit={handleValidateAndSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.08]">
            <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {isEdit ? 'Edit Company' : 'Add Company'}
            </h2>
          </div>

          {errors.form && (
            <div className="p-3 rounded-lg bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {otherEditingUser && (
            <div className="p-3 rounded-lg bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 text-xs text-[#FF9F0A] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF9F0A]" />
              <span>
                {otherEditingUser.name.split(' ')[0]} is also editing this company. Saving may overwrite their changes.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <Input
                label="Company Name *"
                placeholder="e.g. Acme Innovations"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                  setArchivedMatchId(null);
                }}
                error={errors.name}
              />
              {archivedMatchId && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#FFD60A]">
                  <span>This company is archived.</span>
                  <button
                    type="button"
                    onClick={handleRestoreArchivedMatch}
                    className="underline text-[#0A84FF] hover:text-[#0A84FF]/80 font-medium cursor-pointer"
                  >
                    Restore it?
                  </button>
                </div>
              )}
            </div>

            {/* Industry */}
            <Select
              label="Industry"
              options={[{ value: '', label: 'Select industry' }, ...industryOptions]}
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
            />

            {/* State */}
            <Select
              label="State"
              options={[{ value: '', label: 'Select state' }, ...stateOptions]}
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
            />

            {/* Location */}
            <div className="sm:col-span-2">
              <Input
                label="Location"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Primary Contact details (Add mode only) */}
            {!isEdit && (
              <>
                <div className="sm:col-span-2 border-t border-white/[0.06] pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block mb-2">
                    Primary Contact (Optional)
                  </span>
                </div>
                <Input
                  label="Contact Name"
                  placeholder="e.g. Sarah Jenkins"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  label="Contact Email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Contact Phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Assigned To */}
            <SelectWithAvatars
              label="Assigned To"
              options={profiles}
              value={assignedTo}
              onChange={setAssignedTo}
            />

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#1C1C1E] p-1 rounded-[10px] border border-white/10">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1 text-center rounded-md text-xs font-medium capitalize transition-all ${
                      priority === p
                        ? 'bg-[#2C2C2E] text-white shadow-sm border border-white/10 font-semibold'
                        : 'text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Status (Creation mode only) */}
            {!isEdit && (
              <div className="sm:col-span-2">
                <Select
                  label="Initial Status"
                  options={[
                    { value: 'new', label: 'New Lead' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'not_interested', label: 'Not Interested' },
                    { value: 'contact_later', label: 'Contact Later' },
                    { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
                  ]}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                />
              </div>
            )}
          </div>

          <div className="px-1 py-3 flex items-center justify-end gap-3 border-t border-white/[0.08] mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Company' : 'Add Company'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mandatory Schedule Follow-up step if initial status requires it */}
      {showScheduleModal && (
        <ScheduleFollowUpModal
          isOpen={showScheduleModal}
          targetStatus={status}
          onConfirm={handleConfirmScheduledCreation}
          onCancel={() => {
            setShowScheduleModal(false);
            setPendingCreationPayload(null);
          }}
          loading={loading}
        />
      )}
    </>
  );
};
