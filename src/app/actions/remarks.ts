'use server';

import { getCurrentUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { getRemarksForCompany, SerializableRemark } from '@/lib/remarks';
import { convertBigInts } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
    await getCurrentUser();
    const data = await getRemarksForCompany({ companyId, offset, limit });
    return { success: true, remarks: data.remarks };
  } catch (err: any) {
    console.error('[FETCH_MORE_REMARKS_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to fetch remarks' };
  }
}

const createRemarkSchema = z.object({
  companyId: z.string().uuid(),
  body: z.string().trim().min(1, 'Remark cannot be empty').max(5000, 'Remark cannot exceed 5000 characters'),
  mentionIds: z.array(z.string().uuid()).optional().default([]),
});

const updateRemarkSchema = z.object({
  remarkId: z.string().uuid(),
  companyId: z.string().uuid(),
  body: z.string().trim().min(1, 'Remark cannot be empty').max(5000, 'Remark cannot exceed 5000 characters'),
  mentionIds: z.array(z.string().uuid()).optional().default([]),
});

/**
 * Clean mention profiles based on strict server rules:
 * - Active profiles matching mentionIds
 * - Keep only those whose "@" + fullName actually appears in the body text
 * - Remove author themselves
 * - Remove duplicates
 */
async function getCleanMentions(bodyText: string, mentionIds: string[], authorId: string): Promise<string[]> {
  if (!mentionIds || mentionIds.length === 0) return [];

  try {
    const rawProfiles = await prisma.orm.public.Profiles.all();
    const cleanProfiles = convertBigInts(rawProfiles);

    const activeProfileMap = new Map<string, string>();
    cleanProfiles.forEach((p: any) => {
      if (Boolean(p.isActive ?? true)) {
        activeProfileMap.set(String(p.id), String(p.fullName || p.email || ''));
      }
    });

    const uniqueCleanSet = new Set<string>();

    for (const mId of mentionIds) {
      if (mId === authorId) continue; // Remove author themselves
      const fullName = activeProfileMap.get(mId);
      if (fullName) {
        const mentionTag = `@${fullName}`;
        if (bodyText.includes(mentionTag)) {
          uniqueCleanSet.add(mId);
        }
      }
    }

    return Array.from(uniqueCleanSet);
  } catch (err) {
    console.error('[GET_CLEAN_MENTIONS_ERROR]', err);
    return [];
  }
}

export async function createRemarkAction(
  companyId: string,
  body: string,
  mentionIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();

    const validation = createRemarkSchema.safeParse({ companyId, body, mentionIds });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid data' };
    }

    const { body: trimmedBody, mentionIds: submittedMentionIds } = validation.data;

    // Check company exists & is not archived
    const rawCompany = await prisma.orm.public.Companies.where({ id: companyId }).first();
    if (!rawCompany) {
      return { success: false, error: 'Company not found' };
    }

    const cleanCompany = convertBigInts(rawCompany);
    if (cleanCompany.isArchived) {
      return { success: false, error: 'Cannot add remarks to an archived company' };
    }

    const cleanMentions = await getCleanMentions(trimmedBody, submittedMentionIds, user.id);

    await withUser(user.id, async () => {
      await prisma.orm.public.Remarks.create({
        companyId,
        authorId: user.id,
        body: trimmedBody,
        mentions: cleanMentions,
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: any) {
    console.error('[CREATE_REMARK_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to post remark' };
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

    const validation = updateRemarkSchema.safeParse({ remarkId, companyId, body, mentionIds });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid data' };
    }

    const { body: trimmedBody, mentionIds: submittedMentionIds } = validation.data;

    // Check company exists & is not archived
    const rawCompany = await prisma.orm.public.Companies.where({ id: companyId }).first();
    if (!rawCompany) {
      return { success: false, error: 'Company not found' };
    }

    const cleanCompany = convertBigInts(rawCompany);
    if (cleanCompany.isArchived) {
      return { success: false, error: 'Cannot edit remarks on an archived company' };
    }

    // Verify existing remark author
    const rawRemark = await prisma.orm.public.Remarks.where({ id: remarkId }).first();
    if (!rawRemark) {
      return { success: false, error: 'Remark not found' };
    }

    const cleanRemark = convertBigInts(rawRemark);
    if (cleanRemark.authorId !== user.id) {
      return { success: false, error: 'Not allowed: Only the author can edit this remark' };
    }

    const cleanMentions = await getCleanMentions(trimmedBody, submittedMentionIds, user.id);

    await withUser(user.id, async () => {
      await prisma.orm.public.Remarks.where({
        id: remarkId,
        authorId: user.id,
      }).update({
        body: trimmedBody,
        mentions: cleanMentions,
        editedAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_REMARK_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to update remark' };
  }
}
