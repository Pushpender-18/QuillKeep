import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getFilteredCompanies } from '@/lib/companies-query';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

async function handleExport(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Extract query or body params
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
    const exportScope = searchParams.get('exportScope') || 'current'; // 'current' | 'selected' | 'all_active'
    const selectedIdsParam = searchParams.get('selectedIds') || '';
    const selectedIds = selectedIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Fetch lookup datasets
    const rawInd = await prisma.orm.public.Industries.all();
    const rawSt = await prisma.orm.public.States.all();
    const rawProf = await prisma.orm.public.Profiles.all();
    const rawContacts = await prisma.orm.public.Contacts.all();
    const customFieldDefs = await getCustomFieldDefinitions();
    const activeDefs = customFieldDefs.filter((d) => d.isActive);

    const cleanInd = convertBigInts(rawInd);
    const cleanSt = convertBigInts(rawSt);
    const cleanProf = convertBigInts(rawProf);
    const cleanContacts = convertBigInts(rawContacts);

    const indMap = new Map(cleanInd.map((i: any) => [String(i.id), String(i.name)]));
    const stMap = new Map(cleanSt.map((s: any) => [String(s.id), String(s.name)]));
    const profMap = new Map(cleanProf.map((p: any) => [String(p.id), String(p.fullName || p.email)]));

    // Map company primary contact
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
      // Current search & filters scope
      const overrideView = includeArchived ? 'all' : undefined;
      matchedCompanies = await getFilteredCompanies(searchParams, user.id, { overrideView });
    }

    if (matchedCompanies.length > 10000) {
      return NextResponse.json(
        { error: 'Export hard limit exceeded (10,000 rows max). Please refine your filters.' },
        { status: 400 }
      );
    }

    // Prepare table headers
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

    // Helper for IST date formatting
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

    // Build data rows
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

      // Add active custom field values
      activeDefs.forEach((def) => {
        const val = cfObj[def.id];
        if (val === null || val === undefined) {
          rowValues.push('');
        } else if (def.fieldType === 'number') {
          rowValues.push(String(val));
        } else {
          rowValues.push(String(val));
        }
      });

      return rowValues;
    });

    const currentDateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // Neutralize formula injection for CSV
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

      return new NextResponse(bomCsv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="companies-${currentDateStr}.csv"`,
        },
      });
    } else {
      // Excel (.xlsx) using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Companies', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      worksheet.addRow(headers);

      // Format header row (bold)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.commit();

      dataRows.forEach((rowValues) => {
        worksheet.addRow(rowValues);
      });

      // Auto column widths
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

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="companies-${currentDateStr}.xlsx"`,
        },
      });
    }
  } catch (err: any) {
    console.error('[EXPORT_ROUTE_ERROR]', err);
    return NextResponse.json({ error: err?.message || 'Export failed' }, { status: 500 });
  }
}
