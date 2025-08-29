import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "./lib/Supabase.js";
import { useEffect, useState, useRef } from "react";

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

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const isMobile = windowWidth < 900;

  // single mount effect: check session, subscribe to auth changes and window resize
  useEffect(() => {
    let isMounted = true;
    let authSubscription = null;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    const initialize = async () => {
      try {
        const session = await checkSession();
        if (!isMounted) return;
        // subscribe once after initial session check
        authSubscription = subscribeToAuthChanges();
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (authSubscription) {
        // supabase onAuthStateChange returns a subscription with unsubscribe()
        if (typeof authSubscription.unsubscribe === "function")
          authSubscription.unsubscribe();
        // or the store could return a cleanup function
        else if (typeof authSubscription === "function") authSubscription();
      }
    };
  }, [checkSession, subscribeToAuthChanges]);

  useEffect(() => {
    if (!session) {     
      return;
    }
    const cleanup = subscribeToMessages();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [session, subscribeToMessages]);

  useEffect(() => {
    if (!session) return;
    const cleanupProfiles = subscribeToProfiles();
    const cleanupChatRooms = subscribeToChatRooms();
    return () => {
      if (typeof cleanupProfiles === "function") cleanupProfiles();
      if (typeof cleanupChatRooms === "function") cleanupChatRooms();
    };
  }, [session, subscribeToChatRooms]);

  if (isLoading) {
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
