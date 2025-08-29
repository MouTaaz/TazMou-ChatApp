import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import useSessionStore from "../../lib/useStore.js";
import { formatTime, formatDate } from "../Utile/Formats.js";
import AutoResizingTextarea from "../Utile/AutoResizingTextarea.jsx";
import { CircleArrowLeft } from "lucide-react";
import supabase from "../../lib/Supabase.js";

import { FiFile, FiCamera, FiX, FiPaperclip, FiSend } from "react-icons/fi";
import { getChatDisplayProps } from "../Utile/chatHelpers.js";

import { toast } from "react-toastify";

const Chat = ({ backButton }) => {
  const [openEmoji, setOpenEmoji] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraImage, setCameraImage] = useState(null);
  // Hold preview object URLs so we can revoke them to avoid memory leaks
  const selectedFilePreviewRef = useRef(null);
  const cameraImagePreviewRef = useRef(null);

  const {
    activeChatRoomId,
    chatRooms,
    profile,
    profiles,
    toggleShowDetail,
    setActiveChatRoomId,
    messages,
    markMessagesAsSeen,
    sendMessage,
    onlineUsers,
  } = useSessionStore();

  const activeChatRoom = useMemo(() => {
    return chatRooms.find((room) => room.id === activeChatRoomId);
  }, [activeChatRoomId, chatRooms]);

  const { isSelfChat, chatName, chatAvatar, otherUser } = useMemo(() => {
    if (!activeChatRoom || !profile || !profiles) {
      return {
        isSelfChat: false,
        chatName: "Loading...",
        chatAvatar: "./default-avatar.png",
        otherUser: null,
      };
    }

    return getChatDisplayProps(activeChatRoom, profile, profiles);
  }, [activeChatRoom, profile, profiles]);

  const displayOtherUserStatus = useMemo(() => {
    if (isSelfChat) return "Active";
    if (!otherUser?.id) return "Loading...";

    const isOtherUserOnline = onlineUsers[otherUser.id];

    if (isOtherUserOnline) {
      return "Online";
    } else {
      if (otherUser.last_seen) {
        const lastSeenDate = new Date(otherUser.last_seen);
        return `Last seen at ${lastSeenDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      return "Offline";
    }
  }, [isSelfChat, otherUser, onlineUsers]);

  const fetchMessages = useCallback(async () => {
    if (activeChatRoomId && profile?.id && activeChatRoom) {
      try {
        await markMessagesAsSeen(activeChatRoom.id, profile.id);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    }
  }, [activeChatRoomId, profile?.id, markMessagesAsSeen]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    // Fix mobile viewport height
    const setRealHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty("--real-height", `${window.innerHeight}px`);
    };

    setRealHeight();
    window.addEventListener("resize", setRealHeight);

    return () => window.removeEventListener("resize", setRealHeight);
  }, []);

  useEffect(() => {
    if (profile?.id && activeChatRoomId) {
      useSessionStore.getState().updateLastSeen(profile.id);
      console.log(
        `Active chatroom changed. Updating last_seen for ${profile.id}.`
      );
    }
  }, [activeChatRoomId, profile?.id]);

  useEffect(() => {
    const scrollToBottom = () => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [messages]);

  // --- AUDIO RECORDING LOGIC ---
  const startRecording = () => {
    if (!activeChatRoom?.id || !profile?.id) {
      toast.error("Cannot record without an active chat or user profile.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const fileName = `${activeChatRoom.id}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("chat-media")
            .upload(fileName, audioBlob);
          if (uploadError) {
            console.error("Audio upload failed:", uploadError.message);
            toast.error("Audio upload failed: " + uploadError.message);
            return;
          }
          const { data: urlData, error: urlError } = supabase.storage
            .from("chat-media")
            .getPublicUrl(fileName);
          if (urlError || !urlData?.publicUrl) {
            console.error("Failed to get audio URL:", urlError?.message);
            toast.error("Failed to get audio URL: " + urlError?.message);
            return;
          }
          await sendMessage({
            roomId: activeChatRoom.id,
            senderId: profile.id,
            media_url: urlData.publicUrl,
            type: "audio",
            media_metadata: { format: "webm", duration: audioBlob.duration },
          });
          setIsRecording(false);
        };
        mediaRecorder.start();
        setIsRecording(true);
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
        toast.error("Failed to access microphone. Please check permissions.");
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const startCamera = async () => {
    if (!activeChatRoom?.id || !profile?.id) {
      toast.error(
        "Cannot start camera without an active chat or user profile."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      canvasRef.current.toBlob(
        (blob) => {
          const file = new File([blob], `photo_${Date.now()}.png`, {
            type: "image/png",
          });
          setCameraImage(file);
        },
        "image/png",
        0.9
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setCameraImage(null);
    }
  };

  const uploadCapturedImage = async () => {
    if (!cameraImage || !activeChatRoom?.id || !profile?.id) {
      toast.error("No image to send or missing chat/profile info.");
      return;
    }
    await sendMessage({
      roomId: activeChatRoom.id,
      senderId: profile.id,
      file: cameraImage,
    });
    stopCamera();
  };
  // --- END CAMERA LOGIC ---

  // --- ATTACHMENT LOGIC ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      event.target.value = "";
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile || !activeChatRoom?.id || !profile?.id) {
      toast.error("No file to send or missing chat/profile info.");
      return;
    }
    await sendMessage({
      roomId: activeChatRoom.id,
      senderId: profile.id,
      file: selectedFile,
    });
    setSelectedFile(null);
  };
  // --- END ATTACHMENT LOGIC ---

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    if (!activeChatRoom?.id || !profile?.id) {
      toast.error(
        "Cannot send message without an active chat or user profile."
      );
      return;
    }

    await sendMessage({
      roomId: activeChatRoom.id,
      senderId: profile.id,
      message: messageText.trim(),
      type: "text",
      media_url: null,
    });
    setMessageText("");
  };

  const handleEmojiSelect = (e) => {
    setMessageText((prev) => prev + e.emoji);
    setOpenEmoji(false);
  };

  const showChatInputIcons =
    !messageText.trim() && !selectedFile && !cameraStream && !cameraImage;

  if (!activeChatRoom) {
    return (
      <div className="chat noChatSelected">
        <h2>No Chat Selected</h2>
        <p>Please select a chat room from the chat list to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="top">
        {backButton && (
          <CircleArrowLeft
            size={30}
            color="#ffffff"
            className="arrow-toggle"
            onClick={() => {
              useSessionStore.getState().toggleBackToList();
              setActiveChatRoomId(null);
            }}
          />
        )}
        <div
          className="user"
          onClick={(e) => {
            e.stopPropagation();
            toggleShowDetail();
          }}
        >
          <img src={chatAvatar} alt={chatName} />
          <div className="userInfo">
            <span className="userName">{chatName}</span>
            <span className="userStatus">{displayOtherUserStatus}</span>
          </div>
        </div>
        <div className="icons">
          <>
            <img src="./phone.png" alt="Phone" />
            <img src="./info.png" alt="Info" />
            <img src="./video.png" alt="Video" />
            <span className="shared-tooltip">
              <span className="marquee-text">Coming Soon Features</span>
            </span>
          </>
        </div>
      </div>
      <div className="center">
        {messages.map((chat, index) => {
          const isOwnMessage = chat.sender_id === profile.id;
          const currentDate = formatDate(chat.created_at);
          const previousDate =
            index > 0 ? formatDate(messages[index - 1].created_at) : null;
          const isNewDate = currentDate !== previousDate;

          const senderAvatar = isOwnMessage
            ? profile?.avatar_url || "./default-avatar.png"
            : otherUser?.avatar_url || "./default-avatar.png";

          return (
            <div key={chat.id && index}>
              {isNewDate && (
                <div className="dateSeparator">
                  <span>{currentDate}</span>
                </div>
              )}
              <div className={`message ${isOwnMessage ? "own" : ""}`}>
                <div className="avatar">
                  <img
                    src={senderAvatar}
                    alt="Avatar"
                    className={!isOwnMessage ? "DetailAvatar" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOwnMessage) {
                        toggleShowDetail();
                      }
                    }}
                  />
                  {!isOwnMessage && (
                    <p className="showProfile-note">Show profile</p>
                  )}
                </div>

                <div className="text">
                  {chat.type === "audio" && chat.media_url ? (
                    <audio
                      src={chat.media_url}
                      controls
                      className="media-element"
                    />
                  ) : chat.type === "image" && chat.media_url ? (
                    <img
                      src={chat.media_url}
                      alt="sent media"
                      className="media-image"
                      onClick={() => setPreviewImage(chat.media_url)}
                    />
                  ) : chat.type === "video" && chat.media_url ? (
                    <video
                      src={chat.media_url}
                      controls
                      className="media-element"
                    />
                  ) : chat.type === "file" && chat.media_url ? (
                    <a
                      href={chat.media_url}
                      download={
                        chat.media_metadata?.name ||
                        chat.media_url.split("/").pop()
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-download-link"
                    >
                      <FiFile size={24} />
                      <span>
                        {chat.media_metadata?.name || "Download File"}
                      </span>
                      {chat.media_metadata?.size && (
                        <span className="file-size">
                          (
                          {(chat.media_metadata.size / (1024 * 1024)).toFixed(
                            2
                          )}{" "}
                          MB)
                        </span>
                      )}
                    </a>
                  ) : (
                    <p>{chat.message}</p>
                  )}
                  <div className="msgInfo">
                    <span>{formatTime(chat.created_at)}</span>
                    {chat.sender_id === profile.id && (
                      <span
                        className={`seen-status ${!chat.seen ? "unseen" : ""}`}
                      >
                        {chat.seen ? "Seen" : "Unseen"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}></div>
      </div>

      <div className="bottom">
        {(selectedFile || cameraStream || cameraImage) && (
          <div className="media-preview-area">
            {selectedFile && (
              <div className="file-preview">
                <div className="preview-content">
                  {selectedFile.type.startsWith("image/") ||
                  selectedFile.type.startsWith("video/") ? (
                    selectedFile.type.startsWith("image/") ? (
                      <img
                        src={selectedFilePreviewRef.current || URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="image-preview"
                      />
                    ) : (
                      <video
                        src={selectedFilePreviewRef.current || URL.createObjectURL(selectedFile)}
                        controls
                        className="video-preview"
                      />
                    )
                  ) : (
                    <div className="file-icon">
                      <FiFile size={24} />
                    </div>
                  )}
                  <span>{selectedFile.name}</span>
                </div>
                <button onClick={uploadSelectedFile} className="send-button">
                  <FiSend size={18} />
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="cancel-button"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}

            {cameraStream && !cameraImage && (
              <div className="camera-interface-live">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="camera-view-live"
                />
                <div className="camera-controls-live">
                  <button onClick={captureImage} className="capture-button">
                    <div className="capture-circle" />
                  </button>
                  <button onClick={stopCamera} className="close-camera">
                    <FiX size={18} />
                  </button>
                </div>
              </div>
            )}

            {cameraImage && (
              <div className="camera-image-preview">
                <img
                  src={cameraImagePreviewRef.current || URL.createObjectURL(cameraImage)}
                  alt="Captured"
                  className="captured-image"
                />
                <button
                  onClick={uploadCapturedImage}
                  className="send-capture-button"
                >
                  <FiSend size={18} />
                </button>
                <button onClick={stopCamera} className="cancel-capture-button">
                  <FiX size={18} />
                </button>
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}

        <div className="input-area-wrapper">
          <button
            className="emoji-button"
            onClick={() => setOpenEmoji(!openEmoji)}
          >
            <img src="./emoji.png" alt="Emoji" />
          </button>
          {openEmoji && (
            <div className="picker-wrapper">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          )}

          <div className="input-container">
            {/* Conditional Camera button: only show if no text, file, or camera active */}
            {showChatInputIcons && (
              <button className="camera-button" onClick={startCamera}>
                <FiCamera size={20} />
              </button>
            )}

            <AutoResizingTextarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Conditional Attachment button: only show if no text, file, or camera active */}
            {showChatInputIcons && (
              <button
                className="attach-button"
                onClick={() => fileInputRef.current.click()}
                type="button"
              >
                <FiPaperclip size={20} />
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept="*/*"
              multiple={false} // Only one file at a time
            />
          </div>

          {/* Send/Record button */}
          {messageText.trim() ? (
            <button className="sendButton" onClick={handleSendMessage}>
              <img src="./sendButton.png" alt="Send" />
            </button>
          ) : (
            <button
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className={`NotRecordingIndicator ${
                isRecording ? "recordingIndicator" : ""
              }`}
            >
              <img src="./mic.png" alt="Record" />
            </button>
          )}
        </div>
      </div>

      {previewImage && (
        <div
          className="image-preview-modal"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;
