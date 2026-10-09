'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusPill, LeadStatus } from '@/components/ui/status-pill';
import { PriorityTag, PriorityLevel } from '@/components/ui/priority-tag';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SelectWithAvatars, ProfileOption } from '@/components/ui/select-with-avatars';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScheduleFollowUpModal } from '@/components/companies/schedule-follow-up-modal';
import { AddEditCompanyModal } from '@/components/companies/add-edit-company-modal';
import { ContactModal } from '@/components/companies/contact-modal';
import { Toast } from '@/components/ui/toast';
import {
  changeCompanyStatusAction,
  archiveCompanyAction,
  restoreCompanyAction,
  updatePriorityAction,
  updateAssigneeAction,
} from '@/app/actions/companies';
import {
  addContactAction,
  updateContactAction,
  deleteContactAction,
  setPrimaryContactAction,
} from '@/app/actions/contacts';
import { formatAuditDateTime } from '@/lib/date-utils';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Lock,
  ChevronDown,
  Edit2,
  Archive,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  MoreVertical,
  UserCheck,
  Mail,
  Phone,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';

import { SerializableReminder } from '@/lib/reminders';
import { CompanyRemindersCard } from '@/components/companies/company-reminders-card';
import { SerializableRemark } from '@/lib/remarks';
import { RemarksSection } from '@/components/remarks/remarks-section';
import { PresenceProvider } from '@/components/presence/presence-context';
import { PresenceIndicator } from '@/components/presence/presence-indicator';

import { CustomFieldDefinition } from '@/lib/custom-fields';
import { ManageCustomFieldsModal } from '@/components/companies/custom-field-modal';

export interface DetailContact {
  id: string;
  name: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

export interface HistoryLogEntry {
  id: string;
  action: string; // added, status_changed, reassigned, priority_changed, reminder_created, archived, restored, remark_posted
  actorId?: string | null;
  actorName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: any;
  createdAt: string;
}

export interface CompanyDetailData {
  id: string;
  name: string;
  industryId?: string | null;
  industryName?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  location?: string | null;
  status: LeadStatus;
  priority: PriorityLevel;
  assignedTo?: string | null;
  customFields?: Record<string, any> | null;
  isArchived: boolean;
  archiveReason?: string | null;
  createdAt: string;
  contacts: DetailContact[];
  historyLogs: HistoryLogEntry[];
  reminders: SerializableReminder[];
}

export interface CompanyDetailClientProps {
  company: CompanyDetailData;
  industries: { id: string; name: string }[];
  states: { id: string; name: string }[];
  profiles: ProfileOption[];
  customFieldDefinitions?: CustomFieldDefinition[];
  profileNameMap: Record<string, string>;
  currentUserId: string;
  initialRemarks: SerializableRemark[];
  remarksTotalCount: number;
}

export const CompanyDetailClient: React.FC<CompanyDetailClientProps> = ({
  company,
  industries,
  states,
  profiles,
  customFieldDefinitions = [],
  profileNameMap,
  currentUserId,
  initialRemarks,
  remarksTotalCount,
}) => {
  const router = useRouter();
  const [isManageCustomFieldsOpen, setIsManageCustomFieldsOpen] = React.useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Status transition state
  const [currentStatus, setCurrentStatus] = React.useState<LeadStatus>(company.status);
  const [pendingStatus, setPendingStatus] = React.useState<LeadStatus | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [statusLoading, setStatusLoading] = React.useState(false);

  // Status Dropdown open state
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false);
  const statusRef = React.useRef<HTMLDivElement>(null);

  // Priority Dropdown open state
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = React.useState(false);
  const priorityRef = React.useRef<HTMLDivElement>(null);

