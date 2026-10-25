'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { listRemarks, createRemark, updateRemark } from '@/lib/services/remarks';
import { SerializableRemark } from '@/lib/remarks';

export async function fetchMoreRemarksAction(
  companyId: string,
  offset: number,
  limit = 20
): Promise<{
  success: boolean;
  remarks?: SerializableRemark[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const data = await listRemarks({ user }, { companyId, offset, limit });
    return { success: true, remarks: data.items as any };
  } catch (err: any) {
    console.error('[FETCH_MORE_REMARKS_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to fetch remarks' };
  }
}

export async function createRemarkAction(
  companyId: string,
  body: string,
  mentionIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    await createRemark({ user }, { companyId, body, mentionIds });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: any) {
    console.error('[CREATE_REMARK_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to post remark' };
  }
}

export async function updateRemarkAction(
  remarkId: string,
  companyId: string,
  body: string,
  mentionIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    await updateRemark({ user }, { id: remarkId, companyId, body, mentionIds });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_REMARK_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to update remark' };
  }
}
