import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { db } from '@/prisma/db';
import {
  bulkStatusChangeSchema,
  bulkReassignSchema,
  bulkArchiveSchema,
  bulkRestoreSchema,
} from '@/lib/schemas';
import { ApiError } from '@/lib/api/errors';
import { ServiceContext } from './companies';

export async function bulkChangeStatus(
  ctx: ServiceContext,
  input: {
    ids: string[];
    status: string;
    dueAt?: string | null;
    reminderType?: string | null;
    note?: string | null;
  }
) {
  if (input.ids && input.ids.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkStatusChangeSchema.parse(input);

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
    const comp = existingMap.get(id);
    if (comp && !comp.isArchived) {
      validIds.push(id);
    } else {
      skippedCount++;
    }
  }

  if (validIds.length === 0) {
    return {
      updatedCount: 0,
      skippedCount,
      message: `0 companies updated, ${skippedCount} skipped because they are archived or invalid.`,
    };
  }

  await withUser(
    ctx.user.id,
    async () => {
      const drv = (db.runtime() as any).driver;
      const gen = drv.query({
        sql: 'select bulk_change_company_status($1::uuid[], $2::lead_status, $3::timestamptz, $4::reminder_type, $5::text)',
        params: [validIds, parsed.status, parsed.dueAt || null, parsed.reminderType || null, parsed.note || null],
      });
      for await (const _ of gen) {
        // drain output
      }
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return {
    updatedCount: validIds.length,
    skippedCount,
  };
}

export async function bulkReassign(
  ctx: ServiceContext,
  input: { ids: string[]; newAssignedTo?: string | null; assignedTo?: string | null }
) {
  if (input.ids && input.ids.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkReassignSchema.parse(input);
  const targetAssignee = parsed.newAssignedTo !== undefined ? parsed.newAssignedTo : parsed.assignedTo;

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
    const comp = existingMap.get(id);
    if (comp && !comp.isArchived) {
      validIds.push(id);
    } else {
      skippedCount++;
    }
  }

  if (validIds.length === 0) {
    return {
      updatedCount: 0,
      skippedCount,
    };
  }

  await withUser(
    ctx.user.id,
    async () => {
      const drv = (db.runtime() as any).driver;
      const gen = drv.query({
        sql: 'update companies set assigned_to = $1::uuid, updated_at = now() where id = any($2::uuid[]) and is_archived = false',
        params: [targetAssignee || null, validIds],
      });
      for await (const _ of gen) {}
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return {
    updatedCount: validIds.length,
    skippedCount,
  };
}

export async function bulkArchive(
  ctx: ServiceContext,
  input: { ids: string[]; reason?: string | null; note?: string | null }
) {
  if (input.ids && input.ids.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkArchiveSchema.parse(input);

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
    const comp = existingMap.get(id);
    if (comp && !comp.isArchived) {
      validIds.push(id);
    } else {
      skippedCount++;
    }
  }

  if (validIds.length === 0) {
    return {
      updatedCount: 0,
      skippedCount,
    };
  }

  const finalReason = [parsed.reason, parsed.note].filter(Boolean).join(' - ') || 'Archived';

  await withUser(
    ctx.user.id,
    async () => {
      const drv = (db.runtime() as any).driver;
      const gen = drv.query({
        sql: 'update companies set is_archived = true, archived_at = now(), archived_by = $1::uuid, archive_reason = $2::text, updated_at = now() where id = any($3::uuid[]) and is_archived = false',
        params: [ctx.user.id, finalReason, validIds],
      });
      for await (const _ of gen) {}
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return {
    updatedCount: validIds.length,
    skippedCount,
  };
}

export async function bulkRestore(ctx: ServiceContext, input: { ids: string[] }) {
  if (input.ids && input.ids.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkRestoreSchema.parse(input);

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
    const comp = existingMap.get(id);
    if (comp && comp.isArchived) {
      validIds.push(id);
    } else {
      skippedCount++;
    }
  }

  if (validIds.length === 0) {
    return {
      updatedCount: 0,
      skippedCount,
    };
  }

  await withUser(
    ctx.user.id,
    async () => {
      const drv = (db.runtime() as any).driver;
      const gen = drv.query({
        sql: 'update companies set is_archived = false, archived_at = null, archived_by = null, archive_reason = null, updated_at = now() where id = any($1::uuid[]) and is_archived = true',
        params: [validIds],
      });
      for await (const _ of gen) {}
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return {
    updatedCount: validIds.length,
    skippedCount,
  };
}

export async function getTeammateLeadCounts(_ctx?: ServiceContext) {
  const drv = (db.runtime() as any).driver;
  const gen = drv.query({
    sql: 'select assigned_to, count(*)::int as count from companies where is_archived = false and assigned_to is not null group by assigned_to',
    params: [],
  });

  const leadCounts: Record<string, number> = {};
  for await (const row of gen) {
    const r = row as any;
    if (r.assigned_to) {
      leadCounts[String(r.assigned_to)] = Number(r.count || 0);
    }
  }

  return { leadCounts };
}
