import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import Papa from 'papaparse';

export async function GET() {
  try {
    await getCurrentUser();

    const customFieldDefs = await getCustomFieldDefinitions();
    const activeDefs = customFieldDefs.filter((d) => d.isActive);

    const headers = [
      'Company Name',
      'Industry',
      'State',
      'Location',
      'Assigned To (email)',
      'Priority',
      'Status',
      'Contact Name',
      'Contact Job Title',
      'Contact Email',
      'Contact Phone',
      ...activeDefs.map((d) => d.name),
    ];

    const exampleRow = [
      'Acme Corporation',
      'Technology',
      'Karnataka',
      'Bengaluru',
      'john@example.com',
      'High',
      'New',
      'Jane Doe',
      'CTO',
      'jane@acme.com',
      '+91 9876543210',
      ...activeDefs.map((d) => {
        if (d.fieldType === 'number') return '100';
        if (d.fieldType === 'date') return '2026-01-01';
        if (d.fieldType === 'dropdown' && Array.isArray(d.options) && d.options.length > 0) {
          return String(d.options[0]);
        }
        return 'Sample Text';
      }),
    ];

    const csvContent = Papa.unparse({
      fields: headers,
      data: [exampleRow],
    });

    const bomCsv = '\uFEFF' + csvContent;

    return new NextResponse(bomCsv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="quillkeep-companies-import-template.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unauthorized' }, { status: 401 });
  }
}
