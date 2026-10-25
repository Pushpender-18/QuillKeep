'use server';

import { getCurrentUser } from '@/lib/auth';
import { safeAction } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import {
  checkCompanyName,
  createCompany,
  updateCompany,
  changeCompanyStatus,
  archiveCompany,
  restoreCompany,
  updateCompanyPriority,
  updateCompanyAssignee,
} from '@/lib/services/companies';

/**
 * Checks if a company name already exists (case-insensitive, trimmed).
 */
export async function checkCompanyNameAction(name: string, excludeId?: string) {
  try {
    const user = await getCurrentUser();
    const result = await checkCompanyName({ user }, { name, excludeId });
    return result;
  } catch (err: any) {
    return { exists: false, isArchived: false, companyId: null, error: err?.message };
  }
}

/**
 * Creates a new company record.
 */
export async function createCompanyAction(input: any) {
  return safeAction('createCompanyAction', async (user) => {
    const result = await createCompany({ user }, input);
    revalidatePath('/companies');
    return { success: true, companyId: result.companyId };
  });
}

/**
 * Updates company details.
 */
export async function updateCompanyAction(companyId: string, input: any) {
  try {
    const user = await getCurrentUser();
    await updateCompany({ user }, { id: companyId, data: input });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_COMPANY_ACTION]', err);
    return {
      success: false,
      error: err?.message || 'Failed to update company',
      isArchived: err?.code === 'archived_company',
    };
  }
}

/**
 * Updates company status strictly via change_company_status database function.
 */
export async function changeCompanyStatusAction(
  companyId: string,
  status: string,
  dueAt?: string | null,
  reminderType?: string | null,
  note?: string | null
) {
  try {
    const user = await getCurrentUser();
    await changeCompanyStatus({ user }, { id: companyId, status, dueAt, reminderType, note });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[CHANGE_COMPANY_STATUS_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to change company status' };
  }
}

/**
 * Archives a company (is_archived = true + archive_reason).
 */
export async function archiveCompanyAction(companyId: string, reason?: string, note?: string) {
  try {
    const user = await getCurrentUser();
    await archiveCompany({ user }, { id: companyId, reason, note });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[ARCHIVE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to archive company' };
  }
}

/**
 * Restores an archived company (is_archived = false).
 */
export async function restoreCompanyAction(companyId: string) {
  try {
    const user = await getCurrentUser();
    await restoreCompany({ user }, { id: companyId });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[RESTORE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to restore company' };
  }
}

/**
 * Quick update for priority.
 */
export async function updatePriorityAction(companyId: string, priority: 'low' | 'medium' | 'high') {
  try {
    const user = await getCurrentUser();
    await updateCompanyPriority({ user }, { id: companyId, priority });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update priority' };
  }
}

/**
 * Quick update for assignee.
 */
export async function updateAssigneeAction(companyId: string, assignedTo: string) {
  try {
    const user = await getCurrentUser();
    await updateCompanyAssignee({ user }, { id: companyId, assignedTo });
    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update assignee' };
  }
}
