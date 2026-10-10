import React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between h-[130px]', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

export function GaugeSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-[320px]">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="flex flex-col items-center justify-center my-auto gap-4">
        <Skeleton className="w-44 h-24 rounded-t-full" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-[320px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="flex-1 w-full bg-white/[0.02] rounded-xl flex items-end p-4 gap-3">
        {[40, 65, 30, 80, 50, 90, 70, 45, 60, 85].map((h, idx) => (
          <Skeleton
            key={idx}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <div className="bg-[#161618] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col">
      {/* Table Header Bar Skeleton */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      {/* 10 Table Rows matching real column layout */}
      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-[220px] flex-1">
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full shrink-0 hidden md:block" />
            <Skeleton className="h-6 w-28 rounded-full shrink-0 hidden lg:block" />
            <Skeleton className="h-6 w-24 rounded-full shrink-0 hidden sm:block" />
            <Skeleton className="h-4 w-28 shrink-0 hidden xl:block" />
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReminderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex flex-col divide-y divide-white/[0.08]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 min-h-[320px]">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-4 pl-2 pt-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="w-3 h-3 rounded-full mt-1 shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RemarksSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 min-h-[400px]">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex flex-col gap-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-start p-3 bg-white/[0.02] rounded-xl">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 min-h-[340px]">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Skeleton key={i} className="h-6 w-full text-center" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 min-h-[200px]', className)}>
      <Skeleton className="h-5 w-36 border-b border-white/[0.08] pb-4" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
