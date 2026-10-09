'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/browser';

export interface PresenceUser {
  user_id: string;
  name: string;
  editing: boolean;
}

interface PresenceContextValue {
  isEditing: boolean;
  setEditing: (editing: boolean) => void;
  otherUsers: PresenceUser[];
}

const PresenceContext = React.createContext<PresenceContextValue | null>(null);

export const usePresence = () => React.useContext(PresenceContext);

export interface PresenceProviderProps {
  companyId: string;
  currentUserId: string;
  currentUserName: string;
  children: React.ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({
  companyId,
  currentUserId,
  currentUserName,
  children,
}) => {
  const [isEditing, setIsEditingState] = React.useState(false);
  const [otherUsers, setOtherUsers] = React.useState<PresenceUser[]>([]);
  const isEditingRef = React.useRef(isEditing);

  isEditingRef.current = isEditing;

  const setEditing = React.useCallback((editing: boolean) => {
    setIsEditingState(editing);
  }, []);

  React.useEffect(() => {
    if (!companyId || !currentUserId) return;

    const supabase = createClient();
    const channelName = `company:${companyId}`;
    const channel = supabase.channel(channelName);

    const syncPresenceState = () => {
      const state = channel.presenceState();
      const userMap = new Map<string, PresenceUser>();

      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p: any) => {
            if (p.user_id && p.user_id !== currentUserId) {
              const existing = userMap.get(p.user_id);
              userMap.set(p.user_id, {
                user_id: p.user_id,
                name: p.name || 'Teammate',
                editing: Boolean(existing?.editing || p.editing),
              });
            }
          });
        }
      });

      setOtherUsers(Array.from(userMap.values()));
    };

    channel
      .on('presence', { event: 'sync' }, syncPresenceState)
      .on('presence', { event: 'join' }, syncPresenceState)
      .on('presence', { event: 'leave' }, syncPresenceState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            name: currentUserName,
            editing: isEditingRef.current,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, currentUserId, currentUserName]);

  // Track state when local isEditing changes
  React.useEffect(() => {
    if (!companyId || !currentUserId) return;

    const supabase = createClient();
    const channel = supabase.channel(`company:${companyId}`);

    channel.track({
      user_id: currentUserId,
      name: currentUserName,
      editing: isEditing,
    });
  }, [isEditing, companyId, currentUserId, currentUserName]);

  return (
    <PresenceContext.Provider value={{ isEditing, setEditing, otherUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};
