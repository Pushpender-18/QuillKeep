'use client';

import React from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Video,
  PhoneMissed,
  FileText,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatAuditDateTime } from '@/lib/date-utils';

interface SerializableReminderWithPriority {
  id: string;
  companyId: string;
  companyName: string;
  assignedTo: string;
  assigneeName: string;
  assigneeEmail: string;
  type: 'callback' | 'missed_call' | 'meeting' | 'manual';
  dueAt: string;
  note?: string | null;
  isOverdue: boolean;
  priority: string; // high, medium, low
}

interface UpcomingRemindersCardProps {
  reminders: SerializableReminderWithPriority[];
  scope: 'mine' | 'all';
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'callback':
      return <PhoneCall className="w-3.5 h-3.5 text-[#0A84FF]" />;
    case 'meeting':
      return <Video className="w-3.5 h-3.5 text-[#FF9F0A]" />;
    case 'missed_call':
      return <PhoneMissed className="w-3.5 h-3.5 text-[#FF453A]" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-[#8E8E93]" />;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'callback':
      return 'Call-back';
    case 'meeting':
      return 'Meeting';
    case 'missed_call':
      return 'Missed Call';
    default:
      return 'Manual Note';
  }
}

export function UpcomingRemindersCard({
  reminders,
  scope,
}: UpcomingRemindersCardProps) {
  const overdueCount = reminders.filter((r) => r.isOverdue).length;

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 shadow-xs dark:shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium text-slate-900 dark:text-white">Upcoming Reminders</h2>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-[#FF453A]/20 dark:text-[#FF453A] text-xs font-semibold">
              {overdueCount} Overdue
            </span>
          )}
        </div>
        <Link
          href={`/tasks?scope=${scope}`}
          className="text-xs font-medium text-[#0A84FF] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Reminders List or Empty State */}
      {reminders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 dark:text-[#8E8E93]">
          <Clock className="w-8 h-8 text-slate-400 dark:text-[#8E8E93]/60 mb-2" />
          <p className="text-sm font-medium text-slate-800 dark:text-white">Nothing coming up</p>
          <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-0.5">
            No pending reminders assigned for this scope right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-200 dark:divide-white/[0.08]">
          {reminders.map((r) => {
            const formattedTime = formatAuditDateTime(r.dueAt);

            return (
              <div
                key={r.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
              >
                {/* Left side: Priority dot, company name, type, due time */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Priority dot */}
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0',
                      r.priority === 'high' && 'bg-[#FF453A] ring-4 ring-[#FF453A]/20',
                      r.priority === 'medium' && 'bg-[#FF9F0A]',
                      r.priority === 'low' && 'bg-slate-400 dark:bg-[#8E8E93]'
                    )}
                    title={`Priority: ${r.priority}`}
                  />

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/companies/${r.companyId}`}
                        className="text-sm font-medium text-slate-900 dark:text-white hover:text-[#0A84FF] transition-colors truncate"
                      >
                        {r.companyName}
                      </Link>

                      {/* Reminder Type Badge */}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-[#8E8E93] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                        {getTypeIcon(r.type)}
                        <span>{getTypeLabel(r.type)}</span>
                      </span>

                      {/* Due Time badge */}
                      {r.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-[#FF453A]/20 dark:text-[#FF453A] text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-[#FF453A] animate-pulse" />
                          <span>Overdue ({formattedTime})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-[#8E8E93]">
                          {formattedTime}
                        </span>
                      )}
                    </div>

                    {r.note && (
                      <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-1 line-clamp-1">
                        {r.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Assignee Avatar if scope === 'all' */}
                {scope === 'all' && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Avatar
                      name={r.assigneeName}
                      email={r.assigneeEmail}
                      size="sm"
                    />
                    <span className="text-xs text-slate-600 dark:text-[#8E8E93] hidden md:inline truncate max-w-[100px]">
                      {r.assigneeName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
