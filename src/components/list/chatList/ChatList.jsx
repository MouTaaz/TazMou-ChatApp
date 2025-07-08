import React, { useState, useEffect, useRef } from "react";
import AddUser from "./AddUser/AddUser";
import useSessionStore from "../../../lib/useStore.js";
import SearchBar from "./SearchBar/SearchBar.jsx";
import { Flipper, Flipped } from "react-flip-toolkit"; // Import Flipper and Flipped

import "./chatList.css"; // Ensure CSS is imported

// ChatRoomItem Component - Renders individual chat room item
const ChatRoomItem = ({
  room,
  otherUserProfile,
  onSelect,
  activeChatRoomId,
  unseenCount: propUnseenCount, // Renamed to avoid conflict with internal state
}) => {
  const { profile } = useSessionStore();
  const lastMessage = room.lastMessage;
  const lastMessageTime = room.lastMessageTime;

  // State to manage highlight animation for new messages
  const [highlightClass, setHighlightClass] = useState("");
  // Ref to store previous unseenCount for animation trigger
  const prevUnseenCountRef = useRef(propUnseenCount);
  // State to manage unseenCount animation
  const [unseenCountAnimClass, setUnseenCountAnimClass] = useState("");

  // Effect for new message highlight
  useEffect(() => {
    if (room.highlight) {
      setHighlightClass("new-message-highlight");
      const timer = setTimeout(() => {
        setHighlightClass("");
      }, 1500); // Match 'pulseHighlight' animation duration in CSS
      return () => clearTimeout(timer);
    }
  }, [room.highlight]); // Trigger when room.highlight changes

  // Effect for unseenCount animations
  useEffect(() => {
    if (propUnseenCount > 0 && prevUnseenCountRef.current < propUnseenCount) {
      // New unseen messages arrived - trigger pop-in
      setUnseenCountAnimClass("unseen-count-pop-in");
      const timer = setTimeout(() => setUnseenCountAnimClass(""), 400); // Match popIn duration
      return () => clearTimeout(timer);
    } else if (propUnseenCount === 0 && prevUnseenCountRef.current > 0) {
      // All messages seen - trigger fade-out
      setUnseenCountAnimClass("unseen-count-fade-out");
      const timer = setTimeout(() => setUnseenCountAnimClass(""), 300); // Match fadeOut duration
      return () => clearTimeout(timer);
    }
    prevUnseenCountRef.current = propUnseenCount; // Update ref for next render
  }, [propUnseenCount]);

  const formattedMsgTime = lastMessageTime ? (
    <span className="msgTime">
      {new Date(lastMessageTime).toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}
    </span>
  ) : null;

  const isLastMessageFromUser = room.lastMessageSenderId === profile?.id;

  return (
    <div
      className={`item ${
        activeChatRoomId === room.id ? "active" : ""
      } ${highlightClass}`}
      onClick={() => onSelect(room.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(room.id)}
    >
      <img
        src={otherUserProfile.avatar_url || "./default-avatar.png"}
        alt={otherUserProfile.username || "Default Avatar"}
        className="avatar"
      />
      <div className="text">
        <span className="username">{otherUserProfile.username}</span>
        <span className="lastMessage">
          {(() => {
            if (!lastMessage) return "No messages yet!";
            if (typeof lastMessage === "string" && lastMessage.trim() !== "") {
              return (
                <span className="msgContent">
                  <span className="msgText">
                    {isLastMessageFromUser ? "You: " : ""}
                    {lastMessage.length > 30
                      ? lastMessage.slice(0, 14) + "..."
                      : lastMessage}
                  </span>
                  {formattedMsgTime}
                </span>
              );
            }
            if (lastMessage === "[Voice Message]") {
              return (
                <span className="msgContent">
                  <img src="./mic.png" alt="mic" className="mic" />
                  {formattedMsgTime}
                </span>
              );
            }
            // For other media types like [Image], [Video], [File]
            if (lastMessage.startsWith("[") && lastMessage.endsWith("]")) {
              return (
                <span className="msgContent">
                  <span className="msgText">{lastMessage}</span>
                  {formattedMsgTime}
                </span>
              );
            }
            return "[Non-text message]"; // Fallback for unexpected lastMessage
          })()}
        </span>
      </div>
      {propUnseenCount > 0 && (
        <span className={`unseenCount ${unseenCountAnimClass}`}>
          {propUnseenCount}
        </span>
      )}
    </div>
  );
};

// ChatList Component - Main component for displaying chat rooms
const ChatList = () => {
  const [addmode, setAddmode] = useState(false);
  const {
    profile,
    setActiveChatRoomId,
    activeChatRoomId,
    profiles,
    getFilteredChatRooms,
    markMessagesAsSeen,
  } = useSessionStore();

  const filteredRooms = getFilteredChatRooms();

  const handleSelectRoom = (roomId) => {
    if (profile?.id) {
      markMessagesAsSeen(roomId, profile.id);
    }
    setActiveChatRoomId(roomId);
  };

  const handleClose = () => setAddmode(false);

  return (
    <div className="chatList">
      {/* Search Bar and Add User Controls */}
      <div className="search">
        <SearchBar />
        <div className="add-container">
          <img
            className="add"
            src={addmode ? "./minus.png" : "./plus.png"}
            onClick={() => setAddmode(!addmode)}
            alt="Add or Remove"
          />
          <span className="hover-text">
            Add From <br /> Your Contacts
          </span>
        </div>
      </div>

      <Flipper
        flipKey={filteredRooms.map((room) => room.id).join("-")}
        spring="veryGentle"
        className="chat-room-list-container"
      >
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => {
            const otherUserId = room.user_ids.find((id) => id !== profile?.id);
            const otherUserProfile = profiles[otherUserId] || {
              username: "Unknown User",
              avatar_url: "./default-avatar.png",
            };
            return (
              // Flipped wrapper for each item, tracking by room.id
              <Flipped key={room.id} flipId={room.id}>
                <div style={{ padding: 0, margin: 0 }}>
                  <ChatRoomItem
                    room={room}
                    otherUserProfile={otherUserProfile}
                    onSelect={handleSelectRoom}
                    activeChatRoomId={activeChatRoomId}
                    unseenCount={room.unseenCount}
                  />
                </div>
              </Flipped>
            );
          })
        ) : (
          <div className="noChat">
            {useSessionStore.getState().searchQuery
              ? "No matching chats found"
              : "No chat rooms available"}
          </div>
        )}
      </Flipper>

      {/* Add User Modal */}
      {addmode && <AddUser onClose={handleClose} />}
    </div>
  );
};

export default ChatList;
