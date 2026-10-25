'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createContact,
  updateContact,
  deleteContact,
  makePrimaryContact,
} from '@/lib/services/contacts';

export async function addContactAction(input: any) {
  try {
    const user = await getCurrentUser();
    const result = await createContact({ user }, input);
    revalidatePath(`/companies/${result.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[ADD_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to add contact' };
  }
}

export async function updateContactAction(contactId: string, companyId: string, input: any) {
  try {
    const user = await getCurrentUser();
    await updateContact({ user }, { id: contactId, companyId, data: input });
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update contact' };
  }
}

export async function deleteContactAction(contactId: string, companyId: string) {
  try {
    const user = await getCurrentUser();
    await deleteContact({ user }, { id: contactId, companyId });
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to delete contact' };
  }
}

export async function setPrimaryContactAction(contactId: string, companyId: string) {
  try {
    const user = await getCurrentUser();
    await makePrimaryContact({ user }, { id: contactId, companyId });
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[SET_PRIMARY_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to set primary contact' };
  }
}
