'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCustomFieldDefinitions, CustomFieldDefinition } from '@/lib/custom-fields';

const createSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  fieldType: z.enum(['text', 'number', 'date', 'dropdown']),
  options: z.array(z.string()).nullable().optional(),
});

/**
 * Creates a new custom field definition.
 */
export async function createCustomFieldAction(input: {
  name: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[] | null;
}) {
  try {
    const user = await getCurrentUser();
    const parsed = createSchema.parse(input);

    const cleanName = parsed.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Field name cannot be empty' };
    }

    // Pre-check name uniqueness (case-insensitive, trimmed)
    const existingDefs = await getCustomFieldDefinitions();
    const nameMatch = existingDefs.find(
      (d) => d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (nameMatch) {
      return { success: false, error: 'A custom field with this name already exists' };
    }

    let cleanOptions: string[] | null = null;
    if (parsed.fieldType === 'dropdown') {
      const rawOptions = parsed.options || [];
      const trimmedOpts = rawOptions.map((o) => o.trim()).filter((o) => o.length > 0);
      if (trimmedOpts.length === 0) {
        return { success: false, error: 'Dropdown fields require at least one option' };
      }

      // Check duplicates ignoring case
      const seen = new Set<string>();
      for (const opt of trimmedOpts) {
        const lower = opt.toLowerCase();
        if (seen.has(lower)) {
          return { success: false, error: `Duplicate option found: "${opt}"` };
        }
        seen.add(lower);
      }
      cleanOptions = trimmedOpts;
    }

    const createdField: any = await withUser(user.id, async (tx) => {
      const newDef = await tx.orm.public.CustomFieldDefinitions.create({
        name: cleanName,
        fieldType: parsed.fieldType,
        options: cleanOptions ? cleanOptions : null,
        isActive: true,
        createdBy: user.id,
      });
      return newDef;
    });

    revalidatePath('/companies');

    return {
      success: true,
      field: {
        id: String(createdField.id),
        name: String(createdField.name),
        fieldType: String(createdField.fieldType) as any,
        options: Array.isArray(createdField.options) ? createdField.options.map(String) : null,
        isActive: Boolean(createdField.isActive),
        createdBy: createdField.createdBy ? String(createdField.createdBy) : null,
        createdAt: String(createdField.createdAt),
      } as CustomFieldDefinition,
    };
  } catch (err: any) {
    console.error('[CREATE_CUSTOM_FIELD_ERROR]', err);
    if (err?.message?.includes('idx_custom_field_name') || err?.code === '23505') {
      return { success: false, error: 'A custom field with this name already exists' };
    }
    return { success: false, error: err?.message || 'Failed to create custom field' };
  }
}

/**
 * Renames an existing custom field definition.
 */
export async function renameCustomFieldAction(id: string, name: string) {
  try {
    const user = await getCurrentUser();
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, error: 'Field name cannot be empty' };
    }

    const existingDefs = await getCustomFieldDefinitions();
    const nameMatch = existingDefs.find(
      (d) => d.id !== id && d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (nameMatch) {
      return { success: false, error: 'A custom field with this name already exists' };
    }

    await withUser(user.id, async (tx) => {
      await tx.orm.public.CustomFieldDefinitions.where({ id }).update({
        name: cleanName,
      });
    });

    revalidatePath('/companies');
    return { success: true };
  } catch (err: any) {
    console.error('[RENAME_CUSTOM_FIELD_ERROR]', err);
    if (err?.message?.includes('idx_custom_field_name') || err?.code === '23505') {
      return { success: false, error: 'A custom field with this name already exists' };
    }
    return { success: false, error: err?.message || 'Failed to rename custom field' };
  }
}

/**
 * Adds new options to a dropdown custom field (existing options cannot be removed/renamed).
 */
export async function addCustomFieldOptionsAction(id: string, newOptions: string[]) {
  try {
    const user = await getCurrentUser();
    const existingDefs = await getCustomFieldDefinitions();
    const target = existingDefs.find((d) => d.id === id);

    if (!target) {
      return { success: false, error: 'Custom field not found' };
    }
    if (target.fieldType !== 'dropdown') {
      return { success: false, error: 'Options can only be added to dropdown fields' };
    }

    const existingOptions = target.options || [];
    const existingSet = new Set(existingOptions.map((o) => o.toLowerCase()));

    const cleanNewOpts = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanNewOpts.length === 0) {
      return { success: false, error: 'No valid new options provided' };
    }

    const merged = [...existingOptions];
    for (const opt of cleanNewOpts) {
      const lower = opt.toLowerCase();
      if (existingSet.has(lower)) {
        return { success: false, error: `Option "${opt}" already exists` };
      }
      existingSet.add(lower);
      merged.push(opt);
    }

    await withUser(user.id, async (tx) => {
      await tx.orm.public.CustomFieldDefinitions.where({ id }).update({
        options: merged,
      });
    });

    revalidatePath('/companies');
    return { success: true, options: merged };
  } catch (err: any) {
    console.error('[ADD_CUSTOM_FIELD_OPTIONS_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to add options' };
  }
}

/**
 * Toggles a custom field definition between active and retired states.
 */
export async function toggleCustomFieldActiveAction(id: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();

    await withUser(user.id, async (tx) => {
      await tx.orm.public.CustomFieldDefinitions.where({ id }).update({
        isActive,
      });
    });

    revalidatePath('/companies');
    return { success: true };
  } catch (err: any) {
    console.error('[TOGGLE_CUSTOM_FIELD_ACTIVE_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to update field status' };
  }
}
