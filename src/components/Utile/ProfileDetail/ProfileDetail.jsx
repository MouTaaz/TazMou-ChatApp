import "./ProfileDetail.css";
import useSessionStore from "../../lib/useStore.js";
import supabase from "../../lib/Supabase.js";
import { useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import useClickOutside from "../../lib/useClickOutside.js";

const ProfileDetail = ({ backButton, ShowNestWindow }) => {
  const {
    activeChatRoomId,
    chatRooms,
    set,
    profiles,
    profile,
    showDetail,
    toggleShowDetail,
  } = useSessionStore();
  console.log(ShowNestWindow);

  const detailRef = useRef(true);

  // Close when clicking outside
  useClickOutside(detailRef, () => toggleShowDetail());

  // Find the active chat room
  const activeChatRoom = chatRooms.find((room) => room.id === activeChatRoomId);
  const otherUserProfile = useMemo(() => {
    const otherUserID = activeChatRoom?.user_ids.find(
      (id) => id !== profile?.id
    );
    return profiles[otherUserID];
  }, [activeChatRoom, profiles, profile]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null });
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  // If no chat room is selected, display a fallback message
  if (!activeChatRoom) {
    return (
      <div className="detailFallBack">
        <h2>No Chat Room Selected</h2>
        <p>Please select a chat room to view details.</p>
      </div>
    );
  }

  // Extract receiver details from the active chat room
  console.log("showDetail:", showDetail);
  console.log("isMobile:", backButton);
  return (
    <div
      ref={detailRef}
      className={`detail ${ShowNestWindow ? "showDetail" : ""}`}
    >
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
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus,
          aspernatur! Dicta consequuntur molestiae maiores pariatur vel
          asperiores doloribus soluta rem voluptates, obcaecati, quod dolores
          dolorem nemo, itaque facilis expedita ex!
        </p>
      </div>
      <div className="info">
        <div className="option">
          <div className="title">
            <span>Chat Settings</span>
            <img src="./arrowUp.png" alt="Arrow Up" />
          </div>
        </div>
        <div className="option">
          <div className="title">
            <span>Privacy &amp; Help</span>
            <img src="./arrowUp.png" alt="Arrow Up" />
          </div>
        </div>
        <div className="option">
          <div className="title">
            <span>Shared Photos</span>
            <img src="./arrowDown.png" alt="Arrow Down" />
          </div>
          <div className="photos">
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="https://media.istockphoto.com/id/1173803879/photo/computer-screens-with-program-code.jpg?s=2048x2048&w=is&k=20&c=ARHNko4ifqbS2B5X9mGGeVrdMT97IhhHUymI2XlJLJc="
                  alt="Shared Photo"
                />
                <span>photo_2025_2.png</span>
              </div>
              <img src="./download.png" alt="Download Icon" className="icon" />
            </div>
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="https://media.istockphoto.com/id/1173803879/photo/computer-screens-with-program-code.jpg?s=2048x2048&w=is&k=20&c=ARHNko4ifqbS2B5X9mGGeVrdMT97IhhHUymI2XlJLJc="
                  alt="Shared Photo"
                />
                <span>photo_2025_2.png</span>
              </div>
              <img src="./download.png" alt="Download Icon" className="icon" />
            </div>
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="https://media.istockphoto.com/id/1173803879/photo/computer-screens-with-program-code.jpg?s=2048x2048&w=is&k=20&c=ARHNko4ifqbS2B5X9mGGeVrdMT97IhhHUymI2XlJLJc="
                  alt="Shared Photo"
                />
                <span>photo_2025_2.png</span>
              </div>
              <img src="./download.png" alt="Download Icon" className="icon" />
            </div>
            <div className="photoItem">
              <div className="photoDetail">
                <img
                  src="https://media.istockphoto.com/id/1173803879/photo/computer-screens-with-program-code.jpg?s=2048x2048&w=is&k=20&c=ARHNko4ifqbS2B5X9mGGeVrdMT97IhhHUymI2XlJLJc="
                  alt="Shared Photo"
                />
                <span>photo_2025_2.png</span>
              </div>
              <img src="./download.png" alt="Download Icon" className="icon" />
            </div>
          </div>
        </div>
        <div className="option">
          <div className="title">
            <span>Shared Files</span>
            <img src="./arrowUp.png" alt="Arrow Up" />
          </div>
        </div>
        <button>Block</button>
        <button className="logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileDetail;
