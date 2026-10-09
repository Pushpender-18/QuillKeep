'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload?: { reason?: string; note?: string }) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  showReasonSelect?: boolean;
  reasonOptions?: { value: string; label: string }[];
  showNoteField?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  showReasonSelect = false,
  reasonOptions = [],
  showNoteField = false,
  loading = false,
}) => {
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (reasonOptions.length > 0) {
        setReason(reasonOptions[0].value);
      } else {
        setReason('');
      }
      setNote('');
    }
  }, [isOpen, reasonOptions]);

  const handleConfirm = () => {
    onConfirm({ reason: showReasonSelect ? reason : undefined, note: showNoteField ? note : undefined });
  };

  const icons = {
    danger: <Trash2 className="w-5 h-5 text-[#FF453A]" />,
    warning: <Archive className="w-5 h-5 text-[#FF9F0A]" />,
    primary: <AlertTriangle className="w-5 h-5 text-[#0A84FF]" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] shrink-0">
            {icons[variant]}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
            {description && <p className="text-xs text-[#8E8E93] mt-0.5">{description}</p>}
          </div>
        </div>

        {showReasonSelect && reasonOptions.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Reason
            </label>
            <Select
              options={reasonOptions}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {showNoteField && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Note <span className="text-[#8E8E93]/60 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add optional context..."
              rows={2}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-3 py-2 text-sm text-white placeholder:text-[#71717A] outline-none focus:border-[#0A84FF] transition-colors resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === 'danger'
                ? 'bg-[#FF453A] hover:bg-[#FF453A]/90 text-white'
                : variant === 'warning'
                ? 'bg-[#FF9F0A] hover:bg-[#FF9F0A]/90 text-white'
                : ''
            }
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
