import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckSquare, Plus, Filter, Calendar } from 'lucide-react';

export default async function TasksPage() {
  const user = await getCurrentUser();

  // Load reminders/tasks from Prisma database
  let rawReminders: any[] = [];
  try {
    rawReminders = await prisma.orm.public.Reminders.all();
  } catch {
    rawReminders = [];
  }

  const tasks = convertBigInts(rawReminders);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Task Hub</h1>
          <p className="text-sm text-[#8E8E93] mt-0.5">
            Manage scheduled follow-ups, calls, meetings, and lead reminders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-1.5" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Reminder
          </Button>
        </div>
      </div>

      {/* Task List or Empty State */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-[#0A84FF]" />}
          title="No tasks scheduled"
          description="Your task hub has no pending follow-ups or reminders assigned."
          action={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Reminder
            </Button>
          }
        />
      ) : (
        <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h2 className="text-base font-medium text-white">Scheduled Tasks</h2>
            <span className="text-xs text-[#8E8E93]">{tasks.length} total tasks</span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {tasks.map((task: any) => (
              <div key={task.id} className="py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0A84FF]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{task.note || 'Follow-up Task'}</span>
                    <span className="text-xs text-[#8E8E93] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Due {task.dueAt ? String(task.dueAt).slice(0, 10) : 'TBD'}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Complete
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
