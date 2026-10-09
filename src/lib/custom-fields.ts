import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown';
  options: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Loads all custom field definitions (active and retired).
 */
export async function getCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  try {
    const raw = await prisma.orm.public.CustomFieldDefinitions.all();
    const clean = convertBigInts(raw);
    return clean.map((item: any) => ({
      id: String(item.id),
      name: String(item.name),
      fieldType: String(item.fieldType) as any,
      options: Array.isArray(item.options) ? item.options.map(String) : null,
      isActive: Boolean(item.isActive),
      createdBy: item.createdBy ? String(item.createdBy) : null,
      createdAt: String(item.createdAt),
    }));
  } catch (err) {
    console.error('[GET_CUSTOM_FIELD_DEFINITIONS_ERROR]', err);
    return [];
  }
}

/**
 * Validates and merges custom field values when saving a company.
 * Starts from existing custom_fields, updates active field values,
 * leaves retired field values untouched, and removes keys for cleared values.
 */
export function mergeAndValidateCustomFields(
  existingCustomFields: Record<string, any> | null | undefined,
  submittedValues: Record<string, any> | null | undefined,
  definitions: CustomFieldDefinition[]
): { valid: boolean; customFields: Record<string, any>; error?: string } {
  const activeDefMap = new Map(definitions.filter((d) => d.isActive).map((d) => [d.id, d]));
  const allDefMap = new Map(definitions.map((d) => [d.id, d]));

  // Start with existing custom fields cloned
  const result: Record<string, any> = { ...(existingCustomFields || {}) };

  if (!submittedValues) {
    return { valid: true, customFields: result };
  }

  for (const [fieldId, val] of Object.entries(submittedValues)) {
    const activeDef = activeDefMap.get(fieldId);

    // If key belongs to a non-active field or unknown field, skip/reject if unknown
    if (!activeDef) {
      const def = allDefMap.get(fieldId);
      if (!def) {
        return { valid: false, customFields: {}, error: `Unknown custom field ID: ${fieldId}` };
      }
      // If it's retired, do not overwrite submitted value for it from active form
      continue;
    }

    // Cleared value removes the key. Never store null or ""
    if (val === null || val === undefined || val === '') {
      delete result[fieldId];
      continue;
    }

    // Validate type-specific constraints
    if (activeDef.fieldType === 'text') {
      const strVal = String(val).trim();
      if (strVal.length === 0) {
        delete result[fieldId];
      } else if (strVal.length > 500) {
        return {
          valid: false,
          customFields: {},
          error: `Field "${activeDef.name}" text exceeds maximum limit of 500 characters`,
        };
      } else {
        result[fieldId] = strVal;
      }
    } else if (activeDef.fieldType === 'number') {
      const numVal = typeof val === 'number' ? val : Number(val);
      if (isNaN(numVal)) {
        return {
          valid: false,
          customFields: {},
          error: `Field "${activeDef.name}" must be a valid number`,
        };
      }
      result[fieldId] = numVal;
    } else if (activeDef.fieldType === 'date') {
      const strVal = String(val).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
        return {
          valid: false,
          customFields: {},
          error: `Field "${activeDef.name}" date must be in YYYY-MM-DD format`,
        };
      }
      result[fieldId] = strVal;
    } else if (activeDef.fieldType === 'dropdown') {
      const strVal = String(val).trim();
      const validOptions = activeDef.options || [];
      if (!validOptions.includes(strVal)) {
        return {
          valid: false,
          customFields: {},
          error: `Field "${activeDef.name}" value "${strVal}" is not a valid dropdown option`,
        };
      }
      result[fieldId] = strVal;
    }
  }

  return { valid: true, customFields: result };
}
