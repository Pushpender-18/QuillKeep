'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  previewDeleteArchivedCompaniesAction,
  deleteArchivedCompaniesAction,
  DeletePreviewData,
} from '@/app/actions/bulk-companies';
import { Trash2, AlertTriangle, Download, Loader2 } from 'lucide-react';

export interface DeleteArchivedCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  ids: string[];
  singleCompanyName?: string;
  onSuccess: (deletedCount: number, skippedCount: number) => void;
  onError: (errorMsg: string) => void;
  onExportFirst?: () => void;
}

export const DeleteArchivedCompaniesModal: React.FC<DeleteArchivedCompaniesModalProps> = ({
  isOpen,
  onClose,
  ids,
  singleCompanyName,
  onSuccess,
  onError,
  onExportFirst,
}) => {
  const [confirmInput, setConfirmInput] = React.useState('');
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<DeletePreviewData | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load preview data when modal opens
  React.useEffect(() => {
    if (!isOpen || ids.length === 0) {
      setConfirmInput('');
      setPreview(null);
      setErrorMessage(null);
      setIsDeleting(false);
      return;
    }

    setConfirmInput('');
    setErrorMessage(null);
    setLoadingPreview(true);

    previewDeleteArchivedCompaniesAction(ids)
      .then((res) => {
        if (res.ok && res.data) {
          setPreview(res.data);
        } else {
          setErrorMessage(!res.ok ? res.message : 'Failed to load preview');
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || 'Failed to load preview');
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [isOpen, ids]);

  // Focus input when modal opens and preview is ready
  React.useEffect(() => {
    if (isOpen && !loadingPreview) {
      // Small timeout to ensure DOM focus after animation/mount
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, loadingPreview]);

  if (!isOpen) return null;

  const isSingle = ids.length === 1;
  const targetName = singleCompanyName || (preview?.companyNames[0] ?? '');
  const requiredConfirmText = isSingle ? targetName.trim() : 'DELETE';
  const isConfirmValid = confirmInput.trim() === requiredConfirmText;

  const handleExportClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onExportFirst) {
      onExportFirst();
      return;
    }
    // Direct export fallback
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      params.set('exportScope', 'selected');
      params.set('includeArchived', 'true');
      params.set('selectedIds', ids.join(','));

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Export download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.download = `archived-companies-export-${today}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to download export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmValid || isDeleting || loadingPreview) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    const res = await deleteArchivedCompaniesAction(ids, confirmInput.trim());
    setIsDeleting(false);

    if (res.ok) {
      onSuccess(res.data.deletedCount, res.data.skippedCount);
      onClose();
    } else {
      setErrorMessage(res.message);
      onError(res.message);
    }
  };

  const modalTitle = isSingle
    ? `Delete ${targetName || 'company'} permanently?`
    : `Delete ${preview?.totalCount ?? ids.length} companies permanently?`;

  const remainingMoreCount = preview
    ? Math.max(0, preview.totalCount - preview.companyNames.length)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleDeleteSubmit} className="flex flex-col gap-4 text-left">
        {/* Header with Danger Icon */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] shrink-0 shadow-sm mt-0.5">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight break-words">
              {modalTitle}
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
              This permanently removes the {isSingle ? 'company' : 'companies'} and everything
              linked to {isSingle ? 'it' : 'them'}. This cannot be undone.
            </p>
          </div>
        </div>

        {/* Error notice if action failed */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Loading state for preview */}
        {loadingPreview ? (
          <div className="flex items-center justify-center py-6 text-[#8E8E93] text-xs gap-2 bg-[#1C1C1E]/50 rounded-xl border border-white/5">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF453A]" />
            <span>Calculating affected records...</span>
          </div>
        ) : (
          preview && (
            <div className="flex flex-col gap-3">
              {/* Linked counts breakdown */}
              <div className="p-3 rounded-xl bg-[#1C1C1E] border border-white/[0.08] text-xs text-[#E4E4E7]">
                <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                  Linked records to be deleted:
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2 py-1 rounded-md bg-white/[0.06] text-white">
                    {preview.contactsCount} contacts
                  </span>
                  <span className="px-2 py-1 rounded-md bg-white/[0.06] text-white">
                    {preview.remarksCount} remarks
                  </span>
                  <span className="px-2 py-1 rounded-md bg-white/[0.06] text-white">
                    {preview.remindersCount} reminders
                  </span>
                  <span className="px-2 py-1 rounded-md bg-white/[0.06] text-white">
                    {preview.historyCount} history entries
                  </span>
                </div>
              </div>

              {/* Bulk company names preview (scrollable list of first 10 + remaining) */}
              {!isSingle && preview.companyNames.length > 0 && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1C1C1E]/70 border border-white/[0.08] text-xs">
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Companies ({preview.totalCount}):
                  </span>
                  <div className="max-h-28 overflow-y-auto pr-1 flex flex-col gap-1 text-[#E4E4E7]">
                    {preview.companyNames.map((name, i) => (
                      <div key={i} className="truncate text-xs py-0.5 border-b border-white/[0.04] last:border-0">
                        • {name}
                      </div>
                    ))}
                    {remainingMoreCount > 0 && (
                      <div className="text-[#8E8E93] text-xs pt-1 italic font-sans">
                        and {remainingMoreCount} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warning row */}
              <div className="p-2.5 rounded-xl bg-[#FF9F0A]/10 border border-[#FF9F0A]/25 text-[#FF9F0A] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF9F0A]" />
                <span className="leading-snug">
                  Past activity from {isSingle ? 'this company' : 'these companies'} will also disappear from dashboard totals.
                </span>
              </div>

              {/* Export first link */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={handleExportClick}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 text-xs text-[#0A84FF] hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Exporting...' : 'Export first'}</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* Confirmation Text Field */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-xs text-[#8E8E93]">
            Type <strong className="text-white font-mono select-all font-semibold">{requiredConfirmText}</strong> to confirm:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isDeleting || loadingPreview}
            placeholder={requiredConfirmText}
            autoComplete="off"
            spellCheck="false"
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#52525B] outline-none focus:border-[#FF453A] transition-colors"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs text-[#8E8E93] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="danger"
            disabled={!isConfirmValid || isDeleting || loadingPreview}
            isLoading={isDeleting}
            className="text-xs bg-[#FF453A] hover:bg-[#D73A31] focus:ring-[#FF453A]/40 text-white font-medium"
          >
            Delete permanently
          </Button>
        </div>
      </form>
    </Modal>
  );
};