  // Actions menu dropdown open state
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  // Archive Confirm Dialog State
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);
  const [archiveLoading, setArchiveLoading] = React.useState(false);

  // Restore Loading
  const [restoreLoading, setRestoreLoading] = React.useState(false);

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<DetailContact | null>(null);

  // Delete Contact Confirm Dialog
  const [contactToDelete, setContactToDelete] = React.useState<DetailContact | null>(null);
  const [deleteContactLoading, setDeleteContactLoading] = React.useState(false);

  // Sync state when props change
  React.useEffect(() => {
    setCurrentStatus(company.status);
  }, [company.status]);

  // Click outside handlers
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setIsPriorityDropdownOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status Change trigger
  const handleSelectStatus = async (newStatus: LeadStatus) => {
    setIsStatusDropdownOpen(false);
    if (newStatus === currentStatus) return;

    if (newStatus === 'contact_later' || newStatus === 'meeting_scheduled') {
      setPendingStatus(newStatus);
      setIsScheduleModalOpen(true);
      return;
    }

    // Direct status update
    setStatusLoading(true);
    const res = await changeCompanyStatusAction(company.id, newStatus);
    setStatusLoading(false);
    if (res.success) {
      setCurrentStatus(newStatus);
      setToastMessage({ type: 'success', msg: 'Status updated successfully' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to update status' });
    }
  };

  const handleConfirmScheduledStatus = async (payload: { dueAt: string; reminderType: string; note?: string }) => {
    if (!pendingStatus) return;
    setStatusLoading(true);
    const res = await changeCompanyStatusAction(
      company.id,
      pendingStatus,
      payload.dueAt,
      payload.reminderType,
      payload.note
    );
    setStatusLoading(false);
    if (res.success) {
      setCurrentStatus(pendingStatus);
      setIsScheduleModalOpen(false);
      setPendingStatus(null);
      setToastMessage({ type: 'success', msg: 'Status updated and follow-up scheduled' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to schedule follow-up' });
    }
  };

  const handleCancelScheduledStatus = () => {
    setIsScheduleModalOpen(false);
    setPendingStatus(null);
  };

  // Priority update
  const handleSelectPriority = async (newPriority: PriorityLevel) => {
    setIsPriorityDropdownOpen(false);
    if (newPriority === company.priority) return;

    const res = await updatePriorityAction(company.id, newPriority);
    if (res.success) {
      setToastMessage({ type: 'success', msg: `Priority updated to ${newPriority}` });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to update priority' });
    }
  };

  // Assignee update
  const handleSelectAssignee = async (newAssigneeId: string) => {
    if (newAssigneeId === company.assignedTo) return;

    const res = await updateAssigneeAction(company.id, newAssigneeId);
    if (res.success) {
      const assigneeName = profileNameMap[newAssigneeId] || 'Unassigned';
      setToastMessage({ type: 'success', msg: `Assigned to ${assigneeName}` });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to update assignee' });
    }
  };

  // Archive & Restore handlers
  const handleArchiveConfirm = async (payload?: { reason?: string; note?: string }) => {
    setArchiveLoading(true);
    const res = await archiveCompanyAction(company.id, payload?.reason, payload?.note);
    setArchiveLoading(false);
    setIsArchiveDialogOpen(false);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Company archived' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to archive company' });
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    const res = await restoreCompanyAction(company.id);
    setRestoreLoading(false);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Company restored successfully' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to restore company' });
    }
  };

  // Contact actions
  const handleSaveContact = async (data: {
    name: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  }) => {
    let res: any;
    if (selectedContact) {
      res = await updateContactAction(selectedContact.id, company.id, data);
    } else {
      res = await addContactAction({ ...data, companyId: company.id });
    }

    if (res.success) {
      setToastMessage({ type: 'success', msg: selectedContact ? 'Contact updated' : 'Contact added' });
      router.refresh();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleDeleteContactConfirm = async () => {
    if (!contactToDelete) return;
    setDeleteContactLoading(true);
    const res = await deleteContactAction(contactToDelete.id, company.id);
    setDeleteContactLoading(false);
    setContactToDelete(null);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Contact deleted' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to delete contact' });
    }
  };

  const handleMakePrimaryContact = async (contactId: string) => {
    const res = await setPrimaryContactAction(contactId, company.id);
    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Primary contact updated' });
      router.refresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to set primary contact' });
    }
  };

  // Readable status label map
  const statusLabels: Record<string, string> = {
    new: 'New Lead',
    contacted: 'Contacted',
    not_interested: 'Not Interested',
    contact_later: 'Contact Later',
    meeting_scheduled: 'Meeting Scheduled',
  };

  // History timeline log text generator
  const renderHistoryText = (log: HistoryLogEntry) => {
    const actor = log.actorName || 'System';

    switch (log.action) {
      case 'added':
        return `Company added by ${actor}`;

      case 'status_changed': {
        const fromLabel = log.oldValue ? statusLabels[log.oldValue] || log.oldValue : 'new';
        const toLabel = log.newValue ? statusLabels[log.newValue] || log.newValue : 'new';
        return (
          <>
            Status changed from <span className="font-semibold text-white">{fromLabel}</span> to{' '}
            <span className="font-semibold text-[#0A84FF]">{toLabel}</span> by {actor}
          </>
        );
      }

      case 'reassigned': {
        const oldName = log.oldValue ? profileNameMap[log.oldValue] || 'Unassigned' : 'Unassigned';
        const newName = log.newValue ? profileNameMap[log.newValue] || 'Unassigned' : 'Unassigned';
        return `Reassigned from ${oldName} to ${newName} by ${actor}`;
      }

      case 'priority_changed': {
        const fromP = log.oldValue ? log.oldValue.toUpperCase() : 'MEDIUM';
        const toP = log.newValue ? log.newValue.toUpperCase() : 'MEDIUM';
        return `Priority changed from ${fromP} to ${toP} by ${actor}`;
      }

      case 'reminder_created': {
        const typeStr = log.details?.type || 'reminder';
        const dueStr = log.details?.due_at ? formatAuditDateTime(log.details.due_at) : '';
        return `Reminder created: ${typeStr}${dueStr ? `, due ${dueStr}` : ''} by ${actor}`;
      }

      case 'archived': {
        const reasonStr = log.details?.reason ? ` (${log.details.reason})` : '';
        return `Archived${reasonStr} by ${actor}`;
      }

      case 'restored':
        return `Restored by ${actor}`;

      case 'remark_posted':
        return `Remark posted by ${actor}: "${log.newValue || ''}"`;

      default:
        return `${log.action.replace(/_/g, ' ')} by ${actor}`;
    }
  };

  return (
    <PresenceProvider
      companyId={company.id}
      currentUserId={currentUserId}
      currentUserName={profileNameMap[currentUserId] || 'Teammate'}
    >
      <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.msg}
            isOpen={Boolean(toastMessage)}
            onClose={() => setToastMessage(null)}
          />
        )}

        {/* Top Breadcrumb & Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/companies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E8E93] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Companies</span>
          </Link>

          {/* Presence Collision Indicator */}
          <PresenceIndicator />
        </div>

        {/* Archive Warning Banner */}
        {company.isArchived && (
          <div className="p-4 rounded-xl bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF9F0A] shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-[#FF9F0A]">This company is archived</h4>
                <p className="text-xs text-[#8E8E93]">
                  Reason: {company.archiveReason || 'No reason specified'}. Editing actions are disabled while archived.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleRestore}
              disabled={restoreLoading}
              className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {restoreLoading ? 'Restoring...' : 'Restore Company'}
            </Button>
          </div>
        )}

        {/* Header Banner Surface */}
        <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0 shadow-sm font-bold text-xl">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-white tracking-tight">{company.name}</h1>
                {company.isArchived && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/20">
                    Archived
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[#8E8E93] flex-wrap">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.location}
                  </span>
                )}
                <span>Added {formatAuditDateTime(company.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Header Controls: Status Dropdown, Priority Tag, Assignee, Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Dropdown Pill */}
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                disabled={company.isArchived || statusLoading}
                onClick={() => !company.isArchived && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-2 bg-[#1C1C1F] hover:bg-[#26262A] px-3.5 py-2 rounded-full border border-white/10 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <StatusPill status={currentStatus} />
                <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93]" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-1.5 w-48 flex flex-col gap-1">
                  {(['new', 'contacted', 'contact_later', 'meeting_scheduled', 'not_interested'] as LeadStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSelectStatus(st)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                          currentStatus === st
                            ? 'bg-[#0A84FF]/20 text-white font-semibold'
                            : 'text-[#E4E4E7] hover:bg-white/[0.08]'
                        }`}
                      >
                        <StatusPill status={st} />
                        {currentStatus === st && <CheckCircle2 className="w-4 h-4 text-[#0A84FF]" />}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Priority Selector Tag */}
            <div className="relative" ref={priorityRef}>
              <button
                type="button"
                disabled={company.isArchived}
                onClick={() => !company.isArchived && setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                className="flex items-center gap-1.5 bg-[#1C1C1F] hover:bg-[#26262A] px-3 py-2 rounded-full border border-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PriorityTag priority={company.priority} />
                <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93]" />
              </button>

              {isPriorityDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-1 w-36 flex flex-col gap-1">
                  {(['low', 'medium', 'high'] as PriorityLevel[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPriority(p)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        company.priority === p ? 'bg-white/10 font-semibold' : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <PriorityTag priority={p} />
                      {company.priority === p && <CheckCircle2 className="w-4 h-4 text-[#0A84FF]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned To Selector */}
            <div className="w-44">
              <SelectWithAvatars
                options={profiles}
                value={company.assignedTo || null}
                onChange={handleSelectAssignee}
                disabled={company.isArchived}
              />
            </div>

            {/* Actions Dropdown Menu */}
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="p-2 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] border border-white/10 text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isActionsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-1.5 w-40 flex flex-col gap-1">
                  {!company.isArchived && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#E4E4E7] hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#0A84FF]" />
                      <span>Edit Company</span>
                    </button>
                  )}

                  {company.isArchived ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handleRestore();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0A84FF] hover:bg-[#0A84FF]/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        setIsArchiveDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (Reminders & Remarks - 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Company Reminders Card */}
            <CompanyRemindersCard
              companyId={company.id}
              companyName={company.name}
              isArchived={company.isArchived}
              reminders={company.reminders || []}
              companies={[{ id: company.id, name: company.name }]}
              profiles={profiles}
              currentUserId={currentUserId}
            />

            {/* Remarks Section */}
            <RemarksSection
              companyId={company.id}
              isArchived={company.isArchived}
              initialRemarks={initialRemarks}
              totalCount={remarksTotalCount}
              teammates={profiles}
              currentUserId={currentUserId}
              profileNameMap={profileNameMap}
            />
          </div>

        {/* RIGHT COLUMN (Info Card, Contacts Card, Audit History Timeline - 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 1. Company Profile Card */}
          <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h2 className="text-base font-medium text-white border-b border-white/[0.08] pb-3">
              Company Profile
            </h2>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg text-xs">
                <span className="text-[#8E8E93]">Industry</span>
                <span className="text-white font-medium">{company.industryName || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg text-xs">
                <span className="text-[#8E8E93]">State</span>
                <span className="text-white font-medium">{company.stateName || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg text-xs">
                <span className="text-[#8E8E93]">Location</span>
                <span className="text-white font-medium">{company.location || '—'}</span>
              </div>

              {/* Render custom fields that have values */}
              {customFieldDefinitions.map((def) => {
                const val = company.customFields?.[def.id];
                if (val === undefined || val === null || val === '') return null;

                const displayVal =
                  typeof val === 'object' ? JSON.stringify(val) : String(val);

                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[#8E8E93] truncate">{def.name}</span>
                      {!def.isActive && (
                        <span className="px-1.5 py-0.2 rounded bg-[#FF9F0A]/10 text-[#FF9F0A] text-[10px] font-semibold shrink-0">
                          Retired
                        </span>
                      )}
                    </div>
                    <span className="text-white font-medium truncate max-w-[200px]" title={displayVal}>
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Contacts Card */}
          <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-base font-medium text-white">Company Contacts</h2>
              {!company.isArchived && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedContact(null);
                    setIsContactModalOpen(true);
                  }}
                  className="text-xs text-[#0A84FF] hover:bg-[#0A84FF]/10 h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Contact
                </Button>
              )}
            </div>

            {company.contacts.length === 0 ? (
              <p className="text-xs text-[#8E8E93] text-center py-6">No contacts added yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {company.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3 group hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={contact.name} email={contact.email} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{contact.name}</span>
                          {contact.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.jobTitle && (
                          <span className="text-[11px] text-[#8E8E93] truncate flex items-center gap-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {contact.jobTitle}
                          </span>
                        )}
                        {contact.email && (
                          <span className="text-[11px] text-[#8E8E93] truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="text-[11px] text-[#8E8E93] truncate flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {!company.isArchived && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!contact.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleMakePrimaryContact(contact.id)}
                            className="p-1 rounded text-[#8E8E93] hover:text-[#0A84FF] hover:bg-white/10 text-xs transition-colors"
                            title="Make primary contact"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContact(contact);
                            setIsContactModalOpen(true);
                          }}
                          className="p-1 rounded text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors"
                          title="Edit contact"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactToDelete(contact)}
                          className="p-1 rounded text-[#8E8E93] hover:text-[#FF453A] hover:bg-white/10 transition-colors"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. History Timeline Card (Read-Only Audit Trail) */}
          <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-white">History Log</h2>
                <span title="Audit trail, cannot be edited">
                  <Lock className="w-3.5 h-3.5 text-[#8E8E93]" />
                </span>
              </div>
              <span className="text-[11px] text-[#8E8E93] bg-white/[0.06] px-2.5 py-0.5 rounded-full font-mono">
                Audit trail, cannot be edited
              </span>
            </div>

            {company.historyLogs.length === 0 ? (
              <p className="text-xs text-[#8E8E93] text-center py-6">No history recorded yet.</p>
            ) : (
              <div className="relative flex flex-col pl-4 pt-1">
                {/* Vertical Spine */}
                <div className="absolute left-[21px] top-3 bottom-3 w-[2px] bg-white/[0.08]" />

                {company.historyLogs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3 pb-5 group">
                    <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-[#0A84FF] ring-4 ring-[#161618] flex items-center justify-center shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-xs text-[#E4E4E7] leading-relaxed">
                        {renderHistoryText(log)}
                      </p>
                      <span className="text-[10px] text-[#8E8E93]">
                        {formatAuditDateTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Schedule Follow-up Modal */}
      {isScheduleModalOpen && pendingStatus && (
        <ScheduleFollowUpModal
          isOpen={isScheduleModalOpen}
          targetStatus={pendingStatus}
          onConfirm={handleConfirmScheduledStatus}
          onCancel={handleCancelScheduledStatus}
          loading={statusLoading}
        />
      )}

      {/* Edit Company Modal */}
      {isEditModalOpen && (
        <AddEditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            router.refresh();
          }}
          initialData={company}
          industries={industries}
          states={states}
          profiles={profiles}
          customFieldDefinitions={customFieldDefinitions}
          currentUserId={currentUserId}
          onOpenManageCustomFields={() => setIsManageCustomFieldsOpen(true)}
        />
      )}

      {/* Manage Custom Fields Modal */}
      {isManageCustomFieldsOpen && (
        <ManageCustomFieldsModal
          isOpen={isManageCustomFieldsOpen}
          onClose={() => setIsManageCustomFieldsOpen(false)}
          definitions={customFieldDefinitions}
          onRefresh={() => router.refresh()}
        />
      )}

      {/* Archive Confirmation Dialog */}
      {isArchiveDialogOpen && (
        <ConfirmDialog
          isOpen={isArchiveDialogOpen}
          onClose={() => setIsArchiveDialogOpen(false)}
          onConfirm={handleArchiveConfirm}
          title="Archive Company"
          description="Archiving will hide this company from active lists and disable editing."
          confirmText="Archive Company"
          variant="warning"
          showReasonSelect={true}
          reasonOptions={[
            { value: 'Closed down', label: 'Closed down' },
            { value: 'Duplicate', label: 'Duplicate' },
            { value: 'Not a fit', label: 'Not a fit' },
            { value: 'Other', label: 'Other' },
          ]}
          showNoteField={true}
          loading={archiveLoading}
        />
      )}

      {/* Contact Modal (Add/Edit) */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          onSubmit={handleSaveContact}
          initialData={selectedContact}
        />
      )}

      {/* Delete Contact Confirm Dialog */}
      {Boolean(contactToDelete) && (
        <ConfirmDialog
          isOpen={Boolean(contactToDelete)}
          onClose={() => setContactToDelete(null)}
          onConfirm={handleDeleteContactConfirm}
          title="Delete Contact"
          description={`Are you sure you want to delete ${contactToDelete?.name}?`}
          confirmText="Delete Contact"
          variant="danger"
          loading={deleteContactLoading}
        />
      )}
      </div>
    </PresenceProvider>
  );
};
