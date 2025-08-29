import { useEffect, useRef } from "react";
import supabase from "./Supabase.js";
import useSessionStore from "./useStore.js";

export const usePresence = () => {
  const profile = useSessionStore((state) => state.profile);
 
  const currentProfileIdRef = useRef(profile?.id);
 
  const channelRef = useRef(null);

  useEffect(() => {
    currentProfileIdRef.current = profile?.id;

  
    if (!profile?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // remove previous channel if present
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel("online-status", {
      config: { presence: { key: profile.id } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUserIds = {};
      for (const userId in state) {
        if (state[userId].length > 0) onlineUserIds[userId] = true;
      }
      useSessionStore.setState({ onlineUsers: onlineUserIds });
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      const leftUserId = key;
      if (leftUserId) useSessionStore.getState().updateLastSeen(leftUserId);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          username: profile.username,
        });
        if (profile?.id) useSessionStore.getState().updateLastSeen(profile.id);
      } else if (status === "CHANNEL_ERROR") {
        console.error("[usePresence] Supabase Presence Channel Error:", channel.error());
      }
    });

    return () => {
     
      if (currentProfileIdRef.current) {
        useSessionStore.getState().updateLastSeen(currentProfileIdRef.current);
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      useSessionStore.setState((state) => {
        const newOnlineUsers = { ...state.onlineUsers };
        if (currentProfileIdRef.current) delete newOnlineUsers[currentProfileIdRef.current];
        return { onlineUsers: newOnlineUsers };
      });
    };
  }, [profile?.id]);
};
