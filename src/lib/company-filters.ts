import { db } from '@/prisma/db';

/**
 * Executes parameterized SQL query for custom field filters returning matching company IDs.
 */
export async function getCompanyIdsMatchingCustomFieldFilters(
  customFieldFilters: Array<{
    fieldId: string;
    type: 'text' | 'dropdown' | 'number' | 'date';
    textVal?: string;
    dropdownVals?: string[];
    minNum?: number;
    maxNum?: number;
    fromDate?: string;
    toDate?: string;
  }>
): Promise<string[] | null> {
  if (customFieldFilters.length === 0) return null; // No custom field filters active

  const drv = (db.runtime() as any).driver;

  // We intersect company IDs across all active custom field filters (AND logic)
  let intersectedIds: Set<string> | null = null;

  for (const filter of customFieldFilters) {
    const { fieldId, type, textVal, dropdownVals, minNum, maxNum, fromDate, toDate } = filter;
    let sql = '';
    let params: any[] = [];

    if (type === 'text' && textVal) {
      sql = 'select id from companies where custom_fields->>$1 ilike $2';
      params = [fieldId, `%${textVal}%`];
    } else if (type === 'dropdown' && dropdownVals && dropdownVals.length > 0) {
      sql = 'select id from companies where custom_fields->>$1 = any($2::text[])';
      params = [fieldId, dropdownVals];
    } else if (type === 'number') {
      const conditions: string[] = ["jsonb_typeof(custom_fields->$1) = 'number'"];
      params.push(fieldId);

      if (minNum !== undefined && !isNaN(minNum)) {
        params.push(minNum);
        conditions.push(`(custom_fields->>$1)::numeric >= $${params.length}`);
      }
      if (maxNum !== undefined && !isNaN(maxNum)) {
        params.push(maxNum);
        conditions.push(`(custom_fields->>$1)::numeric <= $${params.length}`);
      }

      sql = `select id from companies where ${conditions.join(' and ')}`;
    } else if (type === 'date') {
      const conditions: string[] = ['custom_fields->>$1 is not null'];
      params.push(fieldId);

      if (fromDate) {
        params.push(fromDate);
        conditions.push(`(custom_fields->>$1) >= $${params.length}`);
      }
      if (toDate) {
        params.push(toDate);
        conditions.push(`(custom_fields->>$1) <= $${params.length}`);
      }

      sql = `select id from companies where ${conditions.join(' and ')}`;
    }

    if (!sql) continue;

    const gen = drv.query({ sql, params });
    const currentIds = new Set<string>();
    for await (const row of gen) {
      currentIds.add(String((row as any).id));
    }

    if (intersectedIds === null) {
      intersectedIds = currentIds;
    } else {
      const prevSet: Set<string> = intersectedIds;
      const prevList: string[] = Array.from(prevSet);
      intersectedIds = new Set(prevList.filter((id: string) => currentIds.has(id)));
    }
  }

  return intersectedIds ? Array.from(intersectedIds) : [];
}
