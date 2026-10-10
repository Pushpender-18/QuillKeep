import React from 'react';

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between h-[130px]"
        >
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="flex flex-col gap-2">
            <div className="h-8 w-20 bg-white/15 rounded" />
            <div className="h-3 w-24 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuccessMeterSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-[320px] animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="h-4 w-4 rounded-full bg-white/10" />
      </div>
      <div className="flex flex-col items-center justify-center my-auto gap-4">
        <div className="w-44 h-24 rounded-t-full bg-white/10 border-t-4 border-white/20" />
        <div className="h-7 w-16 bg-white/15 rounded" />
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export function PerformanceChartSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-[320px] animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="h-5 w-44 bg-white/15 rounded" />
          <div className="h-3 w-64 bg-white/10 rounded" />
        </div>
      </div>
      <div className="flex-1 w-full bg-white/5 rounded-xl flex items-end p-4 gap-3">
        {[40, 65, 30, 80, 50, 90, 70, 45, 60, 85].map((h, idx) => (
          <div
            key={idx}
            className="flex-1 bg-white/10 rounded-t transition-all"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function UpcomingRemindersSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="h-5 w-44 bg-white/15 rounded" />
        <div className="h-4 w-20 bg-white/10 rounded" />
      </div>
      <div className="flex flex-col divide-y divide-white/[0.08]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 bg-white/15 rounded" />
                <div className="h-3 w-48 bg-white/10 rounded" />
              </div>
            </div>
            <div className="h-3 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamActivitySkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="h-5 w-36 bg-white/15 rounded" />
      </div>
      <div className="flex flex-col divide-y divide-white/[0.08]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15" />
              <div className="h-4 w-28 bg-white/15 rounded" />
            </div>
            <div className="flex items-center gap-8">
              <div className="h-4 w-12 bg-white/10 rounded" />
              <div className="h-4 w-12 bg-white/10 rounded" />
              <div className="h-4 w-16 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
