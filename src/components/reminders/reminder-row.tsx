'use client';

import * as React from 'react';
import Link from 'next/link';
import { SerializableReminder } from '@/lib/reminders';
import { Avatar } from '@/components/ui/avatar';
import { toggleCompleteReminderAction } from '@/app/actions/reminders';
import { Toast } from '@/components/ui/toast';
import {
  Phone,
  PhoneMissed,
  Video,
  Bell,
  Bot,
  User,
  MoreVertical,
  Check,
  Edit2,
  Calendar,
  Trash2,
} from 'lucide-react';

export interface ReminderRowProps {
  reminder: SerializableReminder;
  showAssignee?: boolean;
  onEdit?: (reminder: SerializableReminder) => void;
  onReschedule?: (reminder: SerializableReminder) => void;
  onDelete?: (reminder: SerializableReminder) => void;
  disabled?: boolean;
}

export const ReminderRow: React.FC<ReminderRowProps> = ({
  reminder,
  showAssignee = false,
  onEdit,
  onReschedule,
  onDelete,
  disabled = false,
}) => {
  const [isCompleted, setIsCompleted] = React.useState(Boolean(reminder.completedAt));
  const [loading, setLoading] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIsCompleted(Boolean(reminder.completedAt));
  }, [reminder.completedAt]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format time in IST
  const due = new Date(reminder.dueAt);
  const timeFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(due);

  // Overdue relative text (e.g. "Overdue 20h", "Overdue 2d")
  let overdueSubtext = '';
  if (reminder.isOverdue && !isCompleted) {
    const diffMs = new Date().getTime() - due.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      overdueSubtext = `Overdue ${Math.max(1, diffHours)}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      overdueSubtext = `Overdue ${diffDays}d`;
    }
  }

  const handleToggleCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || loading) return;

    const nextState = !isCompleted;
    // Optimistic UI update
    setIsCompleted(nextState);
    setLoading(true);

    const res = await toggleCompleteReminderAction(reminder.id, nextState);
    setLoading(false);

    if (res.success) {
      setToastMessage({
        type: 'success',
        msg: nextState ? 'Marked complete' : 'Restored reminder',
      });
    } else {
      // Revert optimistic update on error
      setIsCompleted(!nextState);
      setToastMessage({ type: 'error', msg: res.error || 'Failed to update status' });
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    callback: <Phone className="w-4 h-4 text-[#0A84FF]" />,
    missed_call: <PhoneMissed className="w-4 h-4 text-[#FF9F0A]" />,
    meeting: <Video className="w-4 h-4 text-[#30D158]" />,
    manual: <Bell className="w-4 h-4 text-[#8E8E93]" />,
  };

  const typeLabels: Record<string, string> = {
    callback: 'Call-back',
    missed_call: 'Missed call',
    meeting: 'Meeting',
    manual: 'Manual',
  };

  return (
    <div className="relative group">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.msg}
          isOpen={Boolean(toastMessage)}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div
        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          isCompleted
            ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
            : reminder.isOverdue
            ? 'bg-[#FF453A]/[0.06] border-[#FF453A]/30 hover:bg-[#FF453A]/10'
            : 'bg-[#1C1C1E] border-white/[0.08] hover:bg-white/[0.04]'
        }`}
      >
        {/* Left Info Cluster */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 overflow-hidden">
          {/* Checkbox */}
          <button
            type="button"
            disabled={disabled || loading}
            onClick={handleToggleCheck}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              isCompleted
                ? 'bg-[#0A84FF] border-[#0A84FF] text-white'
                : 'border-[#8E8E93] hover:border-[#0A84FF] bg-[#121214]'
            }`}
            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </button>

          {/* Time & Overdue Subtext */}
          <div className="flex flex-col shrink-0 min-w-[85px]">
            <span
              className={`text-xs font-semibold ${
                reminder.isOverdue && !isCompleted ? 'text-[#FF453A]' : 'text-white'
              }`}
            >
              {timeFormatted}
            </span>
            {overdueSubtext && (
              <span className="text-[11px] font-medium text-[#FF453A]">{overdueSubtext}</span>
            )}
          </div>

          {/* Company Name & Note Preview */}
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`/companies/${reminder.companyId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-white hover:text-[#0A84FF] transition-colors truncate"
              >
                {reminder.companyName}
              </Link>

              {/* Source Badge (Auto vs Manual) */}
              {reminder.source === 'auto' ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.08] text-[#8E8E93]"
                  title="Auto-created from status change"
                >
                  <Bot className="w-3 h-3" />
                  Auto
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.08] text-[#8E8E93]"
                  title="Manually created"
                >
                  <User className="w-3 h-3" />
                  Manual
                </span>
              )}
            </div>

            {reminder.note && (
              <span className="text-[11px] text-[#8E8E93] truncate mt-0.5">{reminder.note}</span>
            )}
          </div>

          {/* Type Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8E8E93] shrink-0 w-28">
            {typeIcons[reminder.type] || <Bell className="w-4 h-4 text-[#8E8E93]" />}
            <span>{typeLabels[reminder.type] || reminder.type}</span>
          </div>

          {/* Assignee Avatar (in All Team mode) */}
          {showAssignee && (
            <div className="hidden md:flex items-center gap-2 shrink-0 pr-2">
              <Avatar name={reminder.assigneeName} email={reminder.assigneeEmail} size="sm" />
              <span className="text-xs text-[#8E8E93] truncate max-w-[100px]">
                {reminder.assigneeName}
              </span>
            </div>
          )}
        </div>

        {/* Right Menu Trigger */}
        {!disabled && (
          <div className="relative shrink-0 ml-2" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-1 w-36 flex flex-col gap-0.5">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(reminder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#E4E4E7] hover:bg-white/[0.08] transition-colors text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#0A84FF]" />
                    <span>Edit</span>
                  </button>
                )}

                {onReschedule && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onReschedule(reminder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#E4E4E7] hover:bg-white/[0.08] transition-colors text-left"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#FF9F0A]" />
                    <span>Reschedule</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(reminder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
