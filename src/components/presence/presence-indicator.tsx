'use client';

import * as React from 'react';
import { usePresence } from '@/components/presence/presence-context';
import { Avatar } from '@/components/ui/avatar';

export const PresenceIndicator: React.FC = () => {
  const presence = usePresence();

  if (!presence || !presence.otherUsers || presence.otherUsers.length === 0) {
    return null;
  }

  const { otherUsers } = presence;

  const editors = otherUsers.filter((u) => u.editing);
  const isAnyoneEditing = editors.length > 0;

  let text = '';
  let activeUser = otherUsers[0];

  if (isAnyoneEditing) {
    activeUser = editors[0];
    const firstName = activeUser.name.split(' ')[0];
    if (editors.length === 1) {
      text = `${firstName} is editing`;
    } else {
      text = `${editors.length} teammates are editing`;
    }
  } else {
    if (otherUsers.length === 1) {
      const firstName = otherUsers[0].name.split(' ')[0];
      text = `${firstName} is viewing this page`;
    } else if (otherUsers.length === 2) {
      const first1 = otherUsers[0].name.split(' ')[0];
      const first2 = otherUsers[1].name.split(' ')[0];
      text = `${first1} and ${first2} are viewing this page`;
    } else {
      text = `${otherUsers.length} teammates are viewing this page`;
    }
  }

  return (
    <div className="flex items-center gap-2 bg-[#1C1C1F] border border-white/10 px-3 py-1.5 rounded-full shadow-sm text-xs transition-colors">
      <div className="relative flex items-center justify-center">
        <span
          className={`w-2 h-2 rounded-full animate-ping absolute ${
            isAnyoneEditing ? 'bg-[#FF9F0A]' : 'bg-[#30D158]'
          }`}
        />
        <span
          className={`w-2 h-2 rounded-full relative ${
            isAnyoneEditing ? 'bg-[#FF9F0A]' : 'bg-[#30D158]'
          }`}
        />
      </div>

      <Avatar name={activeUser.name} size="sm" />

      <span className="text-white font-medium">{text}</span>
    </div>
  );
};
