import "./detail.css";
import useSessionStore from "../../lib/useStore.js";
import supabase from "../../lib/Supabase.js";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import useClickOutside from "../../lib/useClickOutside.js";

const Detail = ({ backButton }) => {
  const {
    activeChatRoomId,
    chatRooms,
    set,
    profiles,
    profile,
    showDetail,
    toggleShowDetail,
    messages,
  } = useSessionStore();

  const detailRef = useRef(true);
  useClickOutside(detailRef, () => toggleShowDetail());

  const [showSharedImages, setShowSharedImages] = useState(false);
  const [showSharedFiles, setShowSharedFiles] = useState(true);

  const activeChatRoom = chatRooms.find((room) => room.id === activeChatRoomId);

  const otherUserProfile = useMemo(() => {
    const otherUserID = activeChatRoom?.user_ids.find(
      (id) => id !== profile?.id
    );
    return profiles[otherUserID];
  }, []);

  const sharedImages = useMemo(
    () =>
      messages.filter(
        (msg) =>
          msg.room_id === activeChatRoomId &&
          msg.media_url &&
          (msg.type === "image" || msg.type === "video")
      ),
    [messages, activeChatRoomId]
  );

  const sharedFiles = useMemo(
    () =>
      messages.filter(
        (msg) =>
          msg.room_id === activeChatRoomId &&
          msg.media_url &&
          msg.type === "file"
      ),
    [messages, activeChatRoomId]
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null });
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  if (!activeChatRoom) {
    return (
      <div className="detailFallBack">
        <h2>No Chat Room Selected</h2>
        <p>Please select a chat room to view details.</p>
      </div>
    );
  }

  return (
    <div ref={detailRef} className="detail">
      <div className="user">
        {showDetail && backButton && (
          <ArrowLeft
            size={30}
            color="#ffffff"
            className="arrow-toggle"
            onClick={() => {
              toggleShowDetail();
            }}
          ></ArrowLeft>
        )}
        <img
          src={otherUserProfile.avatar_url || "./default-avatar.png"}
          alt="Receiver Avatar"
        />
        <h2>{otherUserProfile.username || "Unknown User"}</h2>
        <p className="email">{otherUserProfile.email || "Unknown Email"}</p>
        <p className="others-info">Hey there, I am using TazMou Chat App!</p>
      </div>
      <div className="info">
        {/* Shared Images Option */}
        <div className="option">
          <div
            className="title"
            onClick={() => setShowSharedImages(!showSharedImages)}
          >
            <span>Shared Images</span>
            <img
              src={showSharedImages ? "./arrowDown.png" : "./arrowUp.png"}
              alt="Toggle Shared Images"
            />
          </div>
          {showSharedImages && (
            <div className="media-gallery">
              {sharedImages.length === 0 && (
                <span className="empty-media">No shared images or videos.</span>
              )}
              {sharedImages.map((item) => (
                <div className="mediaItem" key={item.id}>
                  {/* Wrap image/video in an anchor tag with download attribute */}
                  <a
                    href={item.media_url}
                    download={
                      item.media_metadata?.name ||
                      item.media_url.split("/").pop()
                    } // Use filename from metadata or URL
                    target="_blank" // Open in new tab, then download
                    rel="noopener noreferrer"
                    title={`Download ${
                      item.media_metadata?.name ||
                      item.media_url.split("/").pop()
                    }`}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.media_url}
                        alt={item.media_metadata?.name || "Shared Image"} //for accessibility
                      />
                    ) : (
                      <video
                        src={item.media_url}
                        controls // Keep controls for video playback
                        alt={item.media_metadata?.name || "Shared Video"}
                      />
                    )}
                  </a>
                  <span className="mediaName">
                    {item.media_metadata?.name ||
                      item.media_url.split("/").pop()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared Files Option */}
        <div className="option">
          <div
            className="title"
            onClick={() => setShowSharedFiles(!showSharedFiles)}
          >
            <span>Shared Files</span>
            <img
              src={showSharedFiles ? "./arrowDown.png" : "./arrowUp.png"}
              alt="Toggle Shared Files"
            />
          </div>
          {showSharedFiles && (
            <div className="file-gallery">
              {sharedFiles.length === 0 && (
                <span className="empty-media">No shared files.</span>
              )}
              {sharedFiles.map((item) => (
                <div className="fileItem" key={item.id}>
                  <a
                    href={item.media_url}
                    download={
                      item.media_metadata?.name ||
                      item.media_url.split("/").pop()
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-link"
                    title={`Download ${
                      item.media_metadata?.name ||
                      item.media_url.split("/").pop()
                    }`}
                  >
                    <span className="fileName">
                      {item.media_metadata?.name ||
                        item.media_url.split("/").pop()}
                    </span>
                    {item.media_metadata?.size && (
                      <span className="fileSize">
                        ({(item.media_metadata.size / (1024 * 1024)).toFixed(2)}{" "}
                        MB)
                      </span>
                    )}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <button>Block</button>
        <button className="logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Detail;
