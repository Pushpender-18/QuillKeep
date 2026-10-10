'use client';

import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TeammateActivity } from '@/lib/dashboard-query';

interface TeamActivityCardProps {
  teammates: TeammateActivity[];
  currentUserId: string;
}

export function TeamActivityCard({
  teammates,
  currentUserId,
}: TeamActivityCardProps) {
  if (!teammates || teammates.length === 0) return null;

  return (
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-base font-medium text-white">Team Activity</h2>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Outreach and conversion breakdown across active team members
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-[#8E8E93] font-semibold text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold">Teammate</th>
              <th className="pb-3 font-semibold text-right">Contacted</th>
              <th className="pb-3 font-semibold text-right">Meetings</th>
              <th className="pb-3 font-semibold text-right">Conversion Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {teammates.map((tm) => {
              const isCurrentUser = tm.userId === currentUserId;

              return (
                <tr
                  key={tm.userId}
                  className={cn(
                    'transition-colors hover:bg-white/[0.02]',
                    isCurrentUser && 'bg-[#0A84FF]/10 font-medium'
                  )}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={tm.fullName}
                        email={tm.email}
                        size="sm"
                      />
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-white truncate">{tm.fullName}</span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-[#0A84FF]/20 text-[#0A84FF] text-[11px] font-semibold shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-white font-mono">
                    {tm.contacted.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-white font-mono">
                    {tm.meetings.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 pl-4 text-right font-mono">
                    {tm.contacted === 0 ? (
                      <span className="text-[#8E8E93]">No data</span>
                    ) : (
                      <span
                        className={cn(
                          tm.conversionRate >= 70
                            ? 'text-[#30D158]'
                            : tm.conversionRate >= 50
                            ? 'text-[#FF9F0A]'
                            : 'text-[#FF453A]'
                        )}
                      >
                        {tm.conversionRate.toLocaleString('en-IN')}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
