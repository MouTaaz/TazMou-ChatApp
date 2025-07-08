import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const SkeletonUserinfo = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      backgroundColor: "#213227",
      borderRadius: "16px",
      marginBottom: "8px",
    }}
    className="skeleton-userinfo"
  >
    <Skeleton circle width={40} height={40} />
    <div
      style={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <Skeleton width={100} height={20} />
      <Skeleton width={150} height={15} />
    </div>
  </div>
);

const SkeletonChatList = () => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    className="skeleton-chatlist"
  >
    {Array(3)
      .fill()
      .map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px",
            backgroundColor: "rgba(33, 39, 37, 0.7)",
            borderRadius: "16px 16px 16px 2px",
          }}
          className="skeleton-chat-item"
        >
          <Skeleton circle width={40} height={40} />
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Skeleton width={80} height={20} />
            <Skeleton width={120} height={15} />
          </div>
          <Skeleton width={20} height={20} />
        </div>
      ))}
  </div>
);

const SkeletonChat = () => (
  <div
    style={{
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      width: "100%",
      minHeight: 0,
    }}
    className="skeleton-chat"
  >
    {Array(2)
      .fill()
      .map((_, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            flexDirection: idx % 2 === 0 ? "row" : "row-reverse",
            marginLeft: idx % 2 === 0 ? 0 : "auto",
          }}
          className={`skeleton-message${idx % 2 ? " own" : ""}`}
        >
          <Skeleton circle width={32} height={32} />
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Skeleton width={150} height={20} />
            <Skeleton width={60} height={15} />
          </div>
        </div>
      ))}
  </div>
);

const SkeletonDetail = () => (
  <div
    style={{
      background: "#213227",
      borderRadius: "16px",
      padding: "24px",
      margin: "16px",
      minWidth: 220,
      minHeight: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    }}
    className="skeleton-detail"
  >
    <Skeleton circle width={80} height={80} />
    <Skeleton width={120} height={24} />
    <Skeleton width={180} height={16} />
    <Skeleton width={100} height={16} />
    <Skeleton width={160} height={16} />
  </div>
);

const SkeletonSettingsPanel = () => (
  <div
    style={{
      background: "#213227",
      borderRadius: "16px",
      padding: "24px",
      margin: "16px",
      minWidth: 220,
      minHeight: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    }}
    className="skeleton-settings"
  >
    <Skeleton width={120} height={24} />
    <Skeleton width={180} height={16} />
    <Skeleton width={100} height={16} />
    <Skeleton width={160} height={16} />
  </div>
);

const SkeletonLoader = ({
  isMobile,
  showDetail = false,
  showSettingsPanel = false,
  activeChatRoomId = null,
}) => {
  // MOBILE: Only one section visible at a time
  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: "#1A252F",
          padding: "16px",
          gap: "16px",
          height: "100vh",
          boxSizing: "border-box",
          width: "100vw",
        }}
        className="skeleton-mobile"
      >
        {showSettingsPanel ? (
          <SkeletonSettingsPanel />
        ) : showDetail ? (
          <SkeletonDetail />
        ) : activeChatRoomId ? (
          <SkeletonChat />
        ) : (
          <>
            <SkeletonUserinfo />
            <SkeletonChatList />
          </>
        )}
      </div>
    );
  }

  // DESKTOP: All columns visible, overlays for detail/settings
  return (
    <div
      style={{
        backgroundColor: "#1A252F",
        padding: "16px",
        gap: "16px",
        height: "100vh",
        boxSizing: "border-box",
        width: "100vw",
        display: "flex",
        flexDirection: "row",
      }}
      className="skeleton-web"
    >
      <div style={{ width: "30%", minWidth: 220 }}>
        <SkeletonUserinfo />
        <SkeletonChatList />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SkeletonChat />
      </div>
      {(showDetail || showSettingsPanel) && (
        <div
          style={{
            width: 320,
            minWidth: 220,
            maxWidth: 400,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showSettingsPanel ? <SkeletonSettingsPanel /> : <SkeletonDetail />}
        </div>
      )}
    </div>
  );
};

export default SkeletonLoader;
