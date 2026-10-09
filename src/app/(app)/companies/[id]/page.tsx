import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, MapPin, Calendar, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  let company: any = null;
  try {
    company = await prisma.orm.public.Companies.where({ id }).first();
  } catch {
    company = null;
  }

  const cleanCompany = company ? convertBigInts(company) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Back Button & Top Action Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8E8E93] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Companies
        </Link>
      </div>

      {/* Header Profile Section */}
      <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0 shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-light text-white tracking-tight">
                {cleanCompany ? cleanCompany.name : 'Company Detail'}
              </h1>
              <StatusPill status={cleanCompany ? cleanCompany.status : 'new'} />
              <PriorityTag priority={cleanCompany ? cleanCompany.priority : 'medium'} />
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8E8E93] flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#8E8E93]" />
                {cleanCompany?.location || 'Location not set'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#8E8E93]" />
                Added {cleanCompany?.createdAt ? String(cleanCompany.createdAt).slice(0, 10) : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            Update Status
          </Button>
          <Button size="sm">
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Grid Layout: Details & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview Details */}
        <div className="lg:col-span-1 bg-[#161618] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <h2 className="text-base font-medium text-white border-b border-white/[0.08] pb-3">
            Lead Metadata
          </h2>

          <div className="flex flex-col gap-4 text-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#8E8E93] font-medium block mb-1">
                ID
              </span>
              <span className="text-xs font-mono text-white/80">{id}</span>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-[#8E8E93] font-medium block mb-1">
                Assigned Owner
              </span>
              <div className="flex items-center gap-2 text-white">
                <UserCheck className="w-4 h-4 text-[#0A84FF]" />
                <span>{user.fullName || user.email}</span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-[#8E8E93] font-medium block mb-1">
                Last Contacted
              </span>
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{cleanCompany?.lastContactedAt ? String(cleanCompany.lastContactedAt) : 'Never'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity / History */}
        <div className="lg:col-span-2 bg-[#161618] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <h2 className="text-base font-medium text-white border-b border-white/[0.08] pb-3">
            Activity & Remarks
          </h2>
          <div className="py-12 text-center text-[#8E8E93] text-sm">
            No activity remarks recorded yet for this company.
          </div>
        </div>
      </div>
    </div>
  );
}
