'use server';

import { getCurrentUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const contactSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  name: z.string().min(1, 'Contact name is required'),
  jobTitle: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
});

export async function addContactAction(input: any) {
  try {
    const user = await getCurrentUser();
    const parsed = contactSchema.parse(input);

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Contacts.create({
        companyId: parsed.companyId,
        name: parsed.name.trim(),
        jobTitle: parsed.jobTitle ? parsed.jobTitle.trim() : null,
        email: parsed.email ? parsed.email.trim() : null,
        phone: parsed.phone ? parsed.phone.trim() : null,
        isPrimary: parsed.isPrimary,
      });
    });

    revalidatePath(`/companies/${parsed.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[ADD_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to add contact' };
  }
}

export async function updateContactAction(contactId: string, companyId: string, input: any) {
  try {
    const user = await getCurrentUser();
    const parsed = contactSchema.partial().parse(input);

    await withUser(user.id, async (tx) => {
      const updateData: any = {};
      if (parsed.name) updateData.name = parsed.name.trim();
      if (parsed.jobTitle !== undefined) updateData.jobTitle = parsed.jobTitle ? parsed.jobTitle.trim() : null;
      if (parsed.email !== undefined) updateData.email = parsed.email ? parsed.email.trim() : null;
      if (parsed.phone !== undefined) updateData.phone = parsed.phone ? parsed.phone.trim() : null;
      if (parsed.isPrimary !== undefined) updateData.isPrimary = parsed.isPrimary;
      updateData.updatedAt = new Date().toISOString();

      await tx.orm.public.Contacts.where({ id: contactId }).update(updateData);
    });

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

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Contacts.where({ id: contactId }).delete();
    });

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

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Contacts.where({ id: contactId }).update({
        isPrimary: true,
        updatedAt: new Date().toISOString(),
      });
    });

    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[SET_PRIMARY_CONTACT_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to set primary contact' };
  }
}
