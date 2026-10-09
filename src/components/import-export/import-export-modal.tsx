'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { parseImportFileAction, executeImportChunkAction, PreparedImportRow } from '@/app/actions/import-export';
import { checkCompanyNameAction } from '@/app/actions/companies';
import { Upload, Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight, ArrowLeft, RefreshCw, FileDown } from 'lucide-react';
import Papa from 'papaparse';
import { ProfileOption } from '@/components/ui/select-with-avatars';

export interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompanyIds?: string[];
  currentSearchParamsStr?: string;
  currentUserId: string;
  profiles: ProfileOption[];
  onRefreshList?: () => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  selectedCompanyIds = [],
  currentSearchParamsStr = '',
  currentUserId,
  profiles,
  onRefreshList,
  onSuccessToast,
  onErrorToast,
}) => {
  const [activeTab, setActiveTab] = React.useState<'import' | 'export'>('import');

  // Import State
  const [importStep, setImportStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState('');

  // Parsed metadata from Step 1
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [allDataRows, setAllDataRows] = React.useState<string[][]>([]);
  const [previewRows, setPreviewRows] = React.useState<string[][]>([]);
  const [industries, setIndustries] = React.useState<Array<{ id: string; name: string }>>([]);
  const [states, setStates] = React.useState<Array<{ id: string; name: string }>>([]);
  const [activeProfiles, setActiveProfiles] = React.useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [customFieldDefs, setCustomFieldDefs] = React.useState<Array<{ id: string; name: string; fieldType: string; options?: any }>>([]);

  // Step 2: Column Mapping (columnIndex -> targetKey)
  const [columnMapping, setColumnMapping] = React.useState<Record<number, string>>({});

  // Step 3: Value Resolution mappings
  const [unmatchedIndustries, setUnmatchedIndustries] = React.useState<Array<{ value: string; count: number }>>([]);
  const [unmatchedStates, setUnmatchedStates] = React.useState<Array<{ value: string; count: number }>>([]);
  const [unmatchedProfiles, setUnmatchedProfiles] = React.useState<Array<{ value: string; count: number }>>([]);
  const [resolvedIndustries, setResolvedIndustries] = React.useState<Record<string, string>>({});
  const [resolvedStates, setResolvedStates] = React.useState<Record<string, string>>({});
  const [resolvedProfiles, setResolvedProfiles] = React.useState<Record<string, string>>({});
  const [blankAssigneeChoice, setBlankAssigneeChoice] = React.useState<'unassigned' | 'me'>('unassigned');

  // Step 4: Review Data
  const [preparedRows, setPreparedRows] = React.useState<PreparedImportRow[]>([]);
  const [problemRows, setProblemRows] = React.useState<Array<{ rowNumber: number; companyName: string; reason: string; type: 'warning' | 'skip' }>>([]);
  const [skipCount, setSkipCount] = React.useState(0);
  const [warningCount, setWarningCount] = React.useState(0);
  const [isReviewing, setIsReviewing] = React.useState(false);

  // Step 5: Import Execution
  const [importProgress, setImportProgress] = React.useState(0);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);
  const [failedRowsList, setFailedRowsList] = React.useState<Array<{ rowNumber: number; companyName: string; reason: string }>>([]);

  // Export State
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'xlsx'>('csv');
  const [exportScope, setExportScope] = React.useState<'current' | 'selected' | 'all_active'>('current');
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setImportStep(1);
      setFile(null);
      setParseError('');
      setPreparedRows([]);
      setProblemRows([]);
      setImportProgress(0);
      setIsImporting(false);
      if (selectedCompanyIds.length > 0) {
        setExportScope('selected');
      } else {
        setExportScope('current');
      }
    }
  }, [isOpen, selectedCompanyIds]);

  if (!isOpen) return null;

  // STEP 1: File Upload Handler
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError('');
    setIsParsing(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await parseImportFileAction(formData);
    setIsParsing(false);

    if (!res.success) {
      setParseError(res.error || 'Failed to parse file');
      return;
    }

    setHeaders(res.headers || []);
    setAllDataRows(res.allDataRows || []);
    setPreviewRows(res.previewRows || []);
    setIndustries(res.industries || []);
    setStates(res.states || []);
    setActiveProfiles(res.profiles || []);
    setCustomFieldDefs(res.customFieldDefs || []);

    // Auto-detect column mapping
    const mapping: Record<number, string> = {};
    (res.headers || []).forEach((h, idx) => {
      const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm.includes('company') || norm.includes('organization')) mapping[idx] = 'companyName';
      else if (norm.includes('industry') || norm.includes('sector')) mapping[idx] = 'industry';
      else if (norm.includes('state') || norm.includes('province')) mapping[idx] = 'state';
      else if (norm.includes('location') || norm.includes('city') || norm.includes('address')) mapping[idx] = 'location';
      else if (norm.includes('assigned') || norm.includes('owner') || norm.includes('assignee')) mapping[idx] = 'assignedTo';
      else if (norm.includes('priority') || norm.includes('level')) mapping[idx] = 'priority';
      else if (norm.includes('status') || norm.includes('stage')) mapping[idx] = 'status';
      else if (norm === 'contact' || norm.includes('contactname') || norm.includes('person')) mapping[idx] = 'contactName';
      else if (norm.includes('jobtitle') || norm.includes('title') || norm.includes('designation')) mapping[idx] = 'contactJobTitle';
      else if (norm.includes('email') || norm.includes('mail')) mapping[idx] = 'contactEmail';
      else if (norm.includes('phone') || norm.includes('mobile') || norm.includes('number')) mapping[idx] = 'contactPhone';
      else {
        // Match against active custom fields
        const matchedCf = (res.customFieldDefs || []).find(
          (cf) => cf.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm
        );
        if (matchedCf) {
          mapping[idx] = `cf_${matchedCf.id}`;
        }
      }
    });

    setColumnMapping(mapping);
    setImportStep(2);
  };

  // STEP 2 -> STEP 3: Proceed to value resolution
  const handleProceedToResolution = () => {
    // Check Company Name mapped
    const hasNameMap = Object.values(columnMapping).includes('companyName');
    if (!hasNameMap) {
      setParseError('Company Name column mapping is required');
      return;
    }

    // Collect distinct unmatched values
    const indIndex = Object.entries(columnMapping).find(([_, v]) => v === 'industry')?.[0];
    const stIndex = Object.entries(columnMapping).find(([_, v]) => v === 'state')?.[0];
    const profIndex = Object.entries(columnMapping).find(([_, v]) => v === 'assignedTo')?.[0];

    const unIndMap = new Map<string, number>();
    const unStMap = new Map<string, number>();
    const unProfMap = new Map<string, number>();

    const indNameSet = new Map(industries.map((i) => [i.name.toLowerCase(), i.id]));
    const stNameSet = new Map(states.map((s) => [s.name.toLowerCase(), s.id]));

    allDataRows.forEach((row) => {
      if (indIndex !== undefined && row[Number(indIndex)]) {
        const val = row[Number(indIndex)].trim();
        if (val && !indNameSet.has(val.toLowerCase())) {
          unIndMap.set(val, (unIndMap.get(val) || 0) + 1);
        }
      }
      if (stIndex !== undefined && row[Number(stIndex)]) {
        const val = row[Number(stIndex)].trim();
        if (val && !stNameSet.has(val.toLowerCase())) {
          unStMap.set(val, (unStMap.get(val) || 0) + 1);
        }
      }
      if (profIndex !== undefined && row[Number(profIndex)]) {
        const val = row[Number(profIndex)].trim();
        if (val) {
          const matchedProf = activeProfiles.find(
            (p) => p.email.toLowerCase() === val.toLowerCase() || p.fullName.toLowerCase() === val.toLowerCase()
          );
          if (!matchedProf) {
            unProfMap.set(val, (unProfMap.get(val) || 0) + 1);
          }
        }
      }
    });

    setUnmatchedIndustries(Array.from(unIndMap.entries()).map(([value, count]) => ({ value, count })));
    setUnmatchedStates(Array.from(unStMap.entries()).map(([value, count]) => ({ value, count })));
    setUnmatchedProfiles(Array.from(unProfMap.entries()).map(([value, count]) => ({ value, count })));

    setImportStep(3);
  };

  // STEP 3 -> STEP 4: Review & Validation
  const handleProceedToReview = async () => {
    setIsReviewing(true);
    setParseError('');

    const nameIdx = Number(Object.entries(columnMapping).find(([_, v]) => v === 'companyName')?.[0]);
    const indIdx = Object.entries(columnMapping).find(([_, v]) => v === 'industry')?.[0];
    const stIdx = Object.entries(columnMapping).find(([_, v]) => v === 'state')?.[0];
    const locIdx = Object.entries(columnMapping).find(([_, v]) => v === 'location')?.[0];
    const profIdx = Object.entries(columnMapping).find(([_, v]) => v === 'assignedTo')?.[0];
    const prioIdx = Object.entries(columnMapping).find(([_, v]) => v === 'priority')?.[0];
    const statusIdx = Object.entries(columnMapping).find(([_, v]) => v === 'status')?.[0];

    const cNameIdx = Object.entries(columnMapping).find(([_, v]) => v === 'contactName')?.[0];
    const cTitleIdx = Object.entries(columnMapping).find(([_, v]) => v === 'contactJobTitle')?.[0];
    const cEmailIdx = Object.entries(columnMapping).find(([_, v]) => v === 'contactEmail')?.[0];
    const cPhoneIdx = Object.entries(columnMapping).find(([_, v]) => v === 'contactPhone')?.[0];

    const indMap = new Map(industries.map((i) => [i.name.toLowerCase(), i.id]));
    const stMap = new Map(states.map((s) => [s.name.toLowerCase(), s.id]));

    const seenNamesInFile = new Set<string>();
    const prepared: PreparedImportRow[] = [];
    const problems: Array<{ rowNumber: number; companyName: string; reason: string; type: 'warning' | 'skip' }> = [];

    let skips = 0;
    let warns = 0;

    for (let i = 0; i < allDataRows.length; i++) {
      const row = allDataRows[i];
      const rowNum = i + 2; // +1 header, 1-indexed

      const rawName = row[nameIdx] ? row[nameIdx].trim() : '';
      if (!rawName) {
        problems.push({ rowNumber: rowNum, companyName: '(Blank)', reason: 'Company Name is empty', type: 'skip' });
        skips++;
        continue;
      }

      const cleanNameLower = rawName.toLowerCase();

      // Duplicate in same file
      if (seenNamesInFile.has(cleanNameLower)) {
        problems.push({ rowNumber: rowNum, companyName: rawName, reason: 'Duplicate company name in file', type: 'skip' });
        skips++;
        continue;
      }
      seenNamesInFile.add(cleanNameLower);

      // Check database uniqueness
      const dbCheck = await checkCompanyNameAction(rawName);
      if (dbCheck.exists) {
        if (dbCheck.isArchived) {
          problems.push({ rowNumber: rowNum, companyName: rawName, reason: 'Archived company name exists (restore it instead)', type: 'skip' });
        } else {
          problems.push({ rowNumber: rowNum, companyName: rawName, reason: 'Active company with this name already exists', type: 'skip' });
        }
        skips++;
        continue;
      }

      // Resolve Industry
      let indId: string | null = null;
      if (indIdx !== undefined && row[Number(indIdx)]) {
        const val = row[Number(indIdx)].trim();
        const directId = indMap.get(val.toLowerCase());
        if (directId) indId = directId;
        else if (resolvedIndustries[val]) indId = resolvedIndustries[val];
      }

      // Resolve State
      let stateId: string | null = null;
      if (stIdx !== undefined && row[Number(stIdx)]) {
        const val = row[Number(stIdx)].trim();
        const directId = stMap.get(val.toLowerCase());
        if (directId) stateId = directId;
        else if (resolvedStates[val]) stateId = resolvedStates[val];
      }

      // Location
      const locationVal = locIdx !== undefined && row[Number(locIdx)] ? row[Number(locIdx)].trim() : null;

      // Assignee
      let assignedToId: string | null = blankAssigneeChoice === 'me' ? currentUserId : null;
      if (profIdx !== undefined && row[Number(profIdx)]) {
        const val = row[Number(profIdx)].trim();
        const matchedProf = activeProfiles.find(
          (p) => p.email.toLowerCase() === val.toLowerCase() || p.fullName.toLowerCase() === val.toLowerCase()
        );
        if (matchedProf) assignedToId = matchedProf.id;
        else if (resolvedProfiles[val]) assignedToId = resolvedProfiles[val];
      }

      // Priority
      let priorityVal: 'low' | 'medium' | 'high' = 'medium';
      if (prioIdx !== undefined && row[Number(prioIdx)]) {
        const val = row[Number(prioIdx)].trim().toLowerCase();
        if (val === 'low' || val === 'medium' || val === 'high') {
          priorityVal = val;
        } else {
          problems.push({ rowNumber: rowNum, companyName: rawName, reason: `Unknown priority "${val}" defaulted to Medium`, type: 'warning' });
          warns++;
        }
      }

      // Status
      let statusVal: 'new' | 'contacted' | 'not_interested' = 'new';
      if (statusIdx !== undefined && row[Number(statusIdx)]) {
        const val = row[Number(statusIdx)].trim().toLowerCase();
        if (val === 'new' || val === 'contacted' || val === 'not_interested') {
          statusVal = val;
        } else if (val === 'contact_later' || val === 'meeting_scheduled') {
          statusVal = 'new';
          problems.push({ rowNumber: rowNum, companyName: rawName, reason: `Status "${val}" imported as New (requires follow-up date)`, type: 'warning' });
          warns++;
        } else {
          statusVal = 'new';
        }
      }

      // Contact details
      const cName = cNameIdx !== undefined && row[Number(cNameIdx)] ? row[Number(cNameIdx)].trim() : null;
      const cTitle = cTitleIdx !== undefined && row[Number(cTitleIdx)] ? row[Number(cTitleIdx)].trim() : null;
      const cEmail = cEmailIdx !== undefined && row[Number(cEmailIdx)] ? row[Number(cEmailIdx)].trim() : null;
      const cPhone = cPhoneIdx !== undefined && row[Number(cPhoneIdx)] ? row[Number(cPhoneIdx)].trim() : null;

      if (!cName && (cTitle || cEmail || cPhone)) {
        problems.push({ rowNumber: rowNum, companyName: rawName, reason: 'Contact details provided without Contact Name (contact skipped)', type: 'warning' });
        warns++;
      }

      // Custom fields
      const customFieldsObj: Record<string, any> = {};
      customFieldDefs.forEach((def) => {
        const cfColIdx = Object.entries(columnMapping).find(([_, v]) => v === `cf_${def.id}`)?.[0];
        if (cfColIdx !== undefined && row[Number(cfColIdx)]) {
          const val = row[Number(cfColIdx)].trim();
          if (val) {
            if (def.fieldType === 'number') {
              const num = Number(val);
              if (!isNaN(num)) customFieldsObj[def.id] = num;
              else {
                problems.push({ rowNumber: rowNum, companyName: rawName, reason: `Custom field "${def.name}" value "${val}" is not a number (dropped)`, type: 'warning' });
                warns++;
              }
            } else if (def.fieldType === 'dropdown') {
              const opts = Array.isArray(def.options) ? def.options.map(String) : [];
              const matchOpt = opts.find((o) => o.toLowerCase() === val.toLowerCase());
              if (matchOpt) customFieldsObj[def.id] = matchOpt;
              else {
                problems.push({ rowNumber: rowNum, companyName: rawName, reason: `Custom field "${def.name}" value "${val}" does not match dropdown options (dropped)`, type: 'warning' });
                warns++;
              }
            } else {
              customFieldsObj[def.id] = val;
            }
          }
        }
      });

      prepared.push({
        rowNumber: rowNum,
        companyName: rawName,
        industryId: indId,
        stateId,
        location: locationVal,
        assignedTo: assignedToId,
        priority: priorityVal,
        status: statusVal,
        contactName: cName || null,
        contactJobTitle: cTitle || null,
        contactEmail: cEmail || null,
        contactPhone: cPhone || null,
        customFields: customFieldsObj,
      });
    }

    setPreparedRows(prepared);
    setProblemRows(problems);
    setSkipCount(skips);
    setWarningCount(warns);
    setIsReviewing(false);
    setImportStep(4);
  };

  // STEP 5: Start Batch Import
  const handleStartImport = async () => {
    setImportStep(5);
    setIsImporting(true);
    setImportProgress(0);

    const chunkSize = 50;
    let totalImp = 0;
    let totalFail = 0;
    const failedList: Array<{ rowNumber: number; companyName: string; reason: string }> = [];

    const totalChunks = Math.ceil(preparedRows.length / chunkSize);

    for (let c = 0; c < totalChunks; c++) {
      const chunkRows = preparedRows.slice(c * chunkSize, (c + 1) * chunkSize);
      const res = await executeImportChunkAction(chunkRows);

      if (res.success) {
        totalImp += res.importedCount || 0;
        totalFail += res.failedCount || 0;
        if (res.failedRows && res.failedRows.length > 0) {
          failedList.push(...res.failedRows);
        }
      } else {
        totalFail += chunkRows.length;
        chunkRows.forEach((r) => {
          failedList.push({ rowNumber: r.rowNumber, companyName: r.companyName, reason: res.error || 'Import chunk failed' });
        });
      }

      const progressPercent = Math.round(((c + 1) / totalChunks) * 100);
      setImportProgress(progressPercent);
    }

    setImportedCount(totalImp);
    setFailedCount(totalFail);
    setFailedRowsList(failedList);
    setIsImporting(false);

    if (onRefreshList) onRefreshList();
    onSuccessToast(`Import completed: ${totalImp} imported, ${skipCount} skipped, ${totalFail} failed`);
  };

  // Download Report CSV for skipped/failed rows
  const handleDownloadReport = () => {
    const reportRows: Array<{ 'Row #': number; 'Company Name': string; Type: string; Reason: string }> = [];

    problemRows
      .filter((p) => p.type === 'skip')
      .forEach((p) => {
        reportRows.push({ 'Row #': p.rowNumber, 'Company Name': p.companyName, Type: 'Skipped', Reason: p.reason });
      });

    failedRowsList.forEach((f) => {
      reportRows.push({ 'Row #': f.rowNumber, 'Company Name': f.companyName, Type: 'Failed', Reason: f.reason });
    });

    const csvStr = Papa.unparse(reportRows);
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-issues-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // EXPORT Handler
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(currentSearchParamsStr);
      params.set('format', exportFormat);
      params.set('exportScope', exportScope);
      params.set('includeArchived', String(includeArchived));
      if (exportScope === 'selected' && selectedCompanyIds.length > 0) {
        params.set('selectedIds', selectedCompanyIds.join(','));
      }

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.download = `companies-${today}.${exportFormat}`;
      link.click();
      URL.revokeObjectURL(url);

      onSuccessToast('Export downloaded successfully');
      onClose();
    } catch (err: any) {
      onErrorToast(err?.message || 'Failed to generate export file');
    } finally {
      setIsExporting(false);
    }
  };

  const targetFieldOptions = [
    { value: 'companyName', label: 'Company Name *' },
    { value: 'industry', label: 'Industry' },
    { value: 'state', label: 'State' },
    { value: 'location', label: 'Location' },
    { value: 'assignedTo', label: 'Assigned To (email/name)' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'contactName', label: 'Contact Name' },
    { value: 'contactJobTitle', label: 'Contact Job Title' },
    { value: 'contactEmail', label: 'Contact Email' },
    { value: 'contactPhone', label: 'Contact Phone' },
    ...customFieldDefs.map((def) => ({
      value: `cf_${def.id}`,
      label: `[Custom Field] ${def.name}`,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[720px] p-6">
      <div className="flex flex-col gap-5">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white tracking-tight">Import / Export</h2>
            <SegmentedControl
              options={[
                { value: 'import', label: 'Import Companies' },
                { value: 'export', label: 'Export Data' },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as any)}
              size="sm"
            />
          </div>
        </div>

        {activeTab === 'import' ? (
          <div className="flex flex-col gap-5">
            {/* Step Indicator */}
            <div className="flex items-center justify-between px-2 text-xs text-[#8E8E93]">
              <span className={importStep === 1 ? 'text-[#0A84FF] font-semibold' : ''}>1. Upload</span>
              <span>→</span>
              <span className={importStep === 2 ? 'text-[#0A84FF] font-semibold' : ''}>2. Mapping</span>
              <span>→</span>
              <span className={importStep === 3 ? 'text-[#0A84FF] font-semibold' : ''}>3. Resolve</span>
              <span>→</span>
              <span className={importStep === 4 ? 'text-[#0A84FF] font-semibold' : ''}>4. Review</span>
              <span>→</span>
              <span className={importStep === 5 ? 'text-[#0A84FF] font-semibold' : ''}>5. Finish</span>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center justify-between">
                <span>{parseError}</span>
                <button onClick={() => setParseError('')} className="text-[#FF453A] underline text-[10px]">Dismiss</button>
              </div>
            )}

            {/* STEP 1: Upload */}
            {importStep === 1 && (
              <div className="flex flex-col gap-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                  }}
                  className="w-full h-44 border-2 border-dashed border-white/20 hover:border-[#0A84FF]/60 rounded-2xl bg-[#18181B]/60 flex flex-col items-center justify-center gap-3 transition-colors p-4 text-center group cursor-pointer relative"
                >
                  <input
                    type="file"
                    accept=".csv, .xlsx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-[#0A84FF] group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Drag & drop your CSV or Excel file here
                    </p>
                    <p className="text-[11px] text-[#8E8E93] mt-1">
                      Supports .csv and .xlsx (Max 5 MB & 1,000 data rows)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#8E8E93] pt-2">
                  <span>Need help with headers?</span>
                  <a
                    href="/api/import-template"
                    download
                    className="text-[#0A84FF] hover:underline flex items-center gap-1 font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    Download template CSV
                  </a>
                </div>
              </div>
            )}

            {/* STEP 2: Column Mapping */}
            {importStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">
                    Map file columns to QuillKeep fields ({headers.length} columns found)
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setImportStep(1)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Re-upload
                  </Button>
                </div>

                <div className="max-h-56 overflow-y-auto border border-white/10 rounded-xl divide-y divide-white/5 bg-[#18181B]">
                  {headers.map((h, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-4">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-white truncate">{h}</span>
                        <span className="text-[10px] text-[#8E8E93] truncate">
                          Sample: {previewRows[0]?.[idx] || '(empty)'}
                        </span>
                      </div>

                      <select
                        value={columnMapping[idx] || 'ignore'}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [idx]: e.target.value })}
                        className="bg-[#1C1C1E] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#0A84FF]"
                      >
                        <option value="ignore">-- Ignore column --</option>
                        {targetFieldOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button size="sm" onClick={handleProceedToResolution}>
                    Next: Resolve Values <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Resolve Values */}
            {importStep === 3 && (
              <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">
                    Resolve unmatched option values & assignees
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setImportStep(2)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                </div>

                {/* Default Assignee choice */}
                <div className="p-3 rounded-xl bg-[#18181B] border border-white/10 flex flex-col gap-2">
                  <label className="text-xs font-medium text-white">
                    Assign blank assignee rows to:
                  </label>
                  <div className="flex items-center gap-4 text-xs text-[#E4E4E7]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="blankAssignee"
                        value="unassigned"
                        checked={blankAssigneeChoice === 'unassigned'}
                        onChange={() => setBlankAssigneeChoice('unassigned')}
                        className="accent-[#0A84FF]"
                      />
                      <span>Unassigned (default)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="blankAssignee"
                        value="me"
                        checked={blankAssigneeChoice === 'me'}
                        onChange={() => setBlankAssigneeChoice('me')}
                        className="accent-[#0A84FF]"
                      />
                      <span>Me (current user)</span>
                    </label>
                  </div>
                </div>

                {/* Unmatched Industries */}
                {unmatchedIndustries.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#18181B] border border-white/10">
                    <span className="text-xs font-semibold text-[#FF9F0A]">
                      Unmatched Industries ({unmatchedIndustries.length})
                    </span>
                    {unmatchedIndustries.map((u) => (
                      <div key={u.value} className="flex items-center justify-between text-xs text-[#E4E4E7]">
                        <span>{u.value} ({u.count} rows)</span>
                        <select
                          value={resolvedIndustries[u.value] || ''}
                          onChange={(e) => setResolvedIndustries({ ...resolvedIndustries, [u.value]: e.target.value })}
                          className="bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="">Leave empty</option>
                          {industries.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unmatched States */}
                {unmatchedStates.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#18181B] border border-white/10">
                    <span className="text-xs font-semibold text-[#FF9F0A]">
                      Unmatched States ({unmatchedStates.length})
                    </span>
                    {unmatchedStates.map((u) => (
                      <div key={u.value} className="flex items-center justify-between text-xs text-[#E4E4E7]">
                        <span>{u.value} ({u.count} rows)</span>
                        <select
                          value={resolvedStates[u.value] || ''}
                          onChange={(e) => setResolvedStates({ ...resolvedStates, [u.value]: e.target.value })}
                          className="bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="">Leave empty</option>
                          {states.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unmatched Profiles */}
                {unmatchedProfiles.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#18181B] border border-white/10">
                    <span className="text-xs font-semibold text-[#FF9F0A]">
                      Unmatched Owners ({unmatchedProfiles.length})
                    </span>
                    {unmatchedProfiles.map((u) => (
                      <div key={u.value} className="flex items-center justify-between text-xs text-[#E4E4E7]">
                        <span>{u.value} ({u.count} rows)</span>
                        <select
                          value={resolvedProfiles[u.value] || ''}
                          onChange={(e) => setResolvedProfiles({ ...resolvedProfiles, [u.value]: e.target.value })}
                          className="bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="">Leave empty</option>
                          {activeProfiles.map((p) => (
                            <option key={p.id} value={p.id}>{p.fullName || p.email}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button size="sm" onClick={handleProceedToReview} isLoading={isReviewing}>
                    Next: Review Validation <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {importStep === 4 && (
              <div className="flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-between text-xs text-white">
                  <span>
                    <strong className="text-[#30D158]">{preparedRows.length}</strong> will be imported,{' '}
                    <strong className="text-[#FF453A]">{skipCount}</strong> skipped,{' '}
                    <strong className="text-[#FF9F0A]">{warningCount}</strong> warnings
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setImportStep(3)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                </div>

                {problemRows.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl divide-y divide-white/5 bg-[#18181B]">
                    {problemRows.map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {p.type === 'skip' ? (
                            <XCircle className="w-4 h-4 text-[#FF453A] shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#FF9F0A] shrink-0" />
                          )}
                          <span className="font-medium text-white truncate">
                            Row {p.rowNumber}: {p.companyName}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8E8E93] truncate">{p.reason}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleStartImport} disabled={preparedRows.length === 0}>
                    Start Import ({preparedRows.length} Companies)
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: Progress & Final Report */}
            {importStep === 5 && (
              <div className="flex flex-col gap-5 py-4">
                {isImporting ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <RefreshCw className="w-8 h-8 text-[#0A84FF] animate-spin" />
                    <span className="text-sm font-semibold text-white">Importing companies...</span>
                    <div className="w-full bg-[#18181B] rounded-full h-2.5 overflow-hidden max-w-xs mt-2">
                      <div
                        className="bg-[#0A84FF] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8E8E93]">{importProgress}% completed</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs text-white">
                      <CheckCircle2 className="w-6 h-6 text-[#30D158] shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">Import completed successfully!</span>
                        <span className="text-[#8E8E93] mt-0.5">
                          {importedCount} imported, {skipCount} skipped, {failedCount} failed.
                        </span>
                      </div>
                    </div>

                    {(skipCount > 0 || failedCount > 0) && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-white/10 text-xs text-[#8E8E93]">
                        <span>Download a detailed report of skipped and failed rows</span>
                        <Button size="sm" variant="ghost" onClick={handleDownloadReport}>
                          <Download className="w-4 h-4 mr-1 text-[#0A84FF]" /> Download Report
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button size="sm" onClick={onClose}>
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* EXPORT TAB */
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                Format
              </label>
              <SegmentedControl
                options={[
                  { value: 'csv', label: 'CSV (.csv)' },
                  { value: 'xlsx', label: 'Excel (.xlsx)' },
                ]}
                value={exportFormat}
                onChange={(v) => setExportFormat(v as any)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                Export Scope
              </label>
              <SegmentedControl
                options={[
                  { value: 'current', label: 'Current Search & Filters' },
                  ...(selectedCompanyIds.length > 0
                    ? [{ value: 'selected', label: `Selected (${selectedCompanyIds.length})` }]
                    : []),
                  { value: 'all_active', label: 'All Active Companies' },
                ]}
                value={exportScope}
                onChange={(v) => setExportScope(v as any)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-white/10 text-xs text-white">
              <span>Include archived companies</span>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isExporting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleExecuteExport} isLoading={isExporting}>
                <Download className="w-4 h-4 mr-1.5" /> Download Export
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
