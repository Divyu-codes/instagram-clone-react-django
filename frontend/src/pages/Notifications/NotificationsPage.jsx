import { useEffect, useState } from "react";
import { authenticatedFetch } from "../../utils/auth";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

// ======================================================
// NOTIFICATION ICON
// ======================================================

function getNotificationIcon(item) {
  const type = item.notification_type;
  const message = item.message || "";

  if (type === "follow" || type === "follow_request") {
    return "👤";
  }

  if (type === "comment") {
    return "💬";
  }

  if (type === "like") {
    return "❤️";
  }

  if (
    type === "message" ||
    type === "story_reply"
  ) {
    return "💌";
  }

  if (
    type === "story" ||
    type === "story_view" ||
    type === "story_reaction"
  ) {
    if (message.includes("reacted")) {
      return "🔥";
    }

    if (message.includes("viewed")) {
      return "👁️";
    }

    return "⭕";
  }

  return "🔔";
}

// ======================================================
// NOTIFICATION LABEL
// ======================================================

function getNotificationLabel(item) {
  const type = item.notification_type;

  if (type === "follow_request") {
    return "Follow request";
  }

  if (type === "follow") {
    return "New follower";
  }

  if (type === "like") {
    return "Post liked";
  }

  if (type === "comment") {
    return "New comment";
  }

  if (
    type === "message" ||
    type === "story_reply"
  ) {
    return "Story reply";
  }

  if (
    type === "story" ||
    type === "story_view" ||
    type === "story_reaction"
  ) {
    return "Story activity";
  }

  return "Notification";
}

// ======================================================
// GET ACTOR ID
// ======================================================

