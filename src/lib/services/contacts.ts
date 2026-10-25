import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { convertBigInts } from '@/lib/utils';
import { ApiError } from '@/lib/api/errors';
import { contactCreateSchema, contactUpdateSchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

export async function createContact(
  ctx: ServiceContext,
  input: {
    companyId: string;
    name: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary?: boolean;
  }
) {
  const parsed = contactCreateSchema.parse(input);
  const companyId = input.companyId || parsed.companyId!;

  const company = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (!company) {
    throw ApiError.notFound('Company not found');
  }
  if (company.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  const createdId = await withUser(ctx.user.id, async (tx) => {
    const created = await tx.orm.public.Contacts.create({
      companyId,
      name: parsed.name.trim(),
      jobTitle: parsed.jobTitle ? parsed.jobTitle.trim() : null,
      email: parsed.email ? parsed.email.trim() : null,
      phone: parsed.phone ? parsed.phone.trim() : null,
      isPrimary: parsed.isPrimary ?? false,
    });
    return String(created.id);
  });

  return { id: createdId, contactId: createdId, companyId };
}

export async function updateContact(
  ctx: ServiceContext,
  input: { id: string; companyId?: string; data: any }
) {
  const { id } = input;
  const parsed = contactUpdateSchema.parse(input.data);

  const existing = await prisma.orm.public.Contacts.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Contact not found');
  }

  const companyId = input.companyId || String(existing.companyId);
  const company = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (company && company.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  await withUser(ctx.user.id, async (tx) => {
    const updateData: any = {};
    if (parsed.name) updateData.name = parsed.name.trim();
    if (parsed.jobTitle !== undefined) updateData.jobTitle = parsed.jobTitle ? parsed.jobTitle.trim() : null;
    if (parsed.email !== undefined) updateData.email = parsed.email ? parsed.email.trim() : null;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone ? parsed.phone.trim() : null;
    if (parsed.isPrimary !== undefined) updateData.isPrimary = parsed.isPrimary;
    updateData.updatedAt = new Date().toISOString();

    await tx.orm.public.Contacts.where({ id }).update(updateData);
  });

  return { success: true, id, companyId };
}

export async function deleteContact(
  ctx: ServiceContext,
  input: { id: string; companyId?: string }
) {
  const { id } = input;
  const existing = await prisma.orm.public.Contacts.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Contact not found');
  }

  const companyId = input.companyId || String(existing.companyId);
  const company = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (company && company.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Contacts.where({ id }).delete();
  });

  return { success: true, companyId };
}

export async function makePrimaryContact(
  ctx: ServiceContext,
  input: { id: string; companyId?: string }
) {
  const { id } = input;
  const existing = await prisma.orm.public.Contacts.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Contact not found');
  }

  const companyId = input.companyId || String(existing.companyId);
  const company = await prisma.orm.public.Companies.where({ id: companyId }).first();
  if (company && company.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Contacts.where({ id }).update({
      isPrimary: true,
      updatedAt: new Date().toISOString(),
    });
  });

  return { success: true, companyId };
}
