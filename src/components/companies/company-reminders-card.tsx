'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SerializableReminder } from '@/lib/reminders';
import { ReminderRow } from '@/components/reminders/reminder-row';
import { ReminderModal, CompanyOption } from '@/components/reminders/reminder-modal';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { Button } from '@/components/ui/button';
import { BellRing, Plus, PauseCircle } from 'lucide-react';

export interface CompanyRemindersCardProps {
  companyId: string;
  companyName: string;
  isArchived: boolean;
  reminders: SerializableReminder[];
  companies: CompanyOption[];
  profiles: ProfileOption[];
  currentUserId: string;
}

export const CompanyRemindersCard: React.FC<CompanyRemindersCardProps> = ({
  companyId,
  companyName,
  isArchived,
  reminders,
  companies,
  profiles,
  currentUserId,
}) => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingReminder, setEditingReminder] = React.useState<SerializableReminder | null>(null);
  const [modalFocusField, setModalFocusField] = React.useState<'date' | 'general'>('general');

  return (
    <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium text-white">Reminders & Scheduled Follow-ups</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30">
            {reminders.length}
          </span>
        </div>

        {!isArchived && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingReminder(null);
              setModalFocusField('general');
              setIsModalOpen(true);
            }}
            className="text-xs text-[#0A84FF] hover:bg-[#0A84FF]/10 h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Reminder
          </Button>
        )}
      </div>

      {isArchived ? (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#8E8E93] flex items-center justify-center gap-2">
          <PauseCircle className="w-4 h-4 text-[#8E8E93]" />
          <span>Reminders are paused while archived</span>
        </div>
      ) : reminders.length === 0 ? (
        <p className="text-xs text-[#8E8E93] text-center py-6">
          No open reminders scheduled for {companyName}.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              onEdit={(r) => {
                setEditingReminder(r);
                setModalFocusField('general');
                setIsModalOpen(true);
              }}
              onReschedule={(r) => {
                setEditingReminder(r);
                setModalFocusField('date');
                setIsModalOpen(true);
              }}
              onDelete={(r) => {
                setEditingReminder(r);
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <ReminderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingReminder(null);
            router.refresh();
          }}
          initialData={editingReminder}
          prefilledCompanyId={companyId}
          companies={companies}
          profiles={profiles}
          currentUserId={currentUserId}
          focusField={modalFocusField}
        />
      )}
    </div>
  );
};
