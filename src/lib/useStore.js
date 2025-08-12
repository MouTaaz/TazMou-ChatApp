import { create } from "zustand";
import supabase from "./Supabase.js";
import { toast } from "react-toastify";

let messagesChannel = null;
let profilesChannel = null;

const useSessionStore = create((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  chatRooms: [],
  activeChatRoomId: null,
  addedUser: null,
  profiles: {},
  showDetail: false,
  BackToList: false,
  searchQuery: "",
  messages: [],
  onlineUsers: {},
  showSettingsPanel: false,
  cachedMessagesPerRoom: {},

  checkSession: async () => {
    set({ isLoading: true });

    try {
      const cachedSessionString = localStorage.getItem(
        "sb-tmmzsynqzqktzdpszdfb-auth-token"
      );

      const cachedSession = cachedSessionString
        ? JSON.parse(cachedSessionString)
        : null;

      if (cachedSession?.user?.id) {
        const { expires_at } = cachedSession;
        const now = Math.floor(Date.now() / 1000);

        if (expires_at && now > expires_at) {
          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error("❌ Refresh session error:", error);
            set({ session: null });
            return null;
          }

          set({ session: data.session });
          await get().initializeUserData(data.session.user.id);
          return data.session;
        }

        set({ session: cachedSession });
        await get().initializeUserData(cachedSession.user.id);
        return cachedSession;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        console.warn("⚠️ No session found or error occurred");
        set({ session: null });
        return null;
      }
      set({ session });
      await get().initializeUserData(session.user.id);
      return session;
    } catch (err) {
      console.error("❗Unexpected error in checkSession:", err);
      set({ session: null });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToAuthChanges: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentState = get();
      if (["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)) {
        if (session && currentState?.session?.user?.id !== session?.user?.id) {
          set({ session, isLoading: true });
          if (session?.user?.id)
            await currentState.initializeUserData(session.user.id);
          set({ isLoading: false });
        }
        if (event === "TOKEN_REFRESHED") {
          // Unsubscribe and re-subscribe to all channels
          if (currentState?.subscribeToMessages) {
            currentState.subscribeToMessages();
          }
          if (currentState?.subscribeToProfiles) {
            currentState.subscribeToProfiles();
          }
          if (currentState?.subscribeToChatRooms) {
            currentState.subscribeToChatRooms();
          }
        }
      } else if (event === "SIGNED_OUT") {
        set({
          session: null,
          profile: null,
          chatRooms: [],
          activeChatRoomId: null,
          messages: [],
          cachedMessagesPerRoom: {},
        });
      }
    });
    return subscription;
  },

  subscribeToMessages: () => {
    if (messagesChannel && messagesChannel.state === "joined") {
      supabase.removeChannel(messagesChannel);
      messagesChannel = null;
    }

    messagesChannel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload) => {
          const { activeChatRoomId, profile } = get();
          const newMessage = payload.new;

          if (payload.eventType === "INSERT" && newMessage) {
            set((state) => {
              // 1. Update chatRooms (last message, unseen count) for the affected room
              const updatedChatRooms = state.chatRooms.map((room) => {
                if (room.id === newMessage.room_id) {
                  const isSenderCurrentUser =
                    newMessage.sender_id === profile?.id;
                  let lastMessageContent = "";
                  if (newMessage.message) {
                    lastMessageContent = newMessage.message;
                  } else if (newMessage.media_url) {
                    switch (newMessage.type) {
                      case "audio":
                        lastMessageContent = "[Voice Message]";
                        break;
                      case "image":
                        lastMessageContent = "[Image]";
                        break;
                      case "video":
                        lastMessageContent = "[Video]";
                        break;
                      case "file":
                        lastMessageContent = "[File]";
                        break;
                      default:
                        lastMessageContent = "[Non-text message]";
                    }
                  }

                  return {
                    ...room,
                    lastMessage: lastMessageContent,
                    lastMessageTime: newMessage.created_at,
                    lastMessageSenderId: newMessage.sender_id,
                    lastMessageSeen: newMessage.seen,
                    unseenCount:
                      !isSenderCurrentUser && !newMessage.seen
                        ? (room.unseenCount || 0) + 1
                        : room.unseenCount,
                  };
                }
                return room;
              });

              const sortedChatRooms = updatedChatRooms.sort((a, b) => {
                const dateA = new Date(a.lastMessageTime || 0).getTime();
                const dateB = new Date(b.lastMessageTime || 0).getTime();
                return dateB - dateA; // Descending order (latest first)
              });

              const currentRoomCache =
                state.cachedMessagesPerRoom[newMessage.room_id] || [];
              const isAlreadyInCache = currentRoomCache.some(
                (msg) => msg.id === newMessage.id
              );

              let updatedCachedMessagesForRoomState = {
                ...state.cachedMessagesPerRoom,
              };

              if (!isAlreadyInCache) {
                updatedCachedMessagesForRoomState[newMessage.room_id] = [
                  ...currentRoomCache,
                  newMessage,
                ].sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                );
              }

              const newMessagesForActiveRoom =
                newMessage.room_id === activeChatRoomId && !isAlreadyInCache
                  ? updatedCachedMessagesForRoomState[activeChatRoomId]
                  : state.messages;

              return {
                chatRooms: sortedChatRooms,
                cachedMessagesPerRoom: updatedCachedMessagesForRoomState,
                messages: newMessagesForActiveRoom,
              };
            });
          }

          if (payload.eventType === "UPDATE" && newMessage) {
            set((state) => {
              const updatedCachedMessagesForRoomState = {
                ...state.cachedMessagesPerRoom,
              };

              if (updatedCachedMessagesForRoomState[newMessage.room_id]) {
                updatedCachedMessagesForRoomState[newMessage.room_id] =
                  updatedCachedMessagesForRoomState[newMessage.room_id].map(
                    (msg) =>
                      msg.id === newMessage.id ? { ...msg, ...newMessage } : msg
                  );
              }

              const updatedChatRoomsForUpdate = state.chatRooms.map((room) => {
                if (room.id === newMessage.room_id) {
                  if (
                    room.lastMessageSenderId === newMessage.sender_id &&
                    room.lastMessageTime === newMessage.created_at
                  ) {
                    return {
                      ...room,
                      lastMessageSeen: newMessage.seen,
                      x,
                    };
                  }
                }
                return room;
              });

              const sortedChatRoomsOnUpdate = updatedChatRoomsForUpdate.sort(
                (a, b) => {
                  const dateA = new Date(a.lastMessageTime || 0).getTime();
                  const dateB = new Date(b.lastMessageTime || 0).getTime();
                  return dateB - dateA;
                }
              );

              const newMessagesForActiveRoom =
                newMessage.room_id === activeChatRoomId
                  ? updatedCachedMessagesForRoomState[activeChatRoomId]
                  : state.messages;

              return {
                messages: newMessagesForActiveRoom,
                cachedMessagesPerRoom: updatedCachedMessagesForRoomState,
                chatRooms: sortedChatRoomsOnUpdate,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (messagesChannel && messagesChannel.state === "joined") {
        supabase.removeChannel(messagesChannel);
        messagesChannel = null;
      }
    };
  },
  subscribeToProfiles: () => {
    if (profilesChannel) {
      return () => {
        supabase.removeChannel(profilesChannel);
        profilesChannel = null;
      };
    }
    profilesChannel = supabase
      .channel("public:profiles_updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updatedProfileData = payload.new;
          set((state) => ({
            profiles: {
              ...state.profiles,
              [updatedProfileData.id]: {
                ...state.profiles[updatedProfileData.id],
                ...updatedProfileData,
              },
            },
          }));
        }
      )
      .subscribe();
    return () => {
      if (profilesChannel) {
        supabase.removeChannel(profilesChannel);
        profilesChannel = null;
      }
    };
  },

  fetchProfiles: async (otherUserIds) => {
    if (!otherUserIds.length || !get().profile) return;
    const cachedProfiles = get().profiles;
    const uncachedUserIds = otherUserIds.filter((id) => !cachedProfiles[id]);

    if (uncachedUserIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, last_seen, email")
        .in("id", uncachedUserIds);
      if (error) {
        toast.error("Profile fetch error: " + error.message);
        return;
      }
      set((state) => ({
        profiles: {
          ...state.profiles,
          ...Object.fromEntries(profiles.map((p) => [p.id, p])),
        },
      }));
    }
  },

  fetchMessagesForRoom: async (roomId) => {
    try {
      const { cachedMessagesPerRoom } = get();
      const existingMessages = cachedMessagesPerRoom[roomId] || [];

      let query = supabase.from("messages").select("*").eq("room_id", roomId);

      if (existingMessages.length > 0) {
        const latestCachedMessageTime = existingMessages.reduce(
          (maxDate, msg) =>
            new Date(msg.created_at) > new Date(maxDate)
              ? msg.created_at
              : maxDate,
          new Date(0).toISOString()
        );
        query = query.gt("created_at", latestCachedMessageTime);
      } else {
        query = query.order("created_at", { ascending: false }).limit(50);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Error fetching messages: " + error.message);
        return;
      }

      let fetchedMessages = data || [];

      if (existingMessages.length === 0 && fetchedMessages.length > 0) {
        fetchedMessages = fetchedMessages.reverse();
      }

      const newMessagesToAdd = fetchedMessages.filter(
        (fetchedMsg) =>
          !existingMessages.some((cachedMsg) => cachedMsg.id === fetchedMsg.id)
      );

      const finalMessagesForRoom = [
        ...existingMessages,
        ...newMessagesToAdd,
      ].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      set((state) => ({
        cachedMessagesPerRoom: {
          ...state.cachedMessagesPerRoom,
          [roomId]: finalMessagesForRoom, // Update the cache
        },
        // Update the `messages` array ONLY if this is the active room.
        // `messages` is now directly derived from the (updated) `cachedMessagesPerRoom`.
        messages:
          state.activeChatRoomId === roomId
            ? finalMessagesForRoom
            : state.messages,
      }));
    } catch (err) {
      toast.error("Unexpected error fetching messages: " + err.message);
    }
  },

  // Fetch chat rooms and compute unseenCount for each room
  fetchChatRooms: async (userId) => {
    try {
      const { data: chatRooms, error: chatRoomsError } = await supabase
        .from("chatRooms")
        .select("*")
        .contains("user_ids", [userId]);
      if (chatRoomsError) throw chatRoomsError;

      const otherUserIds = [
        ...new Set(
          chatRooms
            .flatMap((room) => room.user_ids)
            .filter((id) => id !== userId)
        ),
      ];
      await get().fetchProfiles(otherUserIds);

      const updatedRooms = await Promise.all(
        chatRooms.map(async (room) => {
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("message, media_url, type, created_at, seen, sender_id")
            .eq("room_id", room.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unseenCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)
            .eq("seen", false)
            .neq("sender_id", userId);

          let lastMessageContent = "";
          if (lastMessage?.message) {
            lastMessageContent = lastMessage.message;
          } else if (lastMessage?.media_url) {
            if (lastMessage.type === "audio") {
              lastMessageContent = "[Voice Message]";
            } else if (lastMessage.type === "image") {
              lastMessageContent = "[Image]";
            } else if (lastMessage.type === "video") {
              lastMessageContent = "[Video]";
            } else if (lastMessage.type === "file") {
              lastMessageContent = "[File]";
            }
          }

          return {
            ...room,
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessage?.created_at || room.created_at,
            lastMessageSeen: lastMessage?.seen,
            lastMessageSenderId: lastMessage?.sender_id,
            unseenCount: unseenCount || 0,
          };
        })
      );

      updatedRooms.sort((a, b) => {
        return (
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
        );
      });

      set({ chatRooms: updatedRooms });
    } catch (err) {
      set({ chatRooms: [] });
    }
  },

  // MODIFIED: sendMessage
  sendMessage: async ({
    roomId,
    senderId,
    message = "",
    file = null,
    media_url = null,
    type = "text",
    media_metadata = null,
  }) => {
    try {
      let finalMediaUrl = media_url;
      let finalMediaMetadata = media_metadata;
      let finalType = type;

      if (file && !finalMediaUrl) {
        const fileType = file.type.split("/")[0];
        finalType =
          fileType === "audio"
            ? "audio"
            : fileType === "image"
            ? "image"
            : fileType === "video"
            ? "video"
            : "file";
        const fileExtension = file.name.split(".").pop();
        const fileName = `${roomId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-media")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("chat-media")
          .getPublicUrl(fileName);
        finalMediaUrl = urlData.publicUrl;
        finalMediaMetadata = {
          type: file.type,
          size: file.size,
          extension: fileExtension,
          name: file.name,
        };
      }

      // 1. Insert message to database
      const { data: insertedMessages, error: messageInsertError } =
        await supabase
          .from("messages")
          .insert({
            room_id: roomId,
            sender_id: senderId,
            type: finalType,
            message: message,
            media_url: finalMediaUrl,
            media_metadata: finalMediaMetadata,
            seen: false,
          })
          .select(); // Ensure you select the data back

      if (messageInsertError) throw messageInsertError;

      // 2. Update chat room metadata
      await supabase
        .from("chatRooms")
        .update({
          last_message:
            message ||
            (finalMediaUrl
              ? finalType === "audio"
                ? "[Voice Message]"
                : finalType === "image"
                ? "[Image]"
                : finalType === "video"
                ? "[Video]"
                : "[File]"
              : ""),
          last_message_time: new Date().toISOString(),
        })
        .eq("id", roomId);

      // 3. Immediately update the chatRooms state in Zustand for the sender's UI
      set((state) => ({
        chatRooms: state.chatRooms.map((room) =>
          room.id === roomId
            ? {
                ...room,
                lastMessage:
                  message ||
                  (finalMediaUrl
                    ? finalType === "audio"
                      ? "[Voice Message]"
                      : finalType === "image"
                      ? "[Image]"
                      : finalType === "video"
                      ? "[Video]"
                      : "[File]"
                    : ""),
                lastMessageTime: insertedMessages[0].created_at, // Use created_at from the new message
                lastMessageSenderId: senderId,
                unseenCount: 0,
                lastMessageSeen: true,
              }
            : room
        ),
      }));
    } catch (err) {
      toast.error("Error sending message: " + err.message);
    }
  },

  setActiveChatRoomId: (roomId) => {
    set((state) => ({
      activeChatRoomId: roomId,
      // CRITICAL: Immediately show cached messages for the room
      messages: roomId ? state.cachedMessagesPerRoom[roomId] || [] : [],
    }));
    // Then, fetch any newer messages (or the initial batch if cache was empty)
    roomId ? get().fetchMessagesForRoom(roomId) : null;
  },

  setAddedUser: (user) => set({ addedUser: user }),
  toggleShowDetail: () => set((state) => ({ showDetail: !state.showDetail })),
  toggleBackToList: () => {
    set((value) => ({ BackToList: value.BackToList === false ? true : false }));
  },

  subscribeToChatRooms: () => {
    if (
      supabase
        .getChannels()
        .some((channel) => channel.topic === "public:chatRooms")
    ) {
      supabase.removeChannel(supabase.channel("public:chatRooms"));
    }
    const subscription = supabase
      .channel("public:chatRooms")
      .on("INSERT", async (payload) => {
        const userId = get().profile?.id;
        if (userId && payload.new.user_ids.includes(userId)) {
          await get().fetchChatRooms(userId);
        }
      })
      .on("UPDATE", async (payload) => {
        const updatedRoomRaw = payload.new;
        const updatedRoom = {
          ...updatedRoomRaw,
          lastMessage: updatedRoomRaw.last_message || "",
          lastMessageTime:
            updatedRoomRaw.last_message_time || updatedRoomRaw.created_at,
        };
        set((state) => ({
          chatRooms: state.chatRooms.map((room) =>
            room.id === updatedRoom.id ? updatedRoom : room
          ),
        }));
        const userId = get().profile?.id;
        if (userId) await get().fetchChatRooms(userId);
      })
      .on("DELETE", async (payload) => {
        set((state) => ({
          chatRooms: state.chatRooms.filter(
            (room) => room.id !== payload.old.id
          ),
        }));
        if (get().activeChatRoomId === payload.old.id) {
          set({ activeChatRoomId: null });
        }
      })
      .subscribe();
    return subscription;
  },

  initializeUserData: async (userId) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profileError) {
        set({ profile: null });
        return;
      }
      set({ profile });
      // 1. Wait for chat rooms to finish fetching and state to update
      await get().fetchChatRooms(userId);

      // 2. Only now access the freshly updated chatRooms
      // const chatRooms = get().chatRooms;
      // if (chatRooms && chatRooms.length > 0) {
      //   const recentRoom = chatRooms[0]; // Top of the list (most recent!)
      //   // 3. Now, and ONLY NOW, fetch the messages for that room
      //   await get().fetchMessagesForRoom(recentRoom.id); // Wait for fetch to finish!
      //   set({
      //     activeChatRoomId: recentRoom.id,
      //     messages: get().cachedMessagesPerRoom[recentRoom.id] || [],
      //   });
      // } else {
      //   set({ activeChatRoomId: null, messages: [] });
      // }
    } catch (err) {
      set({ profile: null, chatRooms: [] });
      console.error("Error initializing user data:", err);
    }
  },

  markMessagesAsSeen: async (roomId, userId) => {
    try {
      const { data: unseenMessages, error } = await supabase
        .from("messages")
        .select("id")
        .eq("room_id", roomId)
        .eq("seen", false)
        .neq("sender_id", userId);
      if (error) {
        toast.error("Error fetching unseen messages: " + error.message);
        return;
      }

      const messageIdsToUpdate = unseenMessages.map((msg) => msg.id);
      if (messageIdsToUpdate.length === 0) return;

      const { error: updateError } = await supabase
        .from("messages")
        .update({ seen: true })
        .in("id", messageIdsToUpdate);
      if (updateError) {
        toast.error("Failed to mark messages as seen: " + updateError.message);
        return;
      }

      // Reset unseenCount for this room in state and update 'seen' status in cache
      set((state) => {
        const updatedChatRooms = state.chatRooms.map((room) =>
          room.id === roomId ? { ...room, unseenCount: 0 } : room
        );

        const updatedCachedMessagesForRoomState = {
          ...state.cachedMessagesPerRoom,
        };
        if (updatedCachedMessagesForRoomState[roomId]) {
          updatedCachedMessagesForRoomState[roomId] =
            updatedCachedMessagesForRoomState[roomId].map((msg) =>
              messageIdsToUpdate.includes(msg.id) ? { ...msg, seen: true } : msg
            );
        }

        // Update the `messages` array if this is the active room, directly from the updated cache.
        const newMessagesForActiveRoom =
          state.activeChatRoomId === roomId
            ? updatedCachedMessagesForRoomState[roomId]
            : state.messages;

        return {
          chatRooms: updatedChatRooms,
          cachedMessagesPerRoom: updatedCachedMessagesForRoomState,
          messages: newMessagesForActiveRoom, // UI reflects 'seen' immediately
        };
      });
    } catch (err) {
      toast.error("Error marking messages as seen: " + err.message);
    }
  },

  updateLastSeen: async (userIdToUpdate = null) => {
    const currentProfileId = userIdToUpdate || get().profile?.id;
    if (!currentProfileId) {
      return;
    }
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("profiles")
        .update({ last_seen: timestamp })
        .eq("id", currentProfileId);
    } catch (err) {
      console.error("Error updating last_seen:", err.message);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearchQuery: () => set({ searchQuery: "" }),

  getFilteredChatRooms: () => {
    const { chatRooms, searchQuery, profiles, profile } = get();
    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim())
      return chatRooms;

    return chatRooms.filter((room) => {
      const otherUserId = room.user_ids.find((id) => id !== profile?.id);
      if (!otherUserId) return false;
      const otherUserProfile = profiles[otherUserId];
      if (!otherUserProfile || typeof otherUserProfile.username !== "string")
        return false;
      return otherUserProfile.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  },

  getOrCreateChatRoom: async (userId1, userId2) => {
    const userIds = [userId1, userId2].sort();
    const { data: existingRooms, error } = await supabase
      .from("chatRooms")
      .select("*")
      .contains("user_ids", userIds);
    if (error) return null;
    if (existingRooms.length > 0) return existingRooms[0];

    const { data: newRoom, error: createError } = await supabase
      .from("chatRooms")
      .insert([
        {
          user_ids: userIds,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();
    if (createError) return null;
    return newRoom;
  },

  toggleSettingsPanel: () =>
    set((state) => ({ showSettingsPanel: !state.showSettingsPanel })),

  logout: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      profile: null,
      chatRooms: [],
      activeChatRoomId: null,
      messages: [],
      addedUser: null,
      profiles: {},
      showDetail: false,
      BackToList: false,
      searchQuery: "",
      cachedMessagesPerRoom: {},
    });
  },

  updateOrInsertProfile: async ({ id, username, email, avatarFile }) => {
    let avatarUrl = "";
    try {
      if (avatarFile) {
        const fileName = `avatars/${id}/${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatarsbucket")
          .upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData, error: urlError } = supabase.storage
          .from("avatarsbucket")
          .getPublicUrl(fileName);
        if (urlError) throw urlError;
        avatarUrl = publicUrlData.publicUrl;
      }

      const updates = {
        id,
        username,
        email,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert([updates], { onConflict: "id" });
      if (error) throw error;

      set((state) => ({
        profile: { ...state.profile, ...updates },
      }));
      toast.success("Profile saved!");
      return { success: true, avatarUrl };
    } catch (err) {
      toast.error("Profile save failed: " + err.message);
      return { success: false, error: err };
    }
  },
}));

export default useSessionStore;
