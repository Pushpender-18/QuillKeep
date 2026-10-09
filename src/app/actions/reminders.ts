'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isPastISTDateTime } from '@/lib/date-utils';

const reminderSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  type: z.enum(['callback', 'missed_call', 'meeting', 'manual']),
  dateStr: z.string().min(1, 'Date is required'), // YYYY-MM-DD
  timeStr: z.string().min(1, 'Time is required'), // HH:mm
  assignedTo: z.string().min(1, 'Assignee is required'),
  note: z.string().nullable().optional(),
});

export async function createReminderAction(input: any) {
  try {
    const user = await getCurrentUser();
    const parsed = reminderSchema.parse(input);

    // Validate that company exists and is active (not archived)
    const company = await prisma.orm.public.Companies.where({ id: parsed.companyId }).first();
    if (!company) {
      return { success: false, error: 'Target company not found' };
    }
    if (company.isArchived) {
      return { success: false, error: 'Cannot create reminders for archived companies' };
    }

    // Validate past time in IST
    if (isPastISTDateTime(parsed.dateStr, parsed.timeStr)) {
      return { success: false, error: 'Past date/time is not allowed when creating reminders' };
    }

    const isoDueAt = `${parsed.dateStr}T${parsed.timeStr}:00+05:30`;

    const reminderId = await withUser(user.id, async (tx) => {
      const created = await tx.orm.public.Reminders.create({
        companyId: parsed.companyId,
        assignedTo: parsed.assignedTo,
        createdBy: user.id,
        _type: parsed.type,
        source: 'manual',
        dueAt: new Date(isoDueAt).toISOString(),
        note: parsed.note ? parsed.note.trim() : null,
        completedAt: null,
      });
      return String(created.id);
    });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${parsed.companyId}`);
    return { success: true, reminderId };
  } catch (err: any) {
    console.error('[CREATE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to create reminder' };
  }
}

export async function updateReminderAction(reminderId: string, input: any) {
  try {
    const user = await getCurrentUser();
    const schema = reminderSchema.partial();
    const parsed = schema.parse(input);

    // If date/time updated, check past time validation
    if (parsed.dateStr && parsed.timeStr) {
      if (isPastISTDateTime(parsed.dateStr, parsed.timeStr)) {
        return { success: false, error: 'Past date/time is not allowed when rescheduling' };
      }
    }

    const existing = await prisma.orm.public.Reminders.where({ id: reminderId }).first();
    if (!existing) {
      return { success: false, error: 'Reminder not found' };
    }

    const companyId = String(existing.companyId);

    await withUser(user.id, async (tx) => {
      const updateData: any = {};
      if (parsed.type) updateData._type = parsed.type;
      if (parsed.assignedTo) updateData.assignedTo = parsed.assignedTo;
      if (parsed.note !== undefined) updateData.note = parsed.note ? parsed.note.trim() : null;

      if (parsed.dateStr && parsed.timeStr) {
        const isoDueAt = `${parsed.dateStr}T${parsed.timeStr}:00+05:30`;
        updateData.dueAt = new Date(isoDueAt).toISOString();
      }

      await tx.orm.public.Reminders.where({ id: reminderId }).update(updateData);
    });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update reminder' };
  }
}

/**
 * Toggles reminder completion status safely using updateAndCount / update logic.
 */
export async function toggleCompleteReminderAction(reminderId: string, complete: boolean) {
  try {
    const user = await getCurrentUser();

    const existing = await prisma.orm.public.Reminders.where({ id: reminderId }).first();
    if (!existing) {
      return { success: false, error: 'Reminder not found' };
    }

    const companyId = String(existing.companyId);

    await withUser(user.id, async (tx) => {
      if (complete) {
        // Complete: set completedAt to now if currently null
        if (!existing.completedAt) {
          await tx.orm.public.Reminders.where({ id: reminderId }).update({
            completedAt: new Date().toISOString(),
          });
        }
      } else {
        // Un-complete: set completedAt to null if currently non-null
        if (existing.completedAt) {
          await tx.orm.public.Reminders.where({ id: reminderId }).update({
            completedAt: null,
          });
        }
      }
    });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[TOGGLE_COMPLETE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update reminder status' };
  }
}

export async function deleteReminderAction(reminderId: string) {
  try {
    const user = await getCurrentUser();

    const existing = await prisma.orm.public.Reminders.where({ id: reminderId }).first();
    if (!existing) {
      return { success: false, error: 'Reminder not found' };
    }

    const companyId = String(existing.companyId);

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Reminders.where({ id: reminderId }).delete();
    });

    revalidatePath('/tasks');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_REMINDER_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to delete reminder' };
  }
}
