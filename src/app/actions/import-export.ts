'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import { convertBigInts } from '@/lib/utils';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export interface RawParsedImportData {
  headers: string[];
  totalRows: number;
  previewRows: string[][];
  allDataRows: string[][];
  industries: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string }>;
  profiles: Array<{ id: string; fullName: string; email: string }>;
  customFieldDefs: Array<{ id: string; name: string; fieldType: string; options?: any }>;
}

export async function parseImportFileAction(formData: FormData) {
  try {
    await getCurrentUser();

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds maximum allowed limit of 2 MB' };
    }

    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv') || file.type.includes('csv');
    const isXlsx = fileName.endsWith('.xlsx') || file.type.includes('spreadsheetml');

    if (!isCsv && !isXlsx) {
      return { success: false, error: 'Invalid file format. Please upload a .csv or .xlsx file.' };
    }

    let rows: string[][] = [];

    if (isCsv) {
      const text = await file.text();
      const parseResult = Papa.parse<string[]>(text, {
        header: false,
        skipEmptyLines: 'greedy',
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.warn('[CSV_PARSE_WARNINGS]', parseResult.errors);
      }

      rows = parseResult.data.map((row) => row.map((cell) => String(cell ?? '').trim()));
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return { success: false, error: 'Excel file is empty or contains no worksheets' };
      }

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowValues: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let valStr = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (cell.value instanceof Date) {
              const d = cell.value;
              const yyyy = d.getUTCFullYear();
              const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
              const dd = String(d.getUTCDate()).padStart(2, '0');
              valStr = `${yyyy}-${mm}-${dd}`;
            } else if (typeof cell.value === 'object') {
              valStr = (cell.value as any).result || (cell.value as any).text || String(cell.value);
            } else {
              valStr = String(cell.value);
            }
          }
          rowValues.push(valStr.trim());
        });
        rows.push(rowValues);
      });
    }

    if (rows.length === 0) {
      return { success: false, error: 'The uploaded file is empty' };
    }

    const headers = rows[0].map((h) => h.trim());
    const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.length > 0));

    if (dataRows.length > 1000) {
      return {
        success: false,
        error: `File exceeds 1000 data rows limit (found ${dataRows.length} data rows).`,
      };
    }

    // Fetch active metadata
    const rawInd = await prisma.orm.public.Industries.all();
    const rawSt = await prisma.orm.public.States.all();
    const rawProf = await prisma.orm.public.Profiles.all();
    const customFieldDefs = await getCustomFieldDefinitions();

    const industries = convertBigInts(rawInd)
      .filter((i: any) => i.isActive)
      .map((i: any) => ({ id: String(i.id), name: String(i.name) }));

    const states = convertBigInts(rawSt)
      .filter((s: any) => s.isActive)
      .map((s: any) => ({ id: String(s.id), name: String(s.name) }));

    const profiles = convertBigInts(rawProf)
      .filter((p: any) => p.isActive)
      .map((p: any) => ({ id: String(p.id), fullName: String(p.fullName || ''), email: String(p.email || '') }));

    const activeCustomFieldDefs = customFieldDefs
      .filter((d) => d.isActive)
      .map((d) => ({
        id: String(d.id),
        name: String(d.name),
        fieldType: String(d.fieldType),
        options: d.options,
      }));

    return {
      success: true,
      headers,
      totalRows: dataRows.length,
      previewRows: dataRows.slice(0, 5),
      allDataRows: dataRows,
      industries,
      states,
      profiles,
      customFieldDefs: activeCustomFieldDefs,
    };
  } catch (err: any) {
    console.error('[PARSE_IMPORT_FILE_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to parse import file' };
  }
}

export interface PreparedImportRow {
  rowNumber: number;
  companyName: string;
  industryId?: string | null;
  stateId?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'contacted' | 'not_interested';
  contactName?: string | null;
  contactJobTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  customFields?: Record<string, any>;
}

export async function executeImportChunkAction(rows: PreparedImportRow[]) {
  try {
    const user = await getCurrentUser();

    if (!rows || rows.length === 0) {
      return { success: true, importedCount: 0, failedCount: 0, failedRows: [] };
    }

    let importedCount = 0;
    let failedCount = 0;
    const failedRows: Array<{ rowNumber: number; companyName: string; reason: string }> = [];

    // Attempt chunk write inside transaction with 30 second timeout
    try {
      await withUser(
        user.id,
        async (tx) => {
          for (const row of rows) {
            const newCompany = await tx.orm.public.Companies.create({
              name: row.companyName.trim(),
              industryId: row.industryId || null,
              stateId: row.stateId || null,
              location: row.location || null,
              assignedTo: row.assignedTo || user.id,
              createdBy: user.id,
              priority: row.priority || 'medium',
              status: row.status || 'new',
              customFields: row.customFields || {},
            });

            const companyId = String(newCompany.id);

            if (row.contactName) {
              await tx.orm.public.Contacts.create({
                companyId,
                name: row.contactName.trim(),
                jobTitle: row.contactJobTitle ? row.contactJobTitle.trim() : null,
                email: row.contactEmail ? row.contactEmail.trim() : null,
                phone: row.contactPhone ? row.contactPhone.trim() : null,
                isPrimary: true,
              });
            }
          }
        },
        { maxWait: 10000, timeout: 30000 }
      );

      importedCount = rows.length;
    } catch (chunkErr: any) {
      // Chunk level failure: fallback to individual row insertion to isolate errors
      for (const row of rows) {
        try {
          await withUser(
            user.id,
            async (tx) => {
              const newCompany = await tx.orm.public.Companies.create({
                name: row.companyName.trim(),
                industryId: row.industryId || null,
                stateId: row.stateId || null,
                location: row.location || null,
                assignedTo: row.assignedTo || user.id,
                createdBy: user.id,
                priority: row.priority || 'medium',
                status: row.status || 'new',
                customFields: row.customFields || {},
              });

              const companyId = String(newCompany.id);

              if (row.contactName) {
                await tx.orm.public.Contacts.create({
                  companyId,
                  name: row.contactName.trim(),
                  jobTitle: row.contactJobTitle ? row.contactJobTitle.trim() : null,
                  email: row.contactEmail ? row.contactEmail.trim() : null,
                  phone: row.contactPhone ? row.contactPhone.trim() : null,
                  isPrimary: true,
                });
              }
            },
            { maxWait: 5000, timeout: 10000 }
          );
          importedCount++;
        } catch (singleErr: any) {
          failedCount++;
          failedRows.push({
            rowNumber: row.rowNumber,
            companyName: row.companyName,
            reason: singleErr?.message || 'Database insert failed',
          });
        }
      }
    }

    revalidatePath('/companies');
    return {
      success: true,
      importedCount,
      failedCount,
      failedRows,
    };
  } catch (err: any) {
    console.error('[EXECUTE_IMPORT_CHUNK_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to execute import chunk' };
  }
}
