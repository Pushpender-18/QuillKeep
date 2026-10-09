'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import {
  createCustomFieldAction,
  renameCustomFieldAction,
  addCustomFieldOptionsAction,
  toggleCustomFieldActiveAction,
} from '@/app/actions/custom-fields';
import { CustomFieldDefinition } from '@/lib/custom-fields';
import { Plus, X, Tag, ChevronDown, ChevronRight, Edit2, Check, Archive, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// 1. ADD CUSTOM FIELD MODAL
// ============================================================================
interface AddCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFieldCreated?: (field: CustomFieldDefinition) => void;
}

export const AddCustomFieldModal: React.FC<AddCustomFieldModalProps> = ({
  isOpen,
  onClose,
  onFieldCreated,
}) => {
  const [name, setName] = React.useState('');
  const [fieldType, setFieldType] = React.useState<'text' | 'number' | 'date' | 'dropdown'>('text');
  const [options, setOptions] = React.useState<string[]>([]);
  const [optionInput, setOptionInput] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setFieldType('text');
      setOptions([]);
      setOptionInput('');
      setError('');
    }
  }, [isOpen]);

  const handleAddOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;

    if (options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Option "${trimmed}" already added`);
      return;
    }

    setOptions([...options, trimmed]);
    setOptionInput('');
    setError('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Field name is required');
      return;
    }

    if (fieldType === 'dropdown' && options.length === 0) {
      setError('Dropdown fields require at least one option');
      return;
    }

    setLoading(true);
    const res = await createCustomFieldAction({
      name: cleanName,
      fieldType,
      options: fieldType === 'dropdown' ? options : null,
    });
    setLoading(false);

    if (res.success && res.field) {
      if (onFieldCreated) {
        onFieldCreated(res.field);
      }
      onClose();
    } else {
      setError(res.error || 'Failed to create field');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom Field">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#8E8E93]">Field Name</label>
          <Input
            placeholder="e.g. Budget, Deal Stage, Next Step"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#8E8E93]">Field Type</label>
          <div className="grid grid-cols-4 gap-2 p-1 rounded-xl bg-[#1C1C1E] border border-white/[0.08]">
            {(['text', 'number', 'date', 'dropdown'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFieldType(t)}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-all duration-150',
                  fieldType === t
                    ? 'bg-[#0A84FF] text-white shadow-sm'
                    : 'text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#8E8E93] mt-0.5">
            Type can&apos;t be changed after creation.
          </p>
        </div>

        {fieldType === 'dropdown' && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.08]">
            <label className="text-xs font-medium text-[#8E8E93]">Dropdown Options</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type option and press Enter"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <Button type="button" variant="ghost" onClick={handleAddOption} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {options.map((opt, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2C2C2E] text-white text-xs font-medium border border-white/[0.08]"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-[#8E8E93] hover:text-[#FF453A] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Create Field
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// 2. MANAGE CUSTOM FIELDS MODAL
// ============================================================================
interface ManageCustomFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitions: CustomFieldDefinition[];
  onRefresh?: () => void;
}

export const ManageCustomFieldsModal: React.FC<ManageCustomFieldsModalProps> = ({
  isOpen,
  onClose,
  definitions,
  onRefresh,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [addingOptionId, setAddingOptionId] = React.useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = React.useState('');

  const [showRetired, setShowRetired] = React.useState(false);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const activeFields = definitions.filter((d) => d.isActive);
  const retiredFields = definitions.filter((d) => !d.isActive);

  const handleStartRename = (def: CustomFieldDefinition) => {
    setEditingId(def.id);
    setRenameValue(def.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setLoadingId(id);
    const res = await renameCustomFieldAction(id, renameValue);
    setLoadingId(null);
    setEditingId(null);

    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Field renamed successfully' });
      if (onRefresh) onRefresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to rename' });
    }
  };

  const handleAddOptionSubmit = async (id: string) => {
    if (!newOptionValue.trim()) return;
    setLoadingId(id);
    const res = await addCustomFieldOptionsAction(id, [newOptionValue.trim()]);
    setLoadingId(null);
    setAddingOptionId(null);
    setNewOptionValue('');

    if (res.success) {
      setToastMessage({ type: 'success', msg: 'Option added successfully' });
      if (onRefresh) onRefresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to add option' });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setLoadingId(id);
    const res = await toggleCustomFieldActiveAction(id, !currentActive);
    setLoadingId(null);

    if (res.success) {
      setToastMessage({
        type: 'success',
        msg: currentActive ? 'Field retired' : 'Field reactivated',
      });
      if (onRefresh) onRefresh();
    } else {
      setToastMessage({ type: 'error', msg: res.error || 'Failed to update status' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Custom Fields" className="max-w-[640px]">
      <div className="flex flex-col gap-6 pt-2 max-h-[70vh] overflow-y-auto pr-1">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.msg}
            isOpen={Boolean(toastMessage)}
            onClose={() => setToastMessage(null)}
          />
        )}

        {/* Active Custom Fields List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
              Active Fields ({activeFields.length})
            </span>
          </div>

          {activeFields.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#1C1C1E] text-center text-xs text-[#8E8E93] border border-white/[0.08]">
              No active custom fields.
            </div>
          ) : (
            <div className="flex flex-col gap-2 divide-y divide-white/[0.06] rounded-xl bg-[#1C1C1E] border border-white/[0.08] p-2">
              {activeFields.map((field) => (
                <div key={field.id} className="flex flex-col gap-2 pt-2.5 pb-2.5 first:pt-1 last:pb-1 px-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {editingId === field.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(field.id)}
                            className="p-1.5 rounded-lg bg-[#0A84FF] text-white hover:bg-[#0A84FF]/80 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-white truncate">
                            {field.name}
                          </span>
                          <button
                            onClick={() => handleStartRename(field)}
                            className="text-[#8E8E93] hover:text-white p-1 rounded transition-colors"
                            title="Rename field"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[11px] font-medium text-[#8E8E93] uppercase">
                        {field.fieldType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {field.fieldType === 'dropdown' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingOptionId(addingOptionId === field.id ? null : field.id)}
                          className="text-xs text-[#0A84FF] hover:bg-[#0A84FF]/10"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Option
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(field.id, true)}
                        isLoading={loadingId === field.id}
                        className="text-xs text-[#8E8E93] hover:text-[#FF453A] hover:bg-[#FF453A]/10"
                      >
                        <Archive className="w-3.5 h-3.5 mr-1" /> Retire
                      </Button>
                    </div>
                  </div>

                  {/* Dropdown Options List */}
                  {field.fieldType === 'dropdown' && (
                    <div className="flex flex-col gap-1.5 pl-2 pt-1 border-t border-white/[0.04]">
                      <div className="flex flex-wrap gap-1">
                        {(field.options || []).map((opt, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#2C2C2E] text-[11px] font-medium text-[#8E8E93]"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>

                      {addingOptionId === field.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            placeholder="New option name"
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOptionSubmit(field.id);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleAddOptionSubmit(field.id)}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Retired Custom Fields Section */}
        {retiredFields.length > 0 && (
          <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowRetired(!showRetired)}
              className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8E8E93] hover:text-white transition-colors"
            >
              <span>Retired Fields ({retiredFields.length})</span>
              {showRetired ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {showRetired && (
              <div className="flex flex-col gap-2 rounded-xl bg-[#1C1C1E]/60 border border-white/[0.06] p-2 divide-y divide-white/[0.04]">
                {retiredFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between py-2 px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-[#8E8E93] line-through truncate">
                        {field.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FF9F0A]/10 text-[10px] font-semibold text-[#FF9F0A]">
                        Retired
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(field.id, false)}
                      isLoading={loadingId === field.id}
                      className="text-xs text-[#30D158] hover:bg-[#30D158]/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reactivate
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
