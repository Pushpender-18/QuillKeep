'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { db } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { safeAction } from '@/lib/safe-action';
import { getFilteredCompanyIds, RawSearchParams } from '@/lib/companies-query';
import { convertBigInts } from '@/lib/utils';

const bulkIdsSchema = z.array(z.string().uuid()).min(1).max(500);

export async function getMatchingCompanyIdsAction(
  rawSearchParams: RawSearchParams,
  optionsOverride?: { overrideView?: 'active' | 'archived' | 'all' }
) {
  try {
    const user = await getCurrentUser();
    const result = await getFilteredCompanyIds(rawSearchParams, user.id, optionsOverride);
    return {
      success: true,
      ids: result.ids,
      totalCount: result.totalCount,
      hasMoreThan500: result.hasMoreThan500,
    };
  } catch (err: any) {
    console.error('[GET_MATCHING_COMPANY_IDS_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to fetch matching company IDs' };
  }
}

export async function bulkChangeStatusAction(
  ids: string[],
  status: string,
  dueAt?: string | null,
  reminderType?: string | null,
  note?: string | null
) {
  try {
    const user = await getCurrentUser();
    const validatedIds = bulkIdsSchema.parse(ids);

    // Fetch all submitted companies
    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    // Filter to non-archived valid UUIDs
    const validIds: string[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && !comp.isArchived) {
        validIds.push(id);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        skippedCount,
        message: `0 companies updated, ${skippedCount} skipped because they are archived or invalid.`,
      };
    }

    await withUser(
      user.id,
      async (tx) => {
        const drv = (db.runtime() as any).driver;
        // Run stored procedure select bulk_change_company_status(...)
        const gen = drv.query({
          sql: 'select bulk_change_company_status($1::uuid[], $2::lead_status, $3::timestamptz, $4::reminder_type, $5::text)',
          params: [validIds, status, dueAt || null, reminderType || null, note || null],
        });
        for await (const _ of gen) {
          // drain output
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: validIds.length,
      skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_CHANGE_STATUS_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to perform bulk status change' };
  }
}

export async function bulkReassignAction(ids: string[], newAssignedTo: string | null) {
  try {
    const user = await getCurrentUser();
    const validatedIds = bulkIdsSchema.parse(ids);

    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    const validIds: string[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && !comp.isArchived) {
        validIds.push(id);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        skippedCount,
      };
    }

    await withUser(
      user.id,
      async () => {
        const drv = (db.runtime() as any).driver;
        const gen = drv.query({
          sql: 'update companies set assigned_to = $1::uuid, updated_at = now() where id = any($2::uuid[]) and is_archived = false',
          params: [newAssignedTo || null, validIds],
        });
        for await (const _ of gen) {}
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: validIds.length,
      skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_REASSIGN_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to reassign companies' };
  }
}

export async function bulkArchiveAction(ids: string[], reason?: string, note?: string) {
  try {
    const user = await getCurrentUser();
    const validatedIds = bulkIdsSchema.parse(ids);

    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    const validIds: string[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && !comp.isArchived) {
        validIds.push(id);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        skippedCount,
      };
    }

    const finalReason = [reason, note].filter(Boolean).join(' - ') || 'Archived';

    await withUser(
      user.id,
      async () => {
        const drv = (db.runtime() as any).driver;
        const gen = drv.query({
          sql: 'update companies set is_archived = true, archived_at = now(), archived_by = $1::uuid, archive_reason = $2::text, updated_at = now() where id = any($3::uuid[]) and is_archived = false',
          params: [user.id, finalReason, validIds],
        });
        for await (const _ of gen) {}
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: validIds.length,
      skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_ARCHIVE_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to archive companies' };
  }
}

export async function bulkRestoreAction(ids: string[]) {
  try {
    const user = await getCurrentUser();
    const validatedIds = bulkIdsSchema.parse(ids);

    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    const validIds: string[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && comp.isArchived) {
        validIds.push(id);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        skippedCount,
      };
    }

    await withUser(
      user.id,
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

    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: validIds.length,
      skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_RESTORE_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to restore companies' };
  }
}

export async function getTeammateLeadCountsAction() {
  try {
    await getCurrentUser();
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

    return { success: true, leadCounts };
  } catch (err: any) {
    console.error('[GET_TEAMMATE_LEAD_COUNTS_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to fetch lead counts', leadCounts: {} };
  }
}

export interface DeletePreviewData {
  totalCount: number;
  companyNames: string[];
  contactsCount: number;
  remarksCount: number;
  remindersCount: number;
  historyCount: number;
  validIds: string[];
  skippedCount: number;
}

/**
 * Preview action (read-only): takes company IDs, keeps only archived ones,
 * and returns: total count, first 10 company names, and totals of contacts,
 * remarks, reminders, and history entries that would be removed.
 */
export async function previewDeleteArchivedCompaniesAction(
  ids: string[]
) {
  return safeAction('previewDeleteArchivedCompaniesAction', async () => {
    const rawIds = Array.isArray(ids) ? ids : [];
    // Deduplicate and validate UUIDs
    const uniqueIds = Array.from(new Set(rawIds));
    const validatedIds = bulkIdsSchema.parse(uniqueIds);

    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    const validIds: string[] = [];
    const archivedCompanies: any[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && comp.isArchived) {
        validIds.push(id);
        archivedCompanies.push(comp);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        totalCount: 0,
        companyNames: [],
        contactsCount: 0,
        remarksCount: 0,
        remindersCount: 0,
        historyCount: 0,
        validIds: [],
        skippedCount,
      };
    }

    // First 10 company names
    const companyNames = archivedCompanies.slice(0, 10).map((c) => String(c.name));

    // Totals of linked items using Prisma aggregate count
    const [contactsAgg, remarksAgg, remindersAgg, historyAgg] = await Promise.all([
      prisma.orm.public.Contacts.where((row: any) => row.companyId.in(validIds)).aggregate((c: any) => ({
        count: c.count(),
      })),
      prisma.orm.public.Remarks.where((row: any) => row.companyId.in(validIds)).aggregate((c: any) => ({
        count: c.count(),
      })),
      prisma.orm.public.Reminders.where((row: any) => row.companyId.in(validIds)).aggregate((c: any) => ({
        count: c.count(),
      })),
      prisma.orm.public.HistoryLog.where((row: any) => row.companyId.in(validIds)).aggregate((c: any) => ({
        count: c.count(),
      })),
    ]);

    return {
      totalCount: validIds.length,
      companyNames,
      contactsCount: Number(contactsAgg.count || 0),
      remarksCount: Number(remarksAgg.count || 0),
      remindersCount: Number(remindersAgg.count || 0),
      historyCount: Number(historyAgg.count || 0),
      validIds,
      skippedCount,
    };
  });
}

/**
 * Permanently deletes archived companies using the database function delete_archived_companies.
 * Deleted ONLY through select delete_archived_companies(${ids}::uuid[]) as deleted.
 */
export async function deleteArchivedCompaniesAction(
  ids: string[],
  confirmText: string
) {
  return safeAction('deleteArchivedCompaniesAction', async (user) => {
    const rawIds = Array.isArray(ids) ? ids : [];
    // Deduplicate and validate UUIDs
    const uniqueIds = Array.from(new Set(rawIds));
    const validatedIds = bulkIdsSchema.parse(uniqueIds);

    // Fetch companies to verify and filter
    const allComp = await prisma.orm.public.Companies.all();
    const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

    const validIds: string[] = [];
    const archivedCompanies: any[] = [];
    let skippedCount = 0;

    for (const id of validatedIds) {
      const comp = existingMap.get(id);
      if (comp && comp.isArchived) {
        validIds.push(id);
        archivedCompanies.push(comp);
      } else {
        skippedCount++;
      }
    }

    if (validIds.length === 0) {
      return {
        deletedCount: 0,
        skippedCount,
        message: 'No archived companies found to delete.',
      };
    }

    // SERVER-SIDE CONFIRMATION VERIFICATION
    // For one company it must equal the company name exactly (case-sensitive, trimmed).
    // For several it must equal the word DELETE.
    const trimmedConfirm = (confirmText || '').trim();
    if (validIds.length === 1) {
      const expectedName = String(archivedCompanies[0].name).trim();
      if (trimmedConfirm !== expectedName) {
        throw new Error(`Confirmation mismatch. Please type "${expectedName}" to confirm.`);
      }
    } else {
      if (trimmedConfirm !== 'DELETE') {
        throw new Error('Confirmation mismatch. Please type DELETE to confirm.');
      }
    }

    // Execute database function delete_archived_companies inside withUser
    const deletedCount = await withUser(
      user.id,
      async (tx: any) => {
        const idsLiteral = '{' + validIds.join(',') + '}';
        const plan = db.raw.sql`select delete_archived_companies(${idsLiteral}::uuid[]) as deleted`
          .returnsRow({ deleted: 'pg/int4@1' })
          .build();
        const rows = await tx.query(plan);
        let count = 0;
        for await (const r of rows) {
          count = Number(r.deleted || 0);
          break;
        }
        return count;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    revalidatePath('/companies');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');

    return {
      deletedCount,
      skippedCount,
    };
  });
}

