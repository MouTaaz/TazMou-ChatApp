const getChatDisplayProps = (room, currentUserProfile, allProfilesMap) => {
  const currentUserId = currentUserProfile?.id;
  if (!currentUserId || !room || !allProfilesMap) {
    return {
      isSelfChat: false,
      chatName: "Loading...",
      chatAvatar: "./default-avatar.png",
      otherUser: null,
    };
  }

  // A self-chat is where both user_ids are the current user's ID
  const isSelfChat =
    room.user_ids.length === 2 &&
    room.user_ids[0] === room.user_ids[1] &&
    room.user_ids[0] === currentUserId;

  let chatName;
  let chatAvatar;
  let otherUser = null;

  if (isSelfChat) {
    // If it's a self-chat
    chatName = "Notes to Self";
    chatAvatar = currentUserProfile.avatar_url || "./default-avatar.png";
  } else {
    //  1:1 or group chat

    const otherUserIdInRoom = room.user_ids.find((id) => id !== currentUserId);

    otherUser = allProfilesMap[otherUserIdInRoom];

    chatName = otherUser?.username || "Unknown User";
    chatAvatar = otherUser?.avatar_url || "./default-avatar.png";
  }

  return { isSelfChat, chatName, chatAvatar, otherUser };
};

export { getChatDisplayProps };
