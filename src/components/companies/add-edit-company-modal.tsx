'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SelectWithAvatars, ProfileOption } from '@/components/ui/select-with-avatars';
import { ScheduleFollowUpModal } from '@/components/companies/schedule-follow-up-modal';
import { AddCustomFieldModal } from '@/components/companies/custom-field-modal';
import { CustomFieldDefinition } from '@/lib/custom-fields';
import { LeadStatus } from '@/components/ui/status-pill';
import { usePresence } from '@/components/presence/presence-context';
import { Building2, AlertCircle, AlertTriangle, Plus, Settings2 } from 'lucide-react';
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
    customFields?: Record<string, any> | null;
  } | null;
  industries: { id: string; name: string }[];
  states: { id: string; name: string }[];
  profiles: ProfileOption[];
  customFieldDefinitions?: CustomFieldDefinition[];
  currentUserId: string;
  onOpenManageCustomFields?: () => void;
}

export const AddEditCompanyModal: React.FC<AddEditCompanyModalProps> = ({
  isOpen,
  onClose,
  initialData,
  industries,
  states,
  profiles,
  customFieldDefinitions = [],
  currentUserId,
  onOpenManageCustomFields,
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

  // Local definitions list (so new field creation updates modal immediately)
  const [localDefs, setLocalDefs] = React.useState<CustomFieldDefinition[]>(customFieldDefinitions);

  React.useEffect(() => {
    setLocalDefs(customFieldDefinitions);
  }, [customFieldDefinitions]);

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
  const [customFieldsState, setCustomFieldsState] = React.useState<Record<string, any>>({});

  // Add Custom Field popup
  const [isAddCustomFieldOpen, setIsAddCustomFieldOpen] = React.useState(false);

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
        setCustomFieldsState(initialData.customFields || {});
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
        setCustomFieldsState({});
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

      // If creating a company and chosen status is contact_later or meeting_scheduled, show follow-up modal
      if (!isEdit && (status === 'contact_later' || status === 'meeting_scheduled')) {
        setPendingCreationPayload({
          name: name.trim(),
          industryId: industryId || null,
          stateId: stateId || null,
          location: location.trim() || null,
          assignedTo: assignedTo || currentUserId,
          priority,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          initialStatus: status,
          customFields: customFieldsState,
        });
        setLoading(false);
        setShowScheduleModal(true);
        return;
      }

      // Execute Save Action
      let actionRes: any;
      if (isEdit && initialData?.id) {
        actionRes = await updateCompanyAction(initialData.id, {
          name: name.trim(),
          industryId: industryId || null,
          stateId: stateId || null,
          location: location.trim() || null,
          assignedTo: assignedTo || currentUserId,
          priority,
          customFields: customFieldsState,
        });
      } else {
        actionRes = await createCompanyAction({
          name: name.trim(),
          industryId: industryId || null,
          stateId: stateId || null,
          location: location.trim() || null,
          assignedTo: assignedTo || currentUserId,
          priority,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          initialStatus: status,
          customFields: customFieldsState,
        });
      }

      setLoading(false);

      const isSuccess = actionRes.ok ? true : actionRes.success;
      const errorMsg = actionRes.ok === false ? actionRes.message : actionRes.error;

      if (isSuccess) {
        setToastMessage({
          type: 'success',
          msg: isEdit ? 'Company updated successfully' : 'Company added successfully',
        });
        onClose();
      } else {
        setErrors({ form: errorMsg || 'Failed to save company' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ form: err?.message || 'An unexpected error occurred' });
    }
  };

  // Schedule follow-up callback for status changes during creation
  const handleScheduleModalSubmit = async (data: { dueAt: string; reminderType: string; note?: string }) => {
    if (!pendingCreationPayload) return;
    setLoading(true);

    const fullPayload = {
      ...pendingCreationPayload,
      dueAt: data.dueAt,
      reminderType: data.reminderType,
      note: data.note || null,
    };

    const actionRes: any = await createCompanyAction(fullPayload);
    setLoading(false);
    setShowScheduleModal(false);

    const isSuccess = actionRes.ok ? true : actionRes.success;
    const errorMsg = actionRes.ok === false ? actionRes.message : actionRes.error;

    if (isSuccess) {
      setToastMessage({ type: 'success', msg: 'Company and follow-up created successfully' });
      onClose();
    } else {
      setErrors({ form: errorMsg || 'Failed to create company with status follow-up' });
    }
  };

  const handleRestoreArchivedMatch = async () => {
    if (!archivedMatchId) return;
    setLoading(true);
    const res = await restoreCompanyAction(archivedMatchId);
    setLoading(false);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Company restored successfully' });
      onClose();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to restore company' });
    }
  };

  const industryOptions = industries.map((i) => ({ value: i.id, label: i.name }));
  const stateOptions = states.map((s) => ({ value: s.id, label: s.name }));

  const activeDefs = localDefs.filter((d) => d.isActive);

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
              <div className="flex items-center gap-1.5 p-1 bg-[#1C1C1E] border border-white/[0.08] rounded-xl">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      priority === p
                        ? 'bg-[#2C2C2E] text-white shadow-sm border border-white/[0.12]'
                        : 'text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Status (Add mode only) */}
            {!isEdit && (
              <div className="sm:col-span-2">
                <Select
                  label="Initial Status"
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
                    { value: 'contact_later', label: 'Contact Later' },
                    { value: 'not_interested', label: 'Not Interested' },
                  ]}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                />
              </div>
            )}

            {/* Active Custom Fields Section */}
            <div className="sm:col-span-2 border-t border-white/[0.06] pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Custom Fields ({activeDefs.length})
                </span>
                {onOpenManageCustomFields && (
                  <button
                    type="button"
                    onClick={onOpenManageCustomFields}
                    className="text-xs text-[#0A84FF] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Manage
                  </button>
                )}
              </div>

              {activeDefs.map((def) => {
                const val = customFieldsState[def.id] ?? '';
                if (def.fieldType === 'text') {
                  return (
                    <Input
                      key={def.id}
                      label={def.name}
                      maxLength={500}
                      placeholder="Enter text (max 500 chars)"
                      value={val}
                      onChange={(e) =>
                        setCustomFieldsState((prev) => ({
                          ...prev,
                          [def.id]: e.target.value,
                        }))
                      }
                    />
                  );
                } else if (def.fieldType === 'number') {
                  return (
                    <Input
                      key={def.id}
                      type="number"
                      label={def.name}
                      placeholder="Enter number"
                      value={val}
                      onChange={(e) =>
                        setCustomFieldsState((prev) => ({
                          ...prev,
                          [def.id]: e.target.value !== '' ? Number(e.target.value) : '',
                        }))
                      }
                    />
                  );
                } else if (def.fieldType === 'date') {
                  return (
                    <Input
                      key={def.id}
                      type="date"
                      label={def.name}
                      value={val}
                      onChange={(e) =>
                        setCustomFieldsState((prev) => ({
                          ...prev,
                          [def.id]: e.target.value,
                        }))
                      }
                      className="text-white bg-[#1C1C1E]"
                    />
                  );
                } else if (def.fieldType === 'dropdown') {
                  const opts = (def.options || []).map((o) => ({ value: o, label: o }));
                  return (
                    <Select
                      key={def.id}
                      label={def.name}
                      options={[{ value: '', label: 'Select option' }, ...opts]}
                      value={val}
                      onChange={(e) =>
                        setCustomFieldsState((prev) => ({
                          ...prev,
                          [def.id]: e.target.value,
                        }))
                      }
                    />
                  );
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => setIsAddCustomFieldOpen(true)}
                className="text-xs text-[#0A84FF] hover:underline font-semibold flex items-center gap-1.5 self-start pt-1"
              >
                <Plus className="w-4 h-4" /> Add custom field
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              {isEdit ? 'Save Changes' : 'Create Company'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Popup to Add Custom Field */}
      <AddCustomFieldModal
        isOpen={isAddCustomFieldOpen}
        onClose={() => setIsAddCustomFieldOpen(false)}
        onFieldCreated={(newField) => {
          setLocalDefs((prev) => [...prev, newField]);
        }}
      />

      {/* Schedule Follow-up Modal for status changes during creation */}
      {showScheduleModal && (
        <ScheduleFollowUpModal
          isOpen={showScheduleModal}
          targetStatus={status as any}
          onConfirm={handleScheduleModalSubmit}
          onCancel={() => setShowScheduleModal(false)}
          loading={loading}
        />
      )}
    </>
  );
};