function getActorId(item) {
  const value =
    item?.actor_id ??
    item?.actor?.id ??
    item?.user_id;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

// ======================================================
// NOTIFICATIONS PAGE
// ======================================================

function NotificationsPage() {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ====================================================
  // FOLLOW REQUESTS
  //
  // {
  //   user_id: request_id
  // }
  // ====================================================

  const [followRequests, setFollowRequests] =
    useState({});

  const [followRequestLoading, setFollowRequestLoading] =
    useState(null);

  // ====================================================
  // FOLLOW BACK
  // ====================================================

  const [followBackLoading, setFollowBackLoading] =
    useState(null);

  // ====================================================
  // FETCH FOLLOW REQUESTS
  // ====================================================

  const fetchFollowRequests = async () => {
    try {
      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/requests/`
        );

      if (!response.ok) {
        setFollowRequests({});
        return;
      }

      const data =
        await response.json();

      if (!Array.isArray(data)) {
        setFollowRequests({});
        return;
      }

      const requestMap = {};

      data.forEach((request) => {
        const userId =
          Number(
            request?.user_id
          );

        if (
          Number.isFinite(userId)
        ) {
          requestMap[userId] =
            request.id;
        }
      });

      setFollowRequests(requestMap);

    } catch (error) {
      console.error(
        "Follow requests loading error:",
        error
      );

      setFollowRequests({});
    }
  };

  // ====================================================
  // FETCH NOTIFICATIONS
  // ====================================================

  const fetchNotifications =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/notifications/`
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load notifications."
          );
        }

        const data =
          await response.json();

        setNotifications(
          Array.isArray(data)
            ? data
            : []
        );

        // Load pending follow requests
        await fetchFollowRequests();

        // Mark notifications as read
        await authenticatedFetch(
          `${BACKEND_HOST}/api/notifications/mark-read/`,
          {
            method: "POST",
          }
        ).catch(() => undefined);

      } catch (fetchError) {
        console.error(
          "Fetch notifications error:",
          fetchError
        );

        setError(
          "Unable to load notifications."
        );

      } finally {
        setLoading(false);
      }
    };

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ====================================================
  // ACCEPT FOLLOW REQUEST
  // ====================================================

  const handleAcceptFollowRequest =
    async (
      notification
    ) => {
      const actorId =
        getActorId(notification);

      if (!actorId) {
        return;
      }

      const requestId =
        followRequests[actorId];

      if (!requestId) {
        alert(
          "Follow request not found. Please refresh notifications."
        );
        return;
      }

      try {
        setFollowRequestLoading(
          notification.id
        );

        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/follows/requests/${requestId}/accept/`,
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            "Unable to accept follow request."
          );
        }

        // Remove request from local request map
        setFollowRequests(
          (previous) => {
            const updated = {
              ...previous,
            };

            delete updated[actorId];

            return updated;
          }
        );

        // Change notification locally
        setNotifications(
          (previous) =>
            previous.map(
              (item) => {
                if (
                  item.id !==
                  notification.id
                ) {
                  return item;
                }

                return {
                  ...item,
                  notification_type:
                    "follow",
                  message:
                    `${notification?.actor_username || "User"} started following you.`,
                  followAccepted:
                    true,
                };
              }
            )
        );

      } catch (error) {
        console.error(
          "Accept follow request error:",
          error
        );

        alert(
          error?.message ||
          "Unable to accept follow request."
        );

      } finally {
        setFollowRequestLoading(null);
      }
    };

  // ====================================================
  // DELETE / REJECT FOLLOW REQUEST
  // ====================================================

  const handleRejectFollowRequest =
    async (
      notification
    ) => {
      const actorId =
        getActorId(notification);

      if (!actorId) {
        return;
      }

      const requestId =
        followRequests[actorId];

      if (!requestId) {
        alert(
          "Follow request not found. Please refresh notifications."
        );
        return;
      }

      try {
        setFollowRequestLoading(
          notification.id
        );

        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/follows/requests/${requestId}/reject/`,
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            "Unable to reject follow request."
          );
        }

        // Remove request locally
        setFollowRequests(
          (previous) => {
            const updated = {
              ...previous,
            };

            delete updated[actorId];

            return updated;
          }
        );

        // Remove notification from UI
        setNotifications(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                notification.id
            )
        );

      } catch (error) {
        console.error(
          "Reject follow request error:",
          error
        );

        alert(
          error?.message ||
          "Unable to reject follow request."
        );

      } finally {
        setFollowRequestLoading(null);
      }
    };

  // ====================================================
  // FOLLOW BACK
  // ====================================================

  const handleFollowBack =
    async (
      notification
    ) => {
      const actorId =
        getActorId(notification);

      if (!actorId) {
        return;
      }

      try {
        setFollowBackLoading(
          notification.id
        );

        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/follows/${actorId}/`,
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            "Unable to follow back."
          );
        }

        // Update notification locally
        setNotifications(
          (previous) =>
            previous.map(
              (item) => {
                if (
                  item.id !==
                  notification.id
                ) {
                  return item;
                }

                return {
                  ...item,
                  isFollowingBack:
                    Boolean(
                      data.following
                    ),
                  followBackRequested:
                    Boolean(
                      data.requested
                    ),
                };
              }
            )
        );

      } catch (error) {
        console.error(
          "Follow back error:",
          error
        );

        alert(
          error?.message ||
          "Unable to follow back."
        );

      } finally {
        setFollowBackLoading(null);
      }
    };

  // ====================================================
  // CHECK FOLLOW BUTTON
  // ====================================================

  const shouldShowFollowBack =
    (item) => {
      if (
        item.notification_type !==
        "follow"
      ) {
        return false;
      }

      if (
        item.followAccepted
      ) {
        return true;
      }

      if (
        item.isFollowingBack
      ) {
        return false;
      }

      if (
        item.followBackRequested
      ) {
        return true;
      }

      return true;
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">

        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />

        <p className="text-sm text-gray-500">
          Loading notifications...
        </p>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">

        <div className="mb-3 text-4xl">
          ⚠️
        </div>

        <p className="text-red-500">
          {error}
        </p>

      </div>
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-6">

        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Stay updated with your activity
        </p>

      </div>

      {/* ==================================================
          EMPTY
      ================================================== */}

      {notifications.length === 0 ? (

        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">

          <div className="mb-4 text-5xl">
            🔔
          </div>

          <h2 className="font-semibold text-gray-900">
            No notifications yet
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your likes, follows, comments and story activity will appear here.
          </p>

        </div>

      ) : (

        <div className="space-y-2">

          {notifications.map(
            (item) => {

              const actorId =
                getActorId(item);

              const isFollowRequest =
                item.notification_type ===
                "follow_request";

              const isFollow =
                item.notification_type ===
                "follow";

              const requestId =
                actorId
                  ? followRequests[
                      actorId
                    ]
                  : null;

              const requestLoading =
                followRequestLoading ===
                item.id;

              const followBackLoadingThis =
                followBackLoading ===
                item.id;

              return (
                <div
                  key={item.id}
                  className={`group rounded-2xl border p-4 transition ${
                    item.is_read
                      ? "border-gray-100 bg-white"
                      : "border-blue-100 bg-blue-50/50"
                  } hover:shadow-sm`}
                >

                  {/* ==================================================
                      TOP ROW
                  ================================================== */}

                  <div className="flex items-start gap-4">

                    {/* ICON */}

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                        item.notification_type ===
                        "story"
                          ? "bg-pink-100"
                          : item.notification_type ===
                            "message"
                          ? "bg-purple-100"
                          : item.notification_type ===
                            "follow" ||
                            item.notification_type ===
                            "follow_request"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {getNotificationIcon(
                        item
                      )}
                    </div>

                    {/* CONTENT */}

                    <div className="min-w-0 flex-1">

                      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {getNotificationLabel(
                          item
                        )}
                      </div>

                      <p className="break-words text-sm leading-5 text-gray-800">
                        {item.message}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(
                          item.created_at
                        ).toLocaleString()}
                      </p>

                    </div>

                    {/* UNREAD DOT */}

                    {!item.is_read && (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                    )}

                  </div>

                  {/* ==================================================
                      FOLLOW REQUEST ACTIONS
                  ================================================== */}

                  {isFollowRequest &&
                    requestId && (
                      <div className="mt-4 flex gap-2 pl-16">

                        <button
                          type="button"
                          onClick={() =>
                            handleAcceptFollowRequest(
                              item
                            )
                          }
                          disabled={
                            requestLoading
                          }
                          className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {requestLoading
                            ? "..."
                            : "Confirm"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleRejectFollowRequest(
                              item
                            )
                          }
                          disabled={
                            requestLoading
                          }
                          className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>

                      </div>
                    )}

                  {/* ==================================================
                      FOLLOW BACK
                  ================================================== */}

                  {isFollow &&
                    shouldShowFollowBack(
                      item
                    ) &&
                    !item.isFollowingBack && (
                      <div className="mt-4 pl-16">

                        <button
                          type="button"
                          onClick={() =>
                            handleFollowBack(
                              item
                            )
                          }
                          disabled={
                            followBackLoadingThis ||
                            item.followBackRequested
                          }
                          className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {followBackLoadingThis
                            ? "..."
                            : item.followBackRequested
                            ? "Requested"
                            : "Follow back"}
                        </button>

                      </div>
                    )}

                  {/* ==================================================
                      FOLLOW BACK SUCCESS
                  ================================================== */}

                  {isFollow &&
                    item.isFollowingBack && (
                      <div className="mt-4 pl-16">

                        <span className="inline-flex rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700">
                          Following
                        </span>

                      </div>
                    )}

                </div>
              );
            }
          )}

        </div>

      )}

    </div>
  );
}

export default NotificationsPage;