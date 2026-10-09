import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import { PriorityTag } from '@/components/ui/priority-tag';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Building2 } from 'lucide-react';
import Link from 'next/link';

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  priority: string;
  location?: string | null;
  createdAt: string;
}

export default async function CompaniesPage() {
  const user = await getCurrentUser();

  // Load companies from Prisma database
  let rawCompanies: any[] = [];
  try {
    rawCompanies = await prisma.orm.public.Companies.all();
  } catch {
    rawCompanies = [];
  }

  const companies: CompanyRow[] = convertBigInts(rawCompanies).map((c: any) => ({
    id: String(c.id),
    name: c.name,
    status: c.status,
    priority: c.priority,
    location: c.location,
    createdAt: String(c.createdAt || ''),
  }));

  const columns: Column<CompanyRow>[] = [
    {
      header: 'Company Name',
      accessorKey: 'name',
      cell: (row) => (
        <Link
          href={`/companies/${row.id}`}
          className="font-medium text-white hover:text-[#0A84FF] transition-colors"
        >
          {row.name}
        </Link>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      cell: (row) => <PriorityTag priority={row.priority} />,
    },
    {
      header: 'Location',
      accessorKey: 'location',
      cell: (row) => <span className="text-[#8E8E93] text-xs">{row.location || '—'}</span>,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Link href={`/companies/${row.id}`}>
          <Button variant="ghost" size="sm">
            View Detail
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Companies</h1>
          <p className="text-sm text-[#8E8E93] mt-0.5">
            Manage lead pipeline, organization profiles, and status updates
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Company
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search companies..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Companies Table or Empty State */}
      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-[#0A84FF]" />}
          title="No companies found"
          description="Your company lead database is currently empty. Add your first lead to start tracking."
          action={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Company
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={companies}
          keyExtractor={(row) => row.id}
        />
      )}
    </div>
  );
}
