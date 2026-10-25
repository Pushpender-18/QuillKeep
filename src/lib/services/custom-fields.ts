import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { getCustomFieldDefinitions, CustomFieldDefinition } from '@/lib/custom-fields';
import { customFieldCreateSchema, customFieldUpdateSchema } from '@/lib/schemas';
import { ApiError } from '@/lib/api/errors';
import { ServiceContext } from './companies';

export async function listCustomFields(_ctx?: ServiceContext) {
  const defs = await getCustomFieldDefinitions();
  return { items: defs };
}

export async function createCustomField(
  ctx: ServiceContext,
  input: {
    name: string;
    fieldType: 'text' | 'number' | 'date' | 'dropdown';
    options?: string[] | null;
  }
) {
  const parsed = customFieldCreateSchema.parse(input);
  const cleanName = parsed.name.trim();

  // Check name uniqueness (case-insensitive, trimmed)
  const existingDefs = await getCustomFieldDefinitions();
  const nameMatch = existingDefs.find(
    (d) => d.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (nameMatch) {
    throw ApiError.duplicateName('A custom field with this name already exists');
  }

  let cleanOptions: string[] | null = null;
  if (parsed.fieldType === 'dropdown') {
    const rawOptions = parsed.options || [];
    const trimmedOpts = rawOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (trimmedOpts.length === 0) {
      throw ApiError.validation('Dropdown fields require at least one option');
    }

    const seen = new Set<string>();
    for (const opt of trimmedOpts) {
      const lower = opt.toLowerCase();
      if (seen.has(lower)) {
        throw ApiError.validation(`Duplicate option found: "${opt}"`);
      }
      seen.add(lower);
    }
    cleanOptions = trimmedOpts;
  }

  const createdField: any = await withUser(ctx.user.id, async (tx) => {
    const newDef = await tx.orm.public.CustomFieldDefinitions.create({
      name: cleanName,
      fieldType: parsed.fieldType,
      options: cleanOptions ? cleanOptions : null,
      isActive: true,
      createdBy: ctx.user.id,
    });
    return newDef;
  });

  return {
    id: String(createdField.id),
    name: String(createdField.name),
    fieldType: String(createdField.fieldType),
    options: Array.isArray(createdField.options) ? createdField.options.map(String) : null,
    isActive: Boolean(createdField.isActive),
    createdBy: createdField.createdBy ? String(createdField.createdBy) : null,
    createdAt: createdField.createdAt ? new Date(createdField.createdAt).toISOString() : null,
  };
}

export async function updateCustomField(
  ctx: ServiceContext,
  input: {
    id: string;
    name?: string;
    options?: string[];
    newOptions?: string[];
    isActive?: boolean;
  }
) {
  const { id } = input;
  const parsed = customFieldUpdateSchema.parse(input);

  const existingDefs = await getCustomFieldDefinitions();
  const target = existingDefs.find((d) => d.id === id);
  if (!target) {
    throw ApiError.notFound('Custom field not found');
  }

  await withUser(ctx.user.id, async (tx) => {
    const updateData: any = {};

    // 1. Rename
    if (parsed.name) {
      const cleanName = parsed.name.trim();
      const nameMatch = existingDefs.find(
        (d) => d.id !== id && d.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (nameMatch) {
        throw ApiError.duplicateName('A custom field with this name already exists');
      }
      updateData.name = cleanName;
    }

    // 2. Add options to dropdown
    const optionsToAdd = parsed.newOptions || parsed.options;
    if (optionsToAdd && optionsToAdd.length > 0) {
      if (target.fieldType !== 'dropdown') {
        throw ApiError.validation('Options can only be added to dropdown fields');
      }

      const existingOptions = target.options || [];
      const existingSet = new Set(existingOptions.map((o) => o.toLowerCase()));
      const cleanNewOpts = optionsToAdd.map((o) => o.trim()).filter((o) => o.length > 0);

      const merged = [...existingOptions];
      for (const opt of cleanNewOpts) {
        const lower = opt.toLowerCase();
        if (existingSet.has(lower)) {
          throw ApiError.validation(`Option "${opt}" already exists`);
        }
        existingSet.add(lower);
        merged.push(opt);
      }
      updateData.options = merged;
    }

    // 3. Toggle isActive
    if (parsed.isActive !== undefined) {
      updateData.isActive = parsed.isActive;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.orm.public.CustomFieldDefinitions.where({ id }).update(updateData);
    }
  });

  return { success: true, id };
}
