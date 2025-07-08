import { useEffect, useState } from "react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "./lib/Supabase.js";

// Components
import Login from "./components/Login/Login.jsx";
import List from "./components/list/List.jsx";
import Chat from "./components/chat/Chat.jsx";
import Detail from "./components/detail/Detail.jsx";
import Notification from "./components/Notification/Notification.jsx";
import SettingsPanel from "./components/list/userinfo/SettingsPanel/SettingsPanel.jsx";

import SkeletonLoader from "./lib/skeleton/SkeletonLoader.jsx";
// Zustand Store
import useSessionStore from "./lib/useStore.js";
import { usePresence } from "./lib/usePresence.js";

const App = () => {
  const {
    session,
    checkSession,
    subscribeToAuthChanges,
    isLoading,
    activeChatRoomId,
    showDetail,
    subscribeToMessages,
    subscribeToProfiles,
    subscribeToChatRooms,
    showSettingsPanel,
    messages,
  } = useSessionStore();

  usePresence();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 900;

  console.log("windowWidth:", windowWidth);

  console.log(
    "LocalStorage auth data:",
    localStorage.getItem("sb-tmmzsynqzqktzdpszdfb-auth-token")
  );

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        await checkSession(); // Let the store handle everything
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, [checkSession]);

  useEffect(() => {
    const subscription = subscribeToAuthChanges();
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      console.log("window.addEventListener");
    };
    window.addEventListener("resize", handleResize);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, [subscribeToAuthChanges]);

  useEffect(() => {
    if (!session) {
      console.log("No session, skipping message subscription.");
      return;
    }
    console.log("Attempting to subscribe to messages...");
    const messageSubscription = subscribeToMessages();
    return () => {
      if (messageSubscription?.unsubscribe) {
        console.log("Unsubscribing from messages.");
        messageSubscription.unsubscribe();
      }
    };
  }, [session, subscribeToMessages]);

  useEffect(() => {
    if (!session) return;
    const profilesSubscription = subscribeToProfiles();
    const chatRoomSub = subscribeToChatRooms();

    return () => {
      if (profilesSubscription?.unsubscribe) profilesSubscription.unsubscribe();
      if (chatRoomSub?.unsubscribe) chatRoomSub.unsubscribe();
    };
  }, [session, subscribeToChatRooms]);

  if (isLoading) {
    console.log("Attempting to render SkeletonLoader");
    return (
      <SkeletonLoader
        isMobile={isMobile}
        showDetail={showDetail}
        showSettingsPanel={showSettingsPanel}
        activeChatRoomId={activeChatRoomId}
      />
    );
  }

  return (
    <div className="container">
      {session ? (
        <>
          {isMobile ? (
            <div className="mobile-layout">
              {!activeChatRoomId && !showSettingsPanel && <List />}
              {/* Hide List if settings open */}
              {activeChatRoomId && !showDetail && !showSettingsPanel && (
                <Chat backButton={isMobile} />
              )}
              {/*Hide Chat if settings open */}
              {showDetail && !showSettingsPanel && (
                <Detail backButton={isMobile} />
              )}
              {/*Hide Detail if settings open */}
              {showSettingsPanel && <SettingsPanel />}
              {/*Conditionally render SettingsPanel */}
            </div>
          ) : (
            <div className="desktop-layout">
              <List /> {/*List is always visible */}
              <Chat /> {/*Chat is always visible */}
              {showDetail && <Detail />}
              {/*Detail as overlay on desktop */}
              {showSettingsPanel && <SettingsPanel />}
              {/*SettingsPanel as overlay on desktop */}
            </div>
          )}
        </>
      ) : (
        <Login
          className="login"
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
        />
      )}
      <Notification />
    </div>
  );
};

export default App;
