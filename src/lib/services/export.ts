import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getFilteredCompanies } from '@/lib/companies-query';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { ApiError } from '@/lib/api/errors';
import { exportQuerySchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

export async function exportCompanies(ctx: ServiceContext, rawParams: any) {
  const params = exportQuerySchema.parse(rawParams);
  const format = params.format === 'xlsx' ? 'xlsx' : 'csv';
  const exportScope = params.exportScope || 'current';
  const includeArchived = Boolean(params.includeArchived);

  let selectedIds: string[] = [];
  if (params.selectedIds) {
    if (Array.isArray(params.selectedIds)) {
      selectedIds = params.selectedIds;
    } else if (typeof params.selectedIds === 'string') {
      selectedIds = params.selectedIds.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // Fetch lookup datasets
  const [rawInd, rawSt, rawProf, rawContacts, customFieldDefs] = await Promise.all([
    prisma.orm.public.Industries.all(),
    prisma.orm.public.States.all(),
    prisma.orm.public.Profiles.all(),
    prisma.orm.public.Contacts.all(),
    getCustomFieldDefinitions(),
  ]);

  const activeDefs = customFieldDefs.filter((d) => d.isActive);

  const cleanInd = convertBigInts(rawInd);
  const cleanSt = convertBigInts(rawSt);
  const cleanProf = convertBigInts(rawProf);
  const cleanContacts = convertBigInts(rawContacts);

  const indMap = new Map(cleanInd.map((i: any) => [String(i.id), String(i.name)]));
  const stMap = new Map(cleanSt.map((s: any) => [String(s.id), String(s.name)]));
  const profMap = new Map(cleanProf.map((p: any) => [String(p.id), String(p.fullName || p.email)]));

  const primaryContactMap = new Map<string, { name: string; email: string; phone: string }>();
  cleanContacts.forEach((ct: any) => {
    const cId = String(ct.companyId);
    if (!primaryContactMap.has(cId) || ct.isPrimary) {
      primaryContactMap.set(cId, {
        name: String(ct.name || ''),
        email: String(ct.email || ''),
        phone: String(ct.phone || ''),
      });
    }
  });

  let matchedCompanies: any[] = [];

  if (exportScope === 'all_active') {
    const rawComp = await prisma.orm.public.Companies.all();
    matchedCompanies = convertBigInts(rawComp).filter((c: any) =>
      includeArchived ? true : !c.isArchived
    );
  } else if (exportScope === 'selected' && selectedIds.length > 0) {
    const rawComp = await prisma.orm.public.Companies.all();
    matchedCompanies = convertBigInts(rawComp).filter((c: any) =>
      selectedIds.includes(String(c.id))
    );
  } else {
    const overrideView = includeArchived ? 'all' : undefined;
    matchedCompanies = await getFilteredCompanies(rawParams, ctx.user.id, { overrideView });
  }

  if (matchedCompanies.length > 10000) {
    throw ApiError.validation('Export hard limit exceeded (10,000 rows max). Please refine your filters.');
  }

  const headers = [
    'Company Name',
    'Industry',
    'State',
    'Location',
    'Status',
    'Priority',
    'Assigned To',
    'Last Contacted',
    'Created',
    'Archived',
    'Archive Reason',
    'Primary Contact Name',
    'Primary Contact Email',
    'Primary Contact Phone',
    ...activeDefs.map((d) => d.name),
  ];

  const formatISTDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(',', '');
  };

  const dataRows = matchedCompanies.map((c: any) => {
    const cId = String(c.id);
    const indName = c.industryId ? indMap.get(String(c.industryId)) || '' : '';
    const stName = c.stateId ? stMap.get(String(c.stateId)) || '' : '';
    const assignedName = c.assignedTo ? profMap.get(String(c.assignedTo)) || '' : 'Unassigned';
    const contact = primaryContactMap.get(cId) || { name: '', email: '', phone: '' };
    const cfObj = (c.customFields as Record<string, any>) || {};

    const rowValues = [
      String(c.name || ''),
      indName,
      stName,
      String(c.location || ''),
      String(c.status || ''),
      String(c.priority || ''),
      assignedName,
      formatISTDate(c.lastContactedAt),
      formatISTDate(c.createdAt),
      c.isArchived ? 'Yes' : 'No',
      String(c.archiveReason || ''),
      contact.name,
      contact.email,
      contact.phone,
    ];

    activeDefs.forEach((def) => {
      const val = cfObj[def.id];
      if (val === null || val === undefined) {
        rowValues.push('');
      } else {
        rowValues.push(String(val));
      }
    });

    return rowValues;
  });

  const currentDateStr = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const sanitizedRows = dataRows.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string' && /^[\=\+\-\@]/.test(cell)) {
          return "'" + cell;
        }
        return cell;
      })
    );

    const csvString = Papa.unparse({
      fields: headers,
      data: sanitizedRows,
    });

    const bomCsv = '\uFEFF' + csvString;

    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `companies-${currentDateStr}.csv`,
      data: bomCsv,
    };
  } else {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Companies', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    dataRows.forEach((rowValues) => {
      worksheet.addRow(rowValues);
    });

    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      if (col.values) {
        col.values.forEach((v) => {
          if (v) {
            const len = String(v).length;
            if (len > maxLen) maxLen = len;
          }
        });
      }
      col.width = Math.min(maxLen + 3, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `companies-${currentDateStr}.xlsx`,
      data: Buffer.from(buffer),
    };
  }
}
