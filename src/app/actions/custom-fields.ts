'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createCustomField, updateCustomField } from '@/lib/services/custom-fields';

export async function createCustomFieldAction(input: {
  name: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[] | null;
}) {
  try {
    const user = await getCurrentUser();
    const result = await createCustomField({ user }, input);

    revalidatePath('/companies');
    revalidateTag('custom-fields', 'max');

    return {
      success: true,
      field: result as any,
    };
  } catch (err: any) {
    console.error('[CREATE_CUSTOM_FIELD_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to create custom field' };
  }
}

export async function renameCustomFieldAction(id: string, name: string) {
  try {
    const user = await getCurrentUser();
    await updateCustomField({ user }, { id, name });

    revalidatePath('/companies');
    revalidateTag('custom-fields', 'max');
    return { success: true };
  } catch (err: any) {
    console.error('[RENAME_CUSTOM_FIELD_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to rename custom field' };
  }
}

export async function addCustomFieldOptionsAction(id: string, newOptions: string[]) {
  try {
    const user = await getCurrentUser();
    await updateCustomField({ user }, { id, newOptions });

    revalidatePath('/companies');
    revalidateTag('custom-fields', 'max');
    return { success: true, options: newOptions };
  } catch (err: any) {
    console.error('[ADD_CUSTOM_FIELD_OPTIONS_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to add options' };
  }
}

export async function toggleCustomFieldActiveAction(id: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    await updateCustomField({ user }, { id, isActive });

    revalidatePath('/companies');
    revalidateTag('custom-fields', 'max');
    return { success: true };
  } catch (err: any) {
    console.error('[TOGGLE_CUSTOM_FIELD_ACTIVE_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to update field status' };
  }
}
