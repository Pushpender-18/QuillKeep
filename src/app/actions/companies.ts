'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { db } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industryId: z.string().nullable().optional(),
  stateId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  initialStatus: z.enum(['new', 'contacted', 'not_interested', 'contact_later', 'meeting_scheduled']).optional(),
  dueAt: z.string().nullable().optional(),
  reminderType: z.enum(['callback', 'meeting', 'missed_call', 'manual']).nullable().optional(),
  note: z.string().nullable().optional(),
});

/**
 * Checks if a company name already exists (case-insensitive, trimmed).
 * Also returns if the matching company is archived.
 */
export async function checkCompanyNameAction(name: string, excludeId?: string) {
  try {
    await getCurrentUser();
    const cleanName = name.trim().toLowerCase();
    
    const allCompanies = await prisma.orm.public.Companies.all();
    const match = allCompanies.find(
      (c: any) =>
        String(c.name).trim().toLowerCase() === cleanName &&
        (!excludeId || String(c.id) !== excludeId)
    );

    if (match) {
      return {
        exists: true,
        isArchived: Boolean(match.isArchived),
        companyId: String(match.id),
      };
    }
    return { exists: false, isArchived: false };
  } catch (err: any) {
    return { exists: false, isArchived: false, error: err?.message };
  }
}

/**
 * Creates a new company record within a withUser transaction.
 */
export async function createCompanyAction(input: any) {
  try {
    const user = await getCurrentUser();
    const parsed = companySchema.parse(input);

    // Name uniqueness check
    const checkRes = await checkCompanyNameAction(parsed.name);
    if (checkRes.exists) {
      if (checkRes.isArchived) {
        return {
          success: false,
          error: 'This company is archived.',
          isArchived: true,
          companyId: checkRes.companyId,
        };
      }
      return { success: false, error: 'A company with this name already exists' };
    }

    const companyId = await withUser(user.id, async (tx) => {
      // 1. Create company record with initial status 'new'
      const newCompany = await tx.orm.public.Companies.create({
        name: parsed.name.trim(),
        industryId: parsed.industryId || null,
        stateId: parsed.stateId || null,
        location: parsed.location || null,
        priority: parsed.priority,
        assignedTo: parsed.assignedTo || user.id,
        createdBy: user.id,
        status: 'new',
      });

      const id = String(newCompany.id);

      // 2. Create primary contact if contact details provided
      if (parsed.contactName) {
        await tx.orm.public.Contacts.create({
          companyId: id,
          name: parsed.contactName.trim(),
          email: parsed.contactEmail ? parsed.contactEmail.trim() : null,
          phone: parsed.contactPhone ? parsed.contactPhone.trim() : null,
          isPrimary: true,
        });
      }

      // 3. If initialStatus is NOT 'new', call change_company_status procedure
      const targetStatus = parsed.initialStatus || 'new';
      if (targetStatus !== 'new') {
        const dueAt = parsed.dueAt || null;
        const reminderType = parsed.reminderType || null;
        const note = parsed.note || null;

        let plan: any;
        if (dueAt && reminderType && note) {
          plan = db.raw
            .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, ${note})`
            .affectedCount()
            .build();
        } else if (dueAt && reminderType) {
          plan = db.raw
            .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, null)`
            .affectedCount()
            .build();
        } else {
          plan = db.raw
            .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, null::timestamptz, null::reminder_type, null)`
            .affectedCount()
            .build();
        }
        await tx.execute(plan);
      }

      return id;
    });

    revalidatePath('/companies');
    return { success: true, companyId };
  } catch (err: any) {
    console.error('[CREATE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to create company' };
  }
}

/**
 * Updates company details (Name, Industry, State, Location, Priority, Assignee).
 * Status is not updated via this action.
 */
export async function updateCompanyAction(companyId: string, input: any) {
  try {
    const user = await getCurrentUser();
    
    // Validate inputs
    const parsed = companySchema.partial().parse(input);
    if (parsed.name) {
      const checkRes = await checkCompanyNameAction(parsed.name, companyId);
      if (checkRes.exists) {
        if (checkRes.isArchived) {
          return {
            success: false,
            error: 'This company name matches an archived company.',
            isArchived: true,
          };
        }
        return { success: false, error: 'A company with this name already exists' };
      }
    }

    await withUser(user.id, async (tx) => {
      const updateData: any = {};
      if (parsed.name) updateData.name = parsed.name.trim();
      if (parsed.industryId !== undefined) updateData.industryId = parsed.industryId || null;
      if (parsed.stateId !== undefined) updateData.stateId = parsed.stateId || null;
      if (parsed.location !== undefined) updateData.location = parsed.location || null;
      if (parsed.priority) updateData.priority = parsed.priority;
      if (parsed.assignedTo !== undefined) updateData.assignedTo = parsed.assignedTo || null;
      updateData.updatedAt = new Date().toISOString();

      await tx.orm.public.Companies.where({ id: companyId }).update(updateData);
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to update company' };
  }
}

/**
 * Updates company status strictly via change_company_status database function.
 */
export async function changeCompanyStatusAction(
  companyId: string,
  status: string,
  dueAt?: string | null,
  reminderType?: string | null,
  note?: string | null
) {
  try {
    const user = await getCurrentUser();

    await withUser(user.id, async (tx) => {
      let plan: any;
      if (dueAt && reminderType && note) {
        plan = db.raw
          .sql`select change_company_status(${companyId}::uuid, ${status}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, ${note})`
          .affectedCount()
          .build();
      } else if (dueAt && reminderType) {
        plan = db.raw
          .sql`select change_company_status(${companyId}::uuid, ${status}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, null)`
          .affectedCount()
          .build();
      } else {
        plan = db.raw
          .sql`select change_company_status(${companyId}::uuid, ${status}::lead_status, null::timestamptz, null::reminder_type, null)`
          .affectedCount()
          .build();
      }
      await tx.execute(plan);
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[CHANGE_COMPANY_STATUS_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to change company status' };
  }
}

/**
 * Archives a company (is_archived = true + archive_reason).
 */
export async function archiveCompanyAction(companyId: string, reason?: string, note?: string) {
  try {
    const user = await getCurrentUser();
    const finalReason = [reason, note].filter(Boolean).join(' - ') || 'Archived';

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Companies.where({ id: companyId }).update({
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: user.id,
        archiveReason: finalReason,
        updatedAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[ARCHIVE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to archive company' };
  }
}

/**
 * Restores an archived company (is_archived = false).
 */
export async function restoreCompanyAction(companyId: string) {
  try {
    const user = await getCurrentUser();

    await withUser(user.id, async (tx) => {
      await tx.orm.public.Companies.where({ id: companyId }).update({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        updatedAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[RESTORE_COMPANY_ACTION]', err);
    return { success: false, error: err?.message || 'Failed to restore company' };
  }
}

/**
 * Quick update for priority.
 */
export async function updatePriorityAction(companyId: string, priority: 'low' | 'medium' | 'high') {
  try {
    const user = await getCurrentUser();
    await withUser(user.id, async (tx) => {
      await tx.orm.public.Companies.where({ id: companyId }).update({
        priority,
        updatedAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update priority' };
  }
}

/**
 * Quick update for assignee.
 */
export async function updateAssigneeAction(companyId: string, assignedTo: string) {
  try {
    const user = await getCurrentUser();
    await withUser(user.id, async (tx) => {
      await tx.orm.public.Companies.where({ id: companyId }).update({
        assignedTo: assignedTo || null,
        updatedAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update assignee' };
  }
}
