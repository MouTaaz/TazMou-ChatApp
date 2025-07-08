import "./settingsPanel.css";
import useSessionStore from "../../../../lib/useStore.js";
import { toast } from "react-toastify";
import { useState, useEffect, useRef } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";

const SettingsPanel = () => {
  const { profile, toggleSettingsPanel, logout, updateOrInsertProfile } =
    useSessionStore();

  const [editingUsername, setEditingUsername] = useState(
    profile?.username || ""
  );
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatar_url || "/avatar.png"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setEditingUsername(profile?.username || "");
    setAvatarPreview(profile?.avatar_url || "/avatar.png");
  }, [profile?.username, profile?.avatar_url]);

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setEditingAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      setIsEditing(true);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSaveProfile = async () => {
    const isUsernameChanged = editingUsername.trim() !== profile.username;
    const isAvatarChanged = editingAvatar !== null;

    if (!isUsernameChanged && !isAvatarChanged) {
      setIsEditing(false);
      return;
    }

    setIsUploading(true);
    const result = await updateOrInsertProfile({
      id: profile.id,
      username: editingUsername.trim(),
      email: profile.email,
      avatarFile: editingAvatar,
    });
    setIsUploading(false);

    if (result.success) {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setEditingAvatar(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUsername(profile?.username || "");
    setEditingAvatar(null);
    setAvatarPreview(profile?.avatar_url || "/avatar.png");
    setIsEditing(false);
  };

  if (!profile) return null;

  return (
    <div className="settings-panel-overlay">
      <div className="settings-panel-content">
        <button
          aria-label="Close panel"
          className="close-btn"
          onClick={toggleSettingsPanel}
        >
          X
        </button>
        <h2>Your Profile & Settings</h2>
        <div className="profile-display">
          <div
            className="profile-picture-container"
            onClick={handleAvatarClick}
          >
            <img
              src={avatarPreview}
              alt="Profile Avatar"
              className="avatar-img"
              title="Click to change profile picture"
              style={{ cursor: "pointer" }}
            />
            <div className="overlay">
              <FontAwesomeIcon className="edit-icon" icon={faEdit} />
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleAvatarChange}
            disabled={isUploading}
          />

          {isEditing ? (
            <input
              type="text"
              value={editingUsername}
              onChange={(e) => setEditingUsername(e.target.value)}
              disabled={isUploading}
            />
          ) : (
            <>
              <p className="username-display">{profile.username}</p>
              <div className="email-tooltip-wrapper">
                <span className="user-email" tabIndex={0}>
                  {profile.email}
                </span>
                <div className="email-tooltip">
                  This is your registered email. For changes, contact support.
                </div>
              </div>
            </>
          )}

          {!isEditing && (
            <button className="edit-button" onClick={() => setIsEditing(true)}>
              Edit Username
            </button>
          )}

          {isEditing && (
            <>
              <button onClick={handleSaveProfile} disabled={isUploading}>
                {isUploading ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleCancelEdit} disabled={isUploading}>
                Cancel
              </button>
            </>
          )}

          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
