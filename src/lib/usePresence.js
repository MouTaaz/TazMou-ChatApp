import { useEffect, useRef } from "react";
import supabase from "./Supabase.js";
import useSessionStore from "./useStore.js";

let presenceChannel = null;

export const usePresence = () => {
  const profile = useSessionStore((state) => state.profile);
  // NEW: Use a ref to store the profile ID that's active when the hook *sets up*
  const currentProfileIdRef = useRef(profile?.id);

  useEffect(() => {
    // Update the ref whenever the profile.id changes.
    // This ensures currentProfileIdRef always holds the last valid profile.id
    // even if `profile` from Zustand turns null during cleanup.
    currentProfileIdRef.current = profile?.id;

    if (!profile?.id) {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
        presenceChannel = null;
      }
      return;
    }

    if (presenceChannel) {
      presenceChannel.unsubscribe();
      presenceChannel = null;
    }

    const channel = supabase.channel("online-status", {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    presenceChannel = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUserIds = {};
      for (const userId in state) {
        if (state[userId].length > 0) {
          onlineUserIds[userId] = true;
        }
      }
      useSessionStore.setState({ onlineUsers: onlineUserIds });
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      // Supabase's `key` in the leave event *is* the `profile.id` you tracked.
      const leftUserId = key;

      console.log(
        `[usePresence] User ${leftUserId} left presence. Updating last_seen in DB.`
      );

      if (leftUserId) {
        useSessionStore.getState().updateLastSeen(leftUserId);
      }

      // Note: The `onlineUsers` state is updated by the `sync` event handler,
      // and also cleaned up in the `return` function of this useEffect,
      // so no direct `setOnlineUsers` call is needed here for a leave event.
    });

    channel.subscribe(async (status) => {
      console.log(
        `[usePresence] Channel status: ${status} for profile ID: ${profile?.id}`
      ); // ADD THIS LINE
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          username: profile.username,
        });
        if (profile?.id) {
          useSessionStore.getState().updateLastSeen(profile.id);
          console.log(
            `[usePresence] User ${profile.id} subscribed. Updating last_seen.`
          );
        }
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          "[usePresence] Supabase Presence Channel Error:",
          channel.error()
        );
      }
    });

    return () => {
      // Use the ref here, which holds the profile.id even if Zustand's `profile` is now null
      if (currentProfileIdRef.current) {
        useSessionStore.getState().updateLastSeen(currentProfileIdRef.current);
        console.log(
          `User ${currentProfileIdRef.current} unmounting. Updating last_seen.`
        );
      }

      if (presenceChannel) {
        presenceChannel.unsubscribe();
        presenceChannel = null;
      }
      useSessionStore.setState((state) => {
        const newOnlineUsers = { ...state.onlineUsers };
        if (currentProfileIdRef.current) {
          // Also use the ref here for cleanup
          delete newOnlineUsers[currentProfileIdRef.current];
        }
        return { onlineUsers: newOnlineUsers };
      });
    };
  }, [profile?.id]); // Keep profile?.id as dependency to re-run effect when profile changes
};
