import "./userinfo.css";
import useSessionStore from "../../../lib/useStore.js";
import { FiMenu } from "react-icons/fi";

const Userinfo = () => {
  const { profile, isLoading, toggleSettingsPanel } = useSessionStore();

  if (isLoading) return <div className="no-profileImg">Loading profile...</div>;
  if (!profile)
    return <div className="no-profileImg">No profile data available.</div>;

  return (
    <div className="userinfo">
      <div
        className="user"
        onClick={toggleSettingsPanel}
        title="View profile and settings"
        style={{ cursor: "pointer" }}
      >
        <FiMenu className="menu-icon" />
        <img
          src={profile.avatar_url || "./avatar.png"}
          alt="User Avatar"
          className="user-avatar"
        />
        <div className="user-details">
          <h2>{profile.username}</h2>
          <p>{profile.email}</p>
        </div>
      </div>
    </div>
  );
};

export default Userinfo;
