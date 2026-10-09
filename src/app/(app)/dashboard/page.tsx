import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { Building2, PhoneCall, Video, CheckCircle2, ArrowUpRight, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-8">
      {/* Top Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light text-white tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161618] border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
              <span className="text-white/90 font-medium">Live Sync</span>
            </div>
          </div>
          <p className="text-sm text-[#8E8E93]">
            Welcome back, {user.fullName || user.email}. Here is your pipeline overview today.
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Total Companies
            </span>
            <Building2 className="w-4 h-4 text-[#0A84FF]" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-light text-white tracking-tight">--</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-[#30D158] font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pipeline active</span>
            </div>
          </div>
        </div>

        <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Meetings Scheduled
            </span>
            <Video className="w-4 h-4 text-[#FF9F0A]" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-light text-white tracking-tight">--</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-[#8E8E93] font-medium">
              <span>Upcoming meetings</span>
            </div>
          </div>
        </div>

        <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Active Leads
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#30D158]" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-light text-white tracking-tight">--</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-[#30D158] font-medium">
              <span>In progress</span>
            </div>
          </div>
        </div>

        <div className="bg-[#FF453A]/10 border border-[#FF453A]/30 p-5 rounded-2xl flex flex-col justify-between transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FF453A]">
              Overdue Tasks
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FF453A]/20 flex items-center justify-center text-[#FF453A]">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-light text-white tracking-tight">0</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#FF453A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A]" />
              <span>All tasks clear</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card Shell */}
      <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-medium text-white">Task Overview</h2>
            <p className="text-xs text-[#8E8E93] mt-0.5">Summary of pending lead activities and follow-ups</p>
          </div>
          <Button variant="ghost" size="sm">
            View All Tasks
          </Button>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center text-[#8E8E93]">
          <CheckCircle2 className="w-10 h-10 text-[#0A84FF] mb-3 opacity-80" />
          <p className="text-sm font-medium text-white">Dashboard ready</p>
          <p className="text-xs text-[#8E8E93] max-w-sm mt-1">
            Phase 1 structure initialized. Real data will be populated in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
