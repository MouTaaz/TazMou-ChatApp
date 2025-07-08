// AddUser.jsx (SMART JAVASCRIPT APPROACH)

import { useState, useEffect, useMemo } from "react"; // Added useMemo
import { toast } from "react-toastify";
import supabase from "../../../../lib/Supabase.js";
import "./addUser.css";
import useSessionStore from "../../../../lib/useStore.js";

const AddUser = ({ onClose }) => {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null); // This will hold the filtered users to display
  const [searchStatus, setSearchStatus] = useState("idle");

  // Destructure profile and chatRooms from the Zustand store
  const { profile, chatRooms } = useSessionStore();

  let toastId = null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".addUser")) handleCancel();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleCancel();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const usersInExistingChatsSet = useMemo(() => {
    if (!profile || !chatRooms) return new Set();

    const currentUserId = profile.id;
    const existingChattingUsers = new Set();
    chatRooms.forEach((room) => {
      room.user_ids.forEach((userId) => {
        if (userId !== currentUserId) {
          existingChattingUsers.add(userId);
        }
      });
    });
    return existingChattingUsers;
  }, [profile, chatRooms]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username.");
      return;
    }

    if (!profile?.id) {
      // Ensure current user is logged in
      toast.error("Current user profile not loaded. Please log in.");
      return;
    }

    if (!toastId) toastId = toast.loading("Searching...");
    setSearchStatus("loading");

    try {
      // Fetch all profiles matching the username
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `%${username.trim()}%`);

      if (error) {
        toast.update(toastId, {
          render: "Search error occurred: " + error.message,
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
        setSearchStatus("error");
        return;
      }

      // --- EFFICIENT CLIENT-SIDE FILTERING ---
      const currentUserId = profile.id;
      const filteredData = data.filter(
        (foundUser) =>
          foundUser.id !== currentUserId && // Exclude self
          !usersInExistingChatsSet.has(foundUser.id) // Use the memoized set for efficient lookup
      );
      // --- END EFFICIENT CLIENT-SIDE FILTERING ---

      if (filteredData.length > 0) {
        setUser(filteredData);
        setSearchStatus("found");
        toast.update(toastId, {
          render: `Found ${filteredData.length} new user(s).`,
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        setUser(null);
        setSearchStatus("not_found");
        toast.update(toastId, {
          render: `No new users found with username "${username}".`,
          type: "info",
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (err) {
      console.error("Unexpected search error:", err);
      toast.update(toastId, {
        render: "An unexpected error occurred during search.",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setSearchStatus("error");
    }
  };

  const handleAdd = async (foundUserToAdd) => {
    if (!foundUserToAdd) {
      toast.error("No user selected.");
      return;
    }

    const userId = profile.id;
    const receiverId = foundUserToAdd.id;

    // Failsafe check (still good to have, as the search result might become stale
    // if a chat is created elsewhere just before this add operation).
    const { data: existingRoom } = await supabase
      .from("chatRooms")
      .select("*")
      .contains("user_ids", [userId, receiverId])
      .maybeSingle();

    if (existingRoom) {
      toast.info(`Chat with ${foundUserToAdd.username} already exists.`);
      onClose();
      return;
    }

    const { error: insertError } = await supabase.from("chatRooms").insert([
      {
        user_ids: [userId, receiverId],
      },
    ]);

    if (insertError) {
      toast.error("Error creating chat room: " + insertError.message);
      return;
    }

    const { fetchChatRooms } = useSessionStore.getState();
    await fetchChatRooms(userId); // This will update chatRooms in the store, which will re-memoize usersInExistingChatsSet on next render

    toast.success(`Chat with ${foundUserToAdd.username} created.`);
    onClose();
  };

  const handleCancel = () => {
    toast.dismiss(toastId);
    setUsername("");
    setUser(null);
    setSearchStatus("idle");
    onClose();
  };

  const handleInputChange = (e) => {
    setUsername(e.target.value);
    setSearchStatus("idle");
    setUser(null);
  };

  return (
    <div className="addUserWrapper">
      <div className="addUser">
        <button className="close" onClick={handleCancel}>
          x
        </button>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={handleInputChange}
          />
          <button type="submit">Search</button>
        </form>

        {searchStatus === "loading" && <p>Loading...</p>}

        {searchStatus === "found" && user && user.length > 0 && (
          <div className="user-list">
            {user.map((foundUser) => (
              <div className="user" key={foundUser.id}>
                <div className="user-info">
                  <img
                    src={foundUser.avatar_url || "./avatar.png"}
                    alt="User Avatar"
                  />
                  <div className="user-details">
                    <span>{foundUser.username}</span>
                    <span>{foundUser.email}</span>
                  </div>
                </div>

                <button onClick={() => handleAdd(foundUser)}>Add User</button>
              </div>
            ))}
          </div>
        )}

        {(searchStatus === "not_found" ||
          (searchStatus === "found" && user && user.length === 0)) && (
          <p className="noUserFound">
            No new users found with username "{username}"
          </p>
        )}

        {searchStatus === "error" && (
          <p className="error">Something went wrong during search.</p>
        )}
      </div>
    </div>
  );
};

export default AddUser;
