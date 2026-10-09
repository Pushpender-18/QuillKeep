'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ReminderRow } from '@/components/reminders/reminder-row';
import { ReminderModal, CompanyOption } from '@/components/reminders/reminder-modal';
import { SerializableReminder } from '@/lib/reminders';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { Toast } from '@/components/ui/toast';
import {
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface TaskHubClientProps {
  openReminders: SerializableReminder[];
  completedReminders: SerializableReminder[];
  overdueCount: number;
  reminderDaysMap: Record<string, { hasOpen: boolean; hasOverdue: boolean }>;
  currentScope: 'my' | 'all';
  currentMonth: string; // YYYY-MM
  selectedDay?: string | null; // YYYY-MM-DD
  companies: CompanyOption[];
  profiles: ProfileOption[];
  currentUserId: string;
}

export const TaskHubClient: React.FC<TaskHubClientProps> = ({
  openReminders,
  completedReminders,
  overdueCount,
  reminderDaysMap,
  currentScope,
  currentMonth,
  selectedDay,
  companies,
  profiles,
  currentUserId,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingReminder, setEditingReminder] = React.useState<SerializableReminder | null>(null);
  const [modalFocusField, setModalFocusField] = React.useState<'date' | 'general'>('general');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'calls' | 'meetings' | 'reminders'>('all');
  const [isCompletedExpanded, setIsCompletedExpanded] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Helper to update search params
  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  // Month navigation logic
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    updateParams({ month: prevMonthStr, day: null });
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    updateParams({ month: nextMonthStr, day: null });
  };

  const handleCurrentTodayMonth = () => {
    const now = new Date();
    const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    updateParams({ month: todayMonth, day: todayDay });
  };

  // Filter reminders by type filter chip
  const filteredOpenReminders = React.useMemo(() => {
    if (typeFilter === 'all') return openReminders;
    return openReminders.filter((r) => {
      if (typeFilter === 'calls') return r.type === 'callback' || r.type === 'missed_call';
      if (typeFilter === 'meetings') return r.type === 'meeting';
      if (typeFilter === 'reminders') return r.type === 'manual';
      return true;
    });
  }, [openReminders, typeFilter]);

  // Group reminders into Overdue, Today, Upcoming
  const nowISTString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const overdueList: SerializableReminder[] = [];
  const todayList: SerializableReminder[] = [];
  const upcomingList: SerializableReminder[] = [];

  filteredOpenReminders.forEach((r) => {
    if (r.isOverdue) {
      overdueList.push(r);
    } else {
      const due = new Date(r.dueAt);
      const istDayString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(due);

      if (istDayString === nowISTString) {
        todayList.push(r);
      } else {
        upcomingList.push(r);
      }
    }
  });

  // Calendar rendering math
  const [yearNum, monthNum] = currentMonth.split('-').map(Number);
  const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleString('en-US', { month: 'long' });

  // Month grid calculation
  const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const calendarDays = [];
  // Leading empty cells
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handleCalendarDayClick = (dayNum: number) => {
    const dayStr = `${currentMonth}-${String(dayNum).padStart(2, '0')}`;
    if (selectedDay === dayStr) {
      updateParams({ day: null });
    } else {
      updateParams({ day: dayStr });
    }
  };

  const isAllEmpty = overdueList.length === 0 && todayList.length === 0 && upcomingList.length === 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.msg}
          isOpen={Boolean(toastMessage)}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-light text-white tracking-tight">Task Hub</h1>
          <p className="text-xs text-[#8E8E93]">
            Organize and track scheduled follow-ups, calls, and outreach tasks
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Scope Toggle */}
          <SegmentedControl
            options={[
              { value: 'my', label: 'My Tasks' },
              { value: 'all', label: 'All Team' },
            ]}
            value={currentScope}
            onChange={(val) => updateParams({ scope: val, day: null })}
            size="sm"
          />

          <Button
            onClick={() => {
              setEditingReminder(null);
              setModalFocusField('general');
              setIsAddModalOpen(true);
            }}
            className="h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Red Overdue Banner (if overdue count > 0) */}
      {overdueCount > 0 && (
        <div className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#FF453A] shrink-0" />
            <span className="text-xs font-medium text-white">
              <strong className="text-[#FF453A] font-semibold">{overdueCount}</strong> overdue follow-up
              {overdueCount > 1 ? 's' : ''} require action
            </span>
          </div>
        </div>
      )}

      {/* Selected Day Filter Indicator Header */}
      {selectedDay && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A84FF]/10 border border-[#0A84FF]/25 text-xs text-[#0A84FF]">
          <span>
            Filtering checklist for: <strong className="text-white">{selectedDay}</strong>
          </span>
          <button
            type="button"
            onClick={() => updateParams({ day: null })}
            className="underline font-semibold hover:text-white cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Main 2-Column Task Hub Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Calendar & Quick Filter Stats (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Calendar Card */}
          <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-white">{monthName}</span>
                <span className="text-xs text-[#8E8E93] font-mono">{yearNum}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCurrentTodayMonth}
                  className="px-2 py-0.5 rounded bg-white/[0.06] text-[#D1D1D6] hover:text-white text-[11px] font-medium transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded text-[#8E8E93] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-[11px] text-[#8E8E93] font-semibold">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarDays.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="py-1 text-transparent" />;
                }

                const dayStr = `${currentMonth}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDay === dayStr;
                const isToday = nowISTString === dayStr;
                const dayMeta = reminderDaysMap[dayStr];

                return (
                  <div
                    key={dayStr}
                    onClick={() => handleCalendarDayClick(dayNum)}
                    className={`py-1.5 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0A84FF] text-white font-bold shadow-sm'
                        : isToday
                        ? 'bg-[#0A84FF]/20 text-[#0A84FF] font-semibold border border-[#0A84FF]/40'
                        : 'text-[#E4E4E7] hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {/* Dot indicators */}
                    {!isSelected && dayMeta && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          dayMeta.hasOverdue ? 'bg-[#FF453A]' : 'bg-[#0A84FF]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-[#8E8E93] pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A]" />
                <span>Overdue</span>
              </div>
            </div>

            {/* Type Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'calls', label: 'Calls' },
                { id: 'meetings', label: 'Meetings' },
                { id: 'reminders', label: 'Reminders' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTypeFilter(chip.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    typeFilter === chip.id
                      ? 'bg-white/20 text-white font-semibold'
                      : 'bg-white/[0.04] text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.03] text-center border border-white/[0.06]">
              <div className="flex flex-col">
                <span className="text-base font-semibold text-white">{openReminders.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-semibold">
                  Pending
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-[#FF453A]">{overdueCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-semibold">
                  Overdue
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-[#0A84FF]">{todayList.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-semibold">
                  Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Checklist Grouped Sections (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {isAllEmpty ? (
            <EmptyState
              icon={<CheckCircle2 className="w-7 h-7 text-[#30D158]" />}
              title="You're all caught up"
              description="No open follow-ups or reminders pending for the selected criteria."
              action={
                <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Reminder
                </Button>
              }
            />
          ) : (
            <>
              {/* 1. OVERDUE GROUP */}
              {overdueList.length > 0 && (
                <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF453A]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#FF453A]">
                        Overdue
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF453A]/20 text-[#FF453A]">
                        {overdueList.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {overdueList.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        showAssignee={currentScope === 'all'}
                        onEdit={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('general');
                          setIsAddModalOpen(true);
                        }}
                        onReschedule={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('date');
                          setIsAddModalOpen(true);
                        }}
                        onDelete={(r) => {
                          setEditingReminder(r);
                          setIsAddModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. TODAY GROUP */}
              {todayList.length > 0 && (
                <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF]">
                        Today
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0A84FF]/20 text-[#0A84FF]">
                        {todayList.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {todayList.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        showAssignee={currentScope === 'all'}
                        onEdit={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('general');
                          setIsAddModalOpen(true);
                        }}
                        onReschedule={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('date');
                          setIsAddModalOpen(true);
                        }}
                        onDelete={(r) => {
                          setEditingReminder(r);
                          setIsAddModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. UPCOMING GROUP */}
              {upcomingList.length > 0 && (
                <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                        Upcoming
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-[#8E8E93]">
                        {upcomingList.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {upcomingList.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        showAssignee={currentScope === 'all'}
                        onEdit={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('general');
                          setIsAddModalOpen(true);
                        }}
                        onReschedule={(r) => {
                          setEditingReminder(r);
                          setModalFocusField('date');
                          setIsAddModalOpen(true);
                        }}
                        onDelete={(r) => {
                          setEditingReminder(r);
                          setIsAddModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Collapsed Completed Section (Last 7 days) */}
          {completedReminders.length > 0 && (
            <div className="bg-[#161618]/60 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="flex items-center justify-between text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
                  <span>Completed (Last 7 days)</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px]">
                    {completedReminders.length}
                  </span>
                </div>
                {isCompletedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isCompletedExpanded && (
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  {completedReminders.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      showAssignee={currentScope === 'all'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reminder Add / Edit Modal */}
      {isAddModalOpen && (
        <ReminderModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingReminder(null);
            router.refresh();
          }}
          initialData={editingReminder}
          companies={companies}
          profiles={profiles}
          currentUserId={currentUserId}
          focusField={modalFocusField}
        />
      )}
    </div>
  );
};
