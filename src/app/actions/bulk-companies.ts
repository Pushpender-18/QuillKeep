'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { safeAction } from '@/lib/safe-action';
import { RawSearchParams } from '@/lib/companies-query';
import { getCompanyIds } from '@/lib/services/companies';
import {
  bulkChangeStatus,
  bulkReassign,
  bulkArchive,
  bulkRestore,
  getTeammateLeadCounts,
} from '@/lib/services/bulk';
import {
  previewDeleteArchived,
  deleteArchived,
  DeletePreviewData,
} from '@/lib/services/delete-archived';

export type { DeletePreviewData };

export async function getMatchingCompanyIdsAction(
  rawSearchParams: RawSearchParams,
  optionsOverride?: { overrideView?: 'active' | 'archived' | 'all' }
) {
  try {
    const user = await getCurrentUser();
    const result = await getCompanyIds({ user }, rawSearchParams);
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
    const result = await bulkChangeStatus({ user }, { ids, status, dueAt, reminderType, note });
    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      message: (result as any).message,
    };
  } catch (err: any) {
    console.error('[BULK_CHANGE_STATUS_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to perform bulk status change' };
  }
}

export async function bulkReassignAction(ids: string[], newAssignedTo: string | null) {
  try {
    const user = await getCurrentUser();
    const result = await bulkReassign({ user }, { ids, newAssignedTo });
    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_REASSIGN_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to reassign companies' };
  }
}

export async function bulkArchiveAction(ids: string[], reason?: string, note?: string) {
  try {
    const user = await getCurrentUser();
    const result = await bulkArchive({ user }, { ids, reason, note });
    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_ARCHIVE_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to archive companies' };
  }
}

export async function bulkRestoreAction(ids: string[]) {
  try {
    const user = await getCurrentUser();
    const result = await bulkRestore({ user }, { ids });
    revalidatePath('/companies');
    return {
      success: true,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
    };
  } catch (err: any) {
    console.error('[BULK_RESTORE_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to restore companies' };
  }
}

export async function getTeammateLeadCountsAction() {
  try {
    await getCurrentUser();
    const result = await getTeammateLeadCounts();
    return { success: true, leadCounts: result.leadCounts };
  } catch (err: any) {
    console.error('[GET_TEAMMATE_LEAD_COUNTS_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to fetch lead counts', leadCounts: {} };
  }
}

export async function previewDeleteArchivedCompaniesAction(ids: string[]) {
  return safeAction('previewDeleteArchivedCompaniesAction', async (user) => {
    return previewDeleteArchived({ user }, { ids });
  });
}

export async function deleteArchivedCompaniesAction(ids: string[], confirmText: string) {
  return safeAction('deleteArchivedCompaniesAction', async (user) => {
    const result = await deleteArchived({ user }, { ids, confirmText });
    revalidatePath('/companies');
    revalidatePath('/dashboard');
    revalidatePath('/tasks');
    return result;
  });
}
