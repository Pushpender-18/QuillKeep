'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, AlertCircle } from 'lucide-react';

export interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  initialData?: {
    id: string;
    name: string;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  } | null;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [isPrimary, setIsPrimary] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setJobTitle(initialData.jobTitle || '');
        setEmail(initialData.email || '');
        setPhone(initialData.phone || '');
        setIsPrimary(initialData.isPrimary || false);
      } else {
        setName('');
        setJobTitle('');
        setEmail('');
        setPhone('');
        setIsPrimary(false);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Contact name is required' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await onSubmit({
        name: name.trim(),
        jobTitle: jobTitle.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        isPrimary,
      });

      if (!res.success) {
        setErrors({ form: res.error || 'Failed to save contact' });
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrors({ form: err?.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </h2>
        </div>

        {errors.form && (
          <div className="p-3 rounded-lg bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <Input
          label="Full Name *"
          placeholder="e.g. Sarah Jenkins"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          error={errors.name}
        />

        <Input
          label="Job Title"
          placeholder="e.g. Chief Technical Officer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="sarah@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Primary Toggle */}
        <label className="flex items-center gap-3 bg-[#1C1C1E] border border-white/10 p-3 rounded-[10px] cursor-pointer hover:border-white/20 transition-colors">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              Make Primary Contact
              {isPrimary && <UserCheck className="w-3.5 h-3.5 text-[#0A84FF]" />}
            </span>
            <span className="text-[11px] text-[#8E8E93]">
              Setting this contact as primary will automatically update other contacts.
            </span>
          </div>
        </label>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
