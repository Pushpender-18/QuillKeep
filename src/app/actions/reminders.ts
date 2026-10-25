'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createReminder,
  updateReminder,
  completeReminder,
  uncompleteReminder,
  deleteReminder,
} from '@/lib/services/reminders';

export async function createReminderAction(input: any) {
  try {
    const user = await getCurrentUser();
    const result = await createReminder({ user }, input);

    revalidatePath('/tasks');
    revalidatePath(`/companies/${result.companyId}`);
    return { success: true, reminderId: result.reminderId };
  } catch (err: any) {
    console.error('[CREATE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to create reminder' };
  }
}

export async function updateReminderAction(reminderId: string, input: any) {
  try {
    const user = await getCurrentUser();
    const result = await updateReminder({ user }, { id: reminderId, data: input });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${result.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update reminder' };
  }
}

export async function toggleCompleteReminderAction(reminderId: string, complete: boolean) {
  try {
    const user = await getCurrentUser();
    const result = complete
      ? await completeReminder({ user }, { id: reminderId })
      : await uncompleteReminder({ user }, { id: reminderId });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${result.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[TOGGLE_COMPLETE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update reminder status' };
  }
}

export async function deleteReminderAction(reminderId: string) {
  try {
    const user = await getCurrentUser();
    const result = await deleteReminder({ user }, { id: reminderId });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${result.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to delete reminder' };
  }
}
