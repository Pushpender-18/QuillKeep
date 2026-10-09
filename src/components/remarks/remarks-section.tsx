'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SerializableRemark } from '@/lib/remarks';
import { createRemarkAction, updateRemarkAction, fetchMoreRemarksAction } from '@/app/actions/remarks';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime, formatAuditDateTime } from '@/lib/date-utils';
import { RemarkMentionDropdown } from '@/components/remarks/remark-mention-dropdown';
import { usePresence } from '@/components/presence/presence-context';
import { Send, Edit2, Lock, MessageSquare, CornerDownLeft, Sparkles } from 'lucide-react';

export interface RemarksSectionProps {
  companyId: string;
  isArchived: boolean;
  initialRemarks: SerializableRemark[];
  totalCount: number;
  teammates: ProfileOption[];
  currentUserId: string;
  profileNameMap: Record<string, string>;
}

export const RemarksSection: React.FC<RemarksSectionProps> = ({
  companyId,
  isArchived,
  initialRemarks,
  totalCount: initialTotalCount,
  teammates,
  currentUserId,
  profileNameMap,
}) => {
  const router = useRouter();
  const presence = usePresence();

  // Toast message
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Remarks Feed state
  const [remarks, setRemarks] = React.useState<SerializableRemark[]>(initialRemarks);
  const [totalCount, setTotalCount] = React.useState<number>(initialTotalCount);
  const [loadMoreLoading, setLoadMoreLoading] = React.useState(false);

  // Post composer state
  const [newBody, setNewBody] = React.useState('');
  const [newMentionIds, setNewMentionIds] = React.useState<string[]>([]);
  const [isPosting, setIsPosting] = React.useState(false);

  // Inline edit state
  const [editingRemarkId, setEditingRemarkId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState('');
  const [editMentionIds, setEditMentionIds] = React.useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Active mention dropdown state for post composer
  const [postMentionActive, setPostMentionActive] = React.useState(false);
  const [postMentionQuery, setPostMentionQuery] = React.useState('');
  const [postMentionIndex, setPostMentionIndex] = React.useState(0);
  const [postMentionStartPos, setPostMentionStartPos] = React.useState<number | null>(null);
  const postTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Active mention dropdown state for inline editor
  const [editMentionActive, setEditMentionActive] = React.useState(false);
  const [editMentionQuery, setEditMentionQuery] = React.useState('');
  const [editMentionIndex, setEditMentionIndex] = React.useState(0);
  const [editMentionStartPos, setEditMentionStartPos] = React.useState<number | null>(null);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Highlight hash state
  const [highlightedRemarkId, setHighlightedRemarkId] = React.useState<string | null>(null);

  // Exclude current user from teammates list for mention dropdown
  const filteredTeammates = React.useMemo(() => {
    return teammates.filter((t) => t.id !== currentUserId);
  }, [teammates, currentUserId]);

  // Sync props to state
  React.useEffect(() => {
    setRemarks(initialRemarks);
    setTotalCount(initialTotalCount);
  }, [initialRemarks, initialTotalCount]);

  // Update presence editing state
  React.useEffect(() => {
    const isEditing = newBody.trim().length > 0 || Boolean(editingRemarkId);
    if (presence?.setEditing) {
      presence.setEditing(isEditing);
    }
  }, [newBody, editingRemarkId, presence]);

  // Handle URL hash (#remark-<id>) and focus-remark-composer hotkey
  React.useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#remark-')) {
        const id = hash.replace('#remark-', '');
        setHighlightedRemarkId(id);
        const el = document.getElementById(`remark-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    const handleFocusComposer = () => {
      if (!isArchived && postTextareaRef.current) {
        postTextareaRef.current.focus();
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    window.addEventListener('focus-remark-composer', handleFocusComposer);
    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('focus-remark-composer', handleFocusComposer);
    };
  }, [remarks, isArchived]);

  // Handle mention detection in text input
  const handleTextChange = (
    text: string,
    cursorPos: number,
    setText: (val: string) => void,
    setMentionActive: (active: boolean) => void,
    setMentionQuery: (q: string) => void,
    setMentionIndex: (i: number) => void,
    setMentionStartPos: (pos: number | null) => void
  ) => {
    setText(text);

    // Look backward from cursor for '@'
    const lastAtIndex = text.lastIndexOf('@', cursorPos - 1);
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1, cursorPos);
      // Check if there are no spaces or newlines before cursor in the query
      if (!/\s/.test(textAfterAt)) {
        setMentionActive(true);
        setMentionQuery(textAfterAt);
        setMentionIndex(0);
        setMentionStartPos(lastAtIndex);
        return;
      }
    }

    setMentionActive(false);
    setMentionQuery('');
    setMentionStartPos(null);
  };

  // Insert mention into text
  const insertMention = (
    teammate: ProfileOption,
    text: string,
    startPos: number,
    setText: (val: string) => void,
    setMentionIds: React.Dispatch<React.SetStateAction<string[]>>,
    setMentionActive: (active: boolean) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
  ) => {
    const mentionTag = `@${teammate.fullName} `;
    const before = text.slice(0, startPos);
    const afterCursor = text.slice(startPos + (postMentionQuery.length || editMentionQuery.length) + 1);
    const newText = before + mentionTag + afterCursor;

    setText(newText);
    setMentionIds((prev) => Array.from(new Set([...prev, teammate.id])));
    setMentionActive(false);

    // Refocus textarea after cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = startPos + mentionTag.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  // Keyboard navigation inside textareas for mention dropdown & shortcut
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    mentionActive: boolean,
    mentionQuery: string,
    mentionIndex: number,
    setMentionIndex: React.Dispatch<React.SetStateAction<number>>,
    setMentionActive: (active: boolean) => void,
    startPos: number | null,
    text: string,
    setText: (val: string) => void,
    setMentionIds: React.Dispatch<React.SetStateAction<string[]>>,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    onSubmit: () => void
  ) => {
    // ⌘/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    if (!mentionActive) return;

    const matchingTeammates = filteredTeammates.filter(
      (t) =>
        t.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    if (matchingTeammates.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % matchingTeammates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + matchingTeammates.length) % matchingTeammates.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = matchingTeammates[mentionIndex];
      if (selected && startPos !== null) {
        insertMention(selected, text, startPos, setText, setMentionIds, setMentionActive, textareaRef);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionActive(false);
    }
  };

  // Create Remark Handler
  const handlePostRemark = async () => {
    const trimmed = newBody.trim();
    if (!trimmed || isPosting || isArchived) return;

    setIsPosting(true);
    const res = await createRemarkAction(companyId, trimmed, newMentionIds);
    setIsPosting(false);

    if (res.success) {
      setNewBody('');
      setNewMentionIds([]);
      setToast({ type: 'success', msg: 'Remark posted' });
      router.refresh();
    } else {
      setToast({ type: 'error', msg: res.error || 'Failed to post remark' });
    }
  };

  // Start Edit Remark Handler
  const handleStartEdit = (remark: SerializableRemark) => {
    setEditingRemarkId(remark.id);
    setEditBody(remark.body);
    setEditMentionIds(remark.mentions || []);
  };

  // Save Edit Remark Handler
  const handleSaveEdit = async () => {
    if (!editingRemarkId || isSavingEdit || isArchived) return;

    const trimmed = editBody.trim();
    if (!trimmed) {
      setToast({ type: 'error', msg: 'Remark content cannot be empty' });
      return;
    }

    setIsSavingEdit(true);
    const res = await updateRemarkAction(editingRemarkId, companyId, trimmed, editMentionIds);
    setIsSavingEdit(false);

    if (res.success) {
      setEditingRemarkId(null);
      setEditBody('');
      setEditMentionIds([]);
      setToast({ type: 'success', msg: 'Remark updated' });
      router.refresh();
    } else {
      setToast({ type: 'error', msg: res.error || 'Failed to update remark' });
    }
  };

  // Load More Remarks Handler
  const handleLoadMore = async () => {
    if (loadMoreLoading || remarks.length >= totalCount) return;

    setLoadMoreLoading(true);
    const res = await fetchMoreRemarksAction(companyId, remarks.length, 20);
    setLoadMoreLoading(false);

    if (res.success && res.remarks) {
      setRemarks((prev) => [...prev, ...res.remarks!]);
    }
  };

  // Text Renderer with Mentions Highlight
  const renderFormattedBody = (bodyText: string, mentionsArr: string[]) => {
    if (!mentionsArr || mentionsArr.length === 0) {
      return <span className="whitespace-pre-wrap">{bodyText}</span>;
    }

    // Build regex pattern for all mentioned full names
    const mentionedNames = mentionsArr
      .map((id) => profileNameMap[id])
      .filter(Boolean);

    if (mentionedNames.length === 0) {
      return <span className="whitespace-pre-wrap">{bodyText}</span>;
    }

    // Escape regex special chars
    const escapedNames = mentionedNames.map((name) =>
      name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    );
    const pattern = new RegExp(`(@(?:${escapedNames.join('|')}))`, 'g');

    const parts = bodyText.split(pattern);

    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('@') && mentionedNames.includes(part.slice(1))) {
            return (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30 mx-0.5"
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div className="bg-[#161618] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          isOpen={Boolean(toast)}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium text-white">Remarks & Collaboration</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/10">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
          <Lock className="w-3.5 h-3.5 text-[#8E8E93]" />
          <span>Internal team notes</span>
        </div>
      </div>

      {/* Text Composer Box */}
      {isArchived ? (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#8E8E93] flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-[#8E8E93]" />
          <span>Remarks are read-only while company is archived</span>
        </div>
      ) : (
        <div className="relative flex flex-col bg-[#121214] border border-white/10 rounded-xl p-4 shadow-inner focus-within:border-[#0A84FF] transition-colors">
          {postMentionActive && (
            <RemarkMentionDropdown
              teammates={filteredTeammates}
              filterText={postMentionQuery}
              selectedIndex={postMentionIndex}
              onSelect={(t) => {
                if (postMentionStartPos !== null) {
                  insertMention(
                    t,
                    newBody,
                    postMentionStartPos,
                    setNewBody,
                    setNewMentionIds,
                    setPostMentionActive,
                    postTextareaRef
                  );
                }
              }}
              onClose={() => setPostMentionActive(false)}
            />
          )}

          <textarea
            ref={postTextareaRef}
            rows={3}
            value={newBody}
            onChange={(e) => {
              const pos = e.target.selectionStart;
              handleTextChange(
                e.target.value,
                pos,
                setNewBody,
                setPostMentionActive,
                setPostMentionQuery,
                setPostMentionIndex,
                setPostMentionStartPos
              );
            }}
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                postMentionActive,
                postMentionQuery,
                postMentionIndex,
                setPostMentionIndex,
                setPostMentionActive,
                postMentionStartPos,
                newBody,
                setNewBody,
                setNewMentionIds,
                postTextareaRef,
                handlePostRemark
              )
            }
            placeholder="Type an update or note... use @ to mention teammates"
            className="w-full bg-transparent resize-none outline-none text-xs text-white placeholder:text-[#8E8E93] leading-relaxed"
          />

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-[#8E8E93] flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              <span>⌘/Ctrl + Enter to post</span>
            </span>

            <Button
              size="sm"
              disabled={newBody.trim().length === 0 || isPosting}
              onClick={handlePostRemark}
              className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white h-8 px-4 text-xs font-medium shrink-0 disabled:opacity-40"
            >
              <span>{isPosting ? 'Posting...' : 'Post Remark'}</span>
              <Send className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Feed Below */}
      {remarks.length === 0 ? (
        <div className="py-10 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-[#121214]">
          <MessageSquare className="w-8 h-8 text-[#8E8E93] mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-white">No remarks yet</h3>
          <p className="text-xs text-[#8E8E93] mt-1 max-w-sm">
            Post an internal remark or @mention a teammate to start collaboration.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {remarks.map((remark) => {
            const isEditingThis = editingRemarkId === remark.id;
            const isAuthor = remark.authorId === currentUserId;
            const isHighlighted = highlightedRemarkId === remark.id;

            return (
              <div
                key={remark.id}
                id={`remark-${remark.id}`}
                className={`p-4 rounded-xl transition-all flex flex-col gap-3 group border ${
                  isHighlighted
                    ? 'bg-[#0A84FF]/10 border-[#0A84FF] ring-2 ring-[#0A84FF]/40'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={remark.authorName} email={remark.authorEmail} size="sm" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{remark.authorName}</span>
                      <span
                        className="text-[11px] text-[#8E8E93]"
                        title={formatAuditDateTime(remark.createdAt)}
                      >
                        • {formatRelativeTime(remark.createdAt)}
                      </span>

                      {remark.editedAt && (
                        <span
                          className="text-[10px] text-[#8E8E93] bg-white/[0.06] px-1.5 py-0.5 rounded cursor-help"
                          title={`Edited on ${formatAuditDateTime(remark.editedAt)}`}
                        >
                          edited
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isAuthor && !isArchived && !isEditingThis && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(remark)}
                      className="p-1 rounded text-[#8E8E93] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit remark"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Body or Inline Editor */}
                {isEditingThis ? (
                  <div className="relative flex flex-col bg-[#121214] border border-[#0A84FF] rounded-xl p-3 shadow-inner">
                    {editMentionActive && (
                      <RemarkMentionDropdown
                        teammates={filteredTeammates}
                        filterText={editMentionQuery}
                        selectedIndex={editMentionIndex}
                        onSelect={(t) => {
                          if (editMentionStartPos !== null) {
                            insertMention(
                              t,
                              editBody,
                              editMentionStartPos,
                              setEditBody,
                              setEditMentionIds,
                              setEditMentionActive,
                              editTextareaRef
                            );
                          }
                        }}
                        onClose={() => setEditMentionActive(false)}
                      />
                    )}

                    <textarea
                      ref={editTextareaRef}
                      rows={3}
                      value={editBody}
                      onChange={(e) => {
                        const pos = e.target.selectionStart;
                        handleTextChange(
                          e.target.value,
                          pos,
                          setEditBody,
                          setEditMentionActive,
                          setEditMentionQuery,
                          setEditMentionIndex,
                          setEditMentionStartPos
                        );
                      }}
                      onKeyDown={(e) =>
                        handleKeyDown(
                          e,
                          editMentionActive,
                          editMentionQuery,
                          editMentionIndex,
                          setEditMentionIndex,
                          setEditMentionActive,
                          editMentionStartPos,
                          editBody,
                          setEditBody,
                          setEditMentionIds,
                          editTextareaRef,
                          handleSaveEdit
                        )
                      }
                      className="w-full bg-transparent resize-none outline-none text-xs text-white placeholder:text-[#8E8E93] leading-relaxed"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-white/[0.06]">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRemarkId(null)}
                        className="text-xs text-[#8E8E93] hover:text-white h-7 px-3"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={editBody.trim().length === 0 || isSavingEdit}
                        onClick={handleSaveEdit}
                        className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white h-7 px-3 text-xs"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#E4E4E7] pl-11">
                    {renderFormattedBody(remark.body, remark.mentions)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Button */}
          {remarks.length < totalCount && (
            <div className="flex justify-center pt-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={loadMoreLoading}
                onClick={handleLoadMore}
                className="text-xs text-[#0A84FF] hover:bg-[#0A84FF]/10 h-8 px-4"
              >
                {loadMoreLoading ? 'Loading...' : `Load more (${totalCount - remarks.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
