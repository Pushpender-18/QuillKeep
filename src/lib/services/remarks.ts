import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { convertBigInts } from '@/lib/utils';
import { getRemarksForCompany, SerializableRemark } from '@/lib/remarks';
import { ApiError } from '@/lib/api/errors';
import { remarkCreateSchema, remarkUpdateSchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

/**
 * Clean mention profiles based on strict rules:
 * - Active profiles matching mentionIds
 * - Keep only those whose "@" + fullName actually appears in body text
 * - Remove author themselves
 * - Remove duplicates
 */
export async function getCleanMentions(
  bodyText: string,
  mentionIds: string[],
  authorId: string
): Promise<string[]> {
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

export async function listRemarks(
  _ctx: ServiceContext,
  input: { companyId: string; limit?: number; offset?: number; page?: number }
) {
  const limit = input.limit || 20;
  const offset = input.offset !== undefined ? input.offset : ((input.page || 1) - 1) * limit;

  const data = await getRemarksForCompany({
    companyId: input.companyId,
    limit,
    offset,
  });

  return {
    items: data.remarks.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      authorId: r.authorId,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorIsActive: r.authorIsActive,
      body: r.body,
      mentions: r.mentions,
      editedAt: r.editedAt ? new Date(r.editedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
    total: data.totalCount,
    limit,
    offset,
  };
}

export async function createRemark(
  ctx: ServiceContext,
  input: { companyId: string; body: string; mentionIds?: string[] }
) {
  const parsed = remarkCreateSchema.parse(input);
  const companyId = input.companyId || parsed.companyId!;

  const rawCompany = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (!rawCompany) {
    throw ApiError.notFound('Company not found');
  }

  const cleanCompany = convertBigInts(rawCompany);
  if (cleanCompany.isArchived) {
    throw ApiError.archivedCompany('Cannot add remarks to an archived company');
  }

  const cleanMentions = await getCleanMentions(parsed.body, parsed.mentionIds || [], ctx.user.id);

  const createdId = await withUser(ctx.user.id, async () => {
    const created = await prisma.orm.public.Remarks.create({
      companyId,
      authorId: ctx.user.id,
      body: parsed.body,
      mentions: cleanMentions,
    });
    return String(created.id);
  });

  return { id: createdId, remarkId: createdId, companyId };
}

export async function updateRemark(
  ctx: ServiceContext,
  input: { id: string; companyId?: string; body: string; mentionIds?: string[] }
) {
  const { id } = input;
  const parsed = remarkUpdateSchema.parse(input);

  const rawRemark = await prisma.orm.public.Remarks.where({ id }).first();
  if (!rawRemark) {
    throw ApiError.notFound('Remark not found');
  }

  const cleanRemark = convertBigInts(rawRemark);
  if (cleanRemark.authorId !== ctx.user.id) {
    throw ApiError.forbidden('Only the author can edit this remark');
  }

  const companyId = input.companyId || String(cleanRemark.companyId);
  const rawCompany = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (rawCompany) {
    const cleanCompany = convertBigInts(rawCompany);
    if (cleanCompany.isArchived) {
      throw ApiError.archivedCompany('Cannot edit remarks on an archived company');
    }
  }

  const cleanMentions = await getCleanMentions(parsed.body, parsed.mentionIds || [], ctx.user.id);

  await withUser(ctx.user.id, async () => {
    await prisma.orm.public.Remarks.where({
      id,
      authorId: ctx.user.id,
    }).update({
      body: parsed.body,
      mentions: cleanMentions,
      editedAt: new Date().toISOString(),
    });
  });

  return { success: true, id, companyId };
}
