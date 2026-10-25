import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { convertBigInts } from '@/lib/utils';
import {
  getOpenReminders,
  getCompletedReminders,
  getReminderDaysForMonth,
  getOverdueCount,
  SerializableReminder,
} from '@/lib/reminders';
import { isPastISTDateTime, parseISTDateTimeToISO } from '@/lib/date-utils';
import { ApiError } from '@/lib/api/errors';
import { reminderCreateSchema, reminderUpdateSchema, remindersQuerySchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

export async function listReminders(
  ctx: ServiceContext,
  rawParams: {
    scope?: 'my' | 'all';
    day?: string;
    month?: string;
    companyId?: string;
    completedWindow?: boolean;
  }
) {
  const params = remindersQuerySchema.parse(rawParams);

  if (params.completedWindow) {
    const completed = await getCompletedReminders({
      scope: params.scope || 'my',
      userId: ctx.user.id,
      companyId: params.companyId,
    });
    return { items: completed };
  }

  if (params.month) {
    const monthDays = await getReminderDaysForMonth({
      scope: params.scope || 'my',
      userId: ctx.user.id,
      month: params.month,
    });
    return { days: monthDays };
  }

  const reminders = await getOpenReminders({
    scope: params.scope || 'my',
    userId: ctx.user.id,
    companyId: params.companyId,
    day: params.day,
  });

  return { items: reminders };
}

export async function getCompanyReminders(ctx: ServiceContext, input: { companyId: string }) {
  const reminders = await getOpenReminders({
    scope: 'all',
    userId: ctx.user.id,
    companyId: input.companyId,
  });
  return { items: reminders };
}

export async function createReminder(
  ctx: ServiceContext,
  input: {
    companyId: string;
    type: 'callback' | 'missed_call' | 'meeting' | 'manual';
    dateStr?: string;
    timeStr?: string;
    dueAt?: string;
    assignedTo: string;
    note?: string | null;
  }
) {
  const parsed = reminderCreateSchema.parse(input);

  const company = await prisma.orm.public.Companies.where({ id: parsed.companyId }).first();
  if (!company) {
    throw ApiError.notFound('Target company not found');
  }
  if (company.isArchived) {
    throw ApiError.archivedCompany('Cannot create reminders for archived companies');
  }

  let isoDueAt = '';
  if (parsed.dateStr && parsed.timeStr) {
    if (isPastISTDateTime(parsed.dateStr, parsed.timeStr)) {
      throw ApiError.pastDate('Past date/time is not allowed when creating reminders');
    }
    isoDueAt = `${parsed.dateStr}T${parsed.timeStr}:00+05:30`;
  } else if (parsed.dueAt) {
    const d = new Date(parsed.dueAt);
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      throw ApiError.pastDate('Past date/time is not allowed when creating reminders');
    }
    isoDueAt = d.toISOString();
  } else {
    throw ApiError.dateRequired('Due date and time is required');
  }

  const reminderId = await withUser(ctx.user.id, async (tx) => {
    const created = await tx.orm.public.Reminders.create({
      companyId: parsed.companyId,
      assignedTo: parsed.assignedTo,
      createdBy: ctx.user.id,
      _type: parsed.type,
      source: 'manual',
      dueAt: new Date(isoDueAt).toISOString(),
      note: parsed.note ? parsed.note.trim() : null,
      completedAt: null,
    });
    return String(created.id);
  });

  return { id: reminderId, reminderId, companyId: parsed.companyId };
}

export async function updateReminder(
  ctx: ServiceContext,
  input: { id: string; data: any }
) {
  const { id } = input;
  const parsed = reminderUpdateSchema.parse(input.data);

  const existing = await prisma.orm.public.Reminders.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Reminder not found');
  }

  const companyId = String(existing.companyId);

  let newDueAt: string | undefined = undefined;
  if (parsed.dateStr && parsed.timeStr) {
    if (isPastISTDateTime(parsed.dateStr, parsed.timeStr)) {
      throw ApiError.pastDate('Past date/time is not allowed when rescheduling');
    }
    newDueAt = new Date(`${parsed.dateStr}T${parsed.timeStr}:00+05:30`).toISOString();
  } else if (parsed.dueAt) {
    const d = new Date(parsed.dueAt);
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      throw ApiError.pastDate('Past date/time is not allowed when rescheduling');
    }
    newDueAt = d.toISOString();
  }

  await withUser(ctx.user.id, async (tx) => {
    const updateData: any = {};
    if (parsed.type) updateData._type = parsed.type;
    if (parsed.assignedTo) updateData.assignedTo = parsed.assignedTo;
    if (parsed.note !== undefined) updateData.note = parsed.note ? parsed.note.trim() : null;
    if (newDueAt) updateData.dueAt = newDueAt;

    await tx.orm.public.Reminders.where({ id }).update(updateData);
  });

  return { success: true, id, companyId };
}

export async function completeReminder(ctx: ServiceContext, input: { id: string }) {
  const { id } = input;
  const existing = await prisma.orm.public.Reminders.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Reminder not found');
  }

  const companyId = String(existing.companyId);

  await withUser(ctx.user.id, async (tx) => {
    if (!existing.completedAt) {
      await tx.orm.public.Reminders.where({ id }).update({
        completedAt: new Date().toISOString(),
      });
    }
  });

  return { success: true, id, companyId };
}

export async function uncompleteReminder(ctx: ServiceContext, input: { id: string }) {
  const { id } = input;
  const existing = await prisma.orm.public.Reminders.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Reminder not found');
  }

  const companyId = String(existing.companyId);

  await withUser(ctx.user.id, async (tx) => {
    if (existing.completedAt) {
      await tx.orm.public.Reminders.where({ id }).update({
        completedAt: null,
      });
    }
  });

  return { success: true, id, companyId };
}

export async function deleteReminder(ctx: ServiceContext, input: { id: string }) {
  const { id } = input;
  const existing = await prisma.orm.public.Reminders.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Reminder not found');
  }

  const companyId = String(existing.companyId);

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Reminders.where({ id }).delete();
  });

  return { success: true, id, companyId };
}
