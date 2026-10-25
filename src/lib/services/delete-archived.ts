import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { db } from '@/prisma/db';
import { bulkDeletePreviewSchema, bulkDeleteSchema } from '@/lib/schemas';
import { ApiError } from '@/lib/api/errors';
import { ServiceContext } from './companies';

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
export async function previewDeleteArchived(
  _ctx: ServiceContext,
  input: { ids: string[] }
): Promise<DeletePreviewData> {
  const rawIds = Array.isArray(input.ids) ? input.ids : [];
  const uniqueIds = Array.from(new Set(rawIds));

  if (uniqueIds.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkDeletePreviewSchema.parse({ ids: uniqueIds });

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  const archivedCompanies: any[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
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

  const companyNames = archivedCompanies.slice(0, 10).map((c) => String(c.name));

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
}

/**
 * Permanently deletes archived companies using database function delete_archived_companies.
 */
export async function deleteArchived(
  ctx: ServiceContext,
  input: { ids: string[]; confirmText: string }
) {
  const rawIds = Array.isArray(input.ids) ? input.ids : [];
  const uniqueIds = Array.from(new Set(rawIds));

  if (uniqueIds.length > 500) {
    throw ApiError.tooMany('Bulk operations cannot exceed 500 companies');
  }

  const parsed = bulkDeleteSchema.parse({ ids: uniqueIds, confirmText: input.confirmText });

  const allComp = await prisma.orm.public.Companies.all();
  const existingMap = new Map(allComp.map((c: any) => [String(c.id), c]));

  const validIds: string[] = [];
  const archivedCompanies: any[] = [];
  let skippedCount = 0;

  for (const id of parsed.ids) {
    const comp = existingMap.get(id);
    if (comp && comp.isArchived) {
      validIds.push(id);
      archivedCompanies.push(comp);
    } else {
      skippedCount++;
    }
  }

  if (validIds.length === 0) {
    throw ApiError.archivedCompany('No archived companies found to delete.');
  }

  // Server-side confirmation check
  const trimmedConfirm = (parsed.confirmText || '').trim();
  if (validIds.length === 1) {
    const expectedName = String(archivedCompanies[0].name).trim();
    if (trimmedConfirm !== expectedName) {
      throw ApiError.confirmMismatch(`Confirmation mismatch. Please type "${expectedName}" to confirm.`);
    }
  } else {
    if (trimmedConfirm !== 'DELETE') {
      throw ApiError.confirmMismatch('Confirmation mismatch. Please type DELETE to confirm.');
    }
  }

  const deletedCount = await withUser(
    ctx.user.id,
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

  return {
    deletedCount,
    skippedCount,
  };
}
