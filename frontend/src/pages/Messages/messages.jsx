import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatWindow from "../../components/Chat/ChatWindow";

import {
  authenticatedFetch,
  getValidAccessToken,
} from "../../utils/auth";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

// =========================================================
// GET CURRENT LOGGED-IN DJANGO USER ID
// =========================================================

function getCurrentUserId() {
  try {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      return null;
    }

    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const userId = Number(
      payload.user_id ??
        payload.userId ??
        payload.sub
    );

    if (
      !userId ||
      Number.isNaN(userId)
    ) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error(
      "JWT decode error:",
      error
    );

    return null;
  }
}

// =========================================================
// GET DJANGO USER ID
//
// IMPORTANT:
// user_id is the actual Django User ID.
// user.id may be a profile/object ID.
// =========================================================

function getUserId(user) {
  if (!user) {
    return null;
  }

  const userId = Number(
    user?.user_id ??
      user?.user?.id ??
      user?.id
  );

  if (
    !userId ||
    Number.isNaN(userId)
  ) {
    return null;
  }

  return userId;
}

// =========================================================
// CREATE ROOM NAME
//
// Example:
// Divya = 9
// Nancy = 12
//
// Both users MUST get:
//
// 9_12
// =========================================================

function getRoomName(
  currentUserId,
  selectedUserId
) {
  const firstId =
    Number(currentUserId);

  const secondId =
    Number(selectedUserId);

  if (
    !firstId ||
    !secondId ||
    Number.isNaN(firstId) ||
    Number.isNaN(secondId)
  ) {
    return null;
  }

  const ids = [
    firstId,
    secondId,
  ].sort((a, b) => a - b);

  return `${ids[0]}_${ids[1]}`;
}

// =========================================================
// AVATAR URL
// =========================================================

function getAvatarUrl(url) {
  if (!url) {
    return null;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${BACKEND_HOST}${url}`;
  }

  return `${BACKEND_HOST}/${url}`;
}

// =========================================================
// MESSAGE TEXT
// =========================================================

function getMessageText(message) {
  if (!message) {
    return "New message";
  }

  return (
    message?.content ||
    message?.text ||
    message?.message ||
    "New message"
  );
}

// =========================================================
// MESSAGES
// =========================================================

function Messages() {
  const [users, setUsers] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  // =======================================================
  // UNREAD MESSAGES
  //
  // {
  //   9: {
  //     count: 2,
  //     lastMessage: "hello"
  //   }
  // }
  // =======================================================

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState({});

  // =======================================================
  // NOTIFICATION WEBSOCKET
  // =======================================================

  const notificationSocketRef =
    useRef(null);

  const notificationReconnectRef =
    useRef(null);

  const currentUserId =
    getCurrentUserId();

  // =======================================================
  // LOAD UNREAD MESSAGES FROM DATABASE
  // =======================================================

  const loadUnreadMessages = async (
    chatUsers
  ) => {
    if (!currentUserId) {
      return;
    }

    const unread = {};

    for (const user of chatUsers) {
      const userId =
        getUserId(user);

      if (!userId) {
        continue;
      }

      const roomName =
        getRoomName(
          currentUserId,
          userId
        );

      if (!roomName) {
        continue;
      }

      try {
        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/messages/room/${roomName}/`
          );

        if (!response.ok) {
          continue;
        }

        const messages =
          await response.json();

        if (
          !Array.isArray(messages)
        ) {
          continue;
        }

        // =================================================
        // FIND UNREAD MESSAGES FROM THIS USER
        // =================================================

        const unreadUserMessages =
          messages.filter(
            (message) => {
              const senderId =
                Number(
                  message?.sender_id
                );

              // Newer backend can use seen_by
              const seenBy =
                Array.isArray(
                  message?.seen_by
                )
                  ? message.seen_by.map(
                      Number
                    )
                  : [];

              // Older backend may use is_seen
              const isSeen =
                message?.is_seen === true;

              // If seen_by exists, use it.
              if (
                Array.isArray(
                  message?.seen_by
                )
              ) {
                return (
                  senderId ===
                    Number(userId) &&
                  !seenBy.includes(
                    Number(
                      currentUserId
                    )
                  )
                );
              }

              // Fallback for old message format.
              return (
                senderId ===
                  Number(userId) &&
                !isSeen
              );
            }
          );

        const count =
          unreadUserMessages.length;

        if (count > 0) {
          const lastMessage =
            unreadUserMessages[
              unreadUserMessages.length - 1
            ];

          unread[userId] = {
            count,
            lastMessage:
              getMessageText(
                lastMessage
              ),
          };
        }
      } catch (error) {
        console.error(
          `Unread message check failed for user ${userId}:`,
          error
        );
      }
    }

    setUnreadMessages(
      unread
    );

    // =====================================================
    // SAVE LOCALLY
    // =====================================================

    const totalUnread =
      Object.values(
        unread
      ).reduce(
        (total, item) =>
          total +
          Number(
            item?.count || 0
          ),
        0
      );

    localStorage.setItem(
      "unread_messages_by_sender",
      JSON.stringify(unread)
    );

    localStorage.setItem(
      "unread_message_count",
      String(totalUnread)
    );
  };

  // =======================================================
  // LOAD USERS
  // =======================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const validToken =
          await getValidAccessToken();

        if (!validToken) {
          console.error(
            "No valid access token"
          );

          setUsers([]);

          return;
        }

        setToken(
          validToken
        );

        if (!currentUserId) {
          console.error(
            "Could not determine current user ID"
          );

          setUsers([]);

          return;
        }

        const response =
          await authenticatedFetch(
            `${BACKEND_HOST}/api/users/`
          );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch users"
          );
        }

        const data =
          await response.json();

        console.log(
          "MESSAGES USERS API:",
          data
        );

        console.log(
          "CURRENT USER ID:",
          currentUserId
        );

        // =================================================
        // CLEAN USERS
        // =================================================

        const cleanedUsers =
          (
            Array.isArray(data)
              ? data
              : []
          ).filter(
            (user) => {
              const userId =
                getUserId(user);

              if (!userId) {
                return false;
              }

              if (
                userId ===
                Number(
                  currentUserId
                )
              ) {
                return false;
              }

              if (
                user?.is_staff
              ) {
                return false;
              }

              if (
                user?.is_superuser
              ) {
                return false;
              }

              return true;
            }
          );

        // =================================================
        // ONLY SHOW USERS WHO CAN CHAT
        //
        // Backend returns 403 when neither user follows the other.
        // This keeps unrelated users out of the Messages list.
        // =================================================

        const allowedUsers = [];

        for (const user of cleanedUsers) {
          const userId = getUserId(user);

          if (!userId) {
            continue;
          }

          const roomName = getRoomName(
            currentUserId,
            userId
          );

          if (!roomName) {
            continue;
          }

          try {
            const chatAccessResponse =
              await authenticatedFetch(
                `${BACKEND_HOST}/api/messages/room/${roomName}/`
              );

            if (chatAccessResponse.ok) {
              allowedUsers.push(user);
            }
          } catch (error) {
            console.error(
              `Chat access check failed for user ${userId}:`,
              error
            );
          }
        }

        console.log(
          "CHAT USERS AFTER FOLLOW ACCESS FILTER:",
          allowedUsers
        );

        setUsers(
          allowedUsers
        );

        // =================================================
        // LOAD EXISTING UNREAD MESSAGES
        // =================================================

        await loadUnreadMessages(
          allowedUsers
        );
      } catch (error) {
        console.error(
          "Messages users error:",
          error
        );

        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUserId]);

  // =======================================================
  // NOTIFICATION WEBSOCKET
  //
  // Backend:
  //
  // /ws/notifications/?token=JWT
  //
  // Backend sends:
  //
  // {
  //   type: "new_message",
  //   sender_id: 9,
  //   message: "hello",
  //   id: 123,
  //   room_name: "9_12"
  // }
  // =======================================================

  useEffect(() => {
    if (
      !token ||
      !currentUserId
    ) {
      return;
    }

    let socket = null;

    let reconnectTimer = null;

    let isUnmounted = false;

    const connectNotificationSocket =
      () => {
        if (isUnmounted) {
          return;
        }

        try {
          const wsProtocol =
            window.location.protocol ===
            "https:"
              ? "wss"
              : "ws";

          const backendHost =
            BACKEND_HOST.replace(
              /^https?:\/\//,
              ""
            );

          const wsUrl =
            `${wsProtocol}://${backendHost}` +
            `/ws/notifications/?token=${encodeURIComponent(
              token
            )}`;

          console.log(
            "Creating Notification WebSocket:",
            wsUrl
          );

          socket =
            new WebSocket(
              wsUrl
            );

          notificationSocketRef.current =
            socket;

          socket.onopen = () => {
            console.log(
              "Notification WebSocket OPEN"
            );
          };

          socket.onmessage = (
            event
          ) => {
            try {
              const data =
                JSON.parse(
                  event.data
                );

              console.log(
                "========== NOTIFICATION RECEIVED =========="
              );

              console.log(
                "Notification:",
                data
              );

              console.log(
                "Type:",
                data?.type
              );

              console.log(
                "Sender ID:",
                data?.sender_id
              );

              console.log(
                "Message:",
                data?.message
              );

              console.log(
                "Room:",
                data?.room_name
              );

              console.log(
                "============================================"
              );

              // =================================================
              // ONLY HANDLE NEW CHAT MESSAGE
              // =================================================

              if (
                data?.type !==
                "new_message"
              ) {
                return;
              }

              const senderId =
                Number(
                  data?.sender_id
                );

              if (
                !senderId ||
                senderId ===
                  Number(
                    currentUserId
                  )
              ) {
                return;
              }

              // =================================================
              // CHECK IF THIS CHAT IS CURRENTLY OPEN
              // =================================================

              const selectedId =
                selectedUser
                  ? getUserId(
                      selectedUser
                    )
                  : null;

              const isCurrentChat =
                Number(
                  selectedId
                ) ===
                Number(
                  senderId
                );

              // =================================================
              // IF CHAT IS OPEN:
              //
              // Do NOT create unread badge.
              // ChatWindow itself receives the actual message.
              // =================================================

              if (
                isCurrentChat
              ) {
                console.log(
                  "Message belongs to currently open chat. No unread badge."
                );

                return;
              }

              // =================================================
              // OTHERWISE INCREASE UNREAD COUNT
              // =================================================

              setUnreadMessages(
                (previous) => {
                  const oldData =
                    previous[
                      senderId
                    ];

                  const newCount =
                    Number(
                      oldData?.count ||
                        0
                    ) + 1;

                  const newData = {
                    ...previous,

                    [senderId]: {
                      count:
                        newCount,

                      lastMessage:
                        data?.message ||
                        "New message",
                    },
                  };

                  // =============================================
                  // SAVE TO LOCAL STORAGE
                  // =============================================

                  localStorage.setItem(
                    "unread_messages_by_sender",
                    JSON.stringify(
                      newData
                    )
                  );

                  const total =
                    Object.values(
                      newData
                    ).reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        Number(
                          item?.count ||
                            0
                        ),
                      0
                    );

                  localStorage.setItem(
                    "unread_message_count",
                    String(
                      total
                    )
                  );

                  return newData;
                }
              );

              // =================================================
              // NOTIFICATION SOUND
              // =================================================

              try {
                const audio =
                  new Audio(
                    "/notification.wav"
                  );

                audio.volume =
                  0.6;

                audio
                  .play()
                  .catch(
                    () => {}
                  );
              } catch (error) {
                console.log(
                  "Notification sound unavailable"
                );
              }
            } catch (error) {
              console.error(
                "Invalid notification WebSocket message:",
                error
              );
            }
          };

          socket.onerror = (
            error
          ) => {
            console.error(
              "Notification WebSocket ERROR:",
              error
            );
          };

          socket.onclose = (
            event
          ) => {
            console.log(
              "Notification WebSocket CLOSED:",
              event.code,
              event.reason
            );

            notificationSocketRef.current =
              null;

            if (
              !isUnmounted
            ) {
              reconnectTimer =
                setTimeout(
                  () => {
                    connectNotificationSocket();
                  },
                  2000
                );
            }
          };
        } catch (error) {
          console.error(
            "Notification WebSocket connection error:",
            error
          );
        }
      };

    connectNotificationSocket();

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      isUnmounted = true;

      if (
        reconnectTimer
      ) {
        clearTimeout(
          reconnectTimer
        );
      }

      if (
        notificationSocketRef.current
      ) {
        try {
          notificationSocketRef.current.close();
        } catch (error) {
          console.error(
            "Notification socket close error:",
            error
          );
        }
      }

      notificationSocketRef.current =
        null;
    };
  }, [
    token,
    currentUserId,
    selectedUser,
  ]);

  // =======================================================
  // TOTAL UNREAD
  // =======================================================

  const totalUnread =
    Object.values(
      unreadMessages
    ).reduce(
      (total, item) =>
        total +
        Number(
          item?.count || 0
        ),
      0
    );

  // =======================================================
  // SELECT USER
  // =======================================================

  const handleUserSelect =
    async (user) => {
      try {
        const validToken =
          await getValidAccessToken();

        if (!validToken) {
          console.error(
            "No valid token"
          );

          return;
        }

        const selectedUserId =
          getUserId(user);

        if (!selectedUserId) {
          console.error(
            "Could not determine selected user's Django ID:",
            user
          );

          return;
        }

        const newRoomName =
          getRoomName(
            currentUserId,
            selectedUserId
          );

        if (!newRoomName) {
          console.error(
            "Could not create room name"
          );

          return;
        }

        // =================================================
        // DEBUG
        // =================================================

        console.log(
          "================================="
        );

        console.log(
          "CHAT SELECTION"
        );

        console.log(
          "Current User ID:",
          currentUserId
        );

        console.log(
          "Selected Username:",
          user?.username
        );

        console.log(
          "Selected Profile ID:",
          user?.id
        );

        console.log(
          "Selected Django User ID:",
          user?.user_id
        );

        console.log(
          "Selected User ID USED FOR CHAT:",
          selectedUserId
        );

        console.log(
          "ROOM NAME:",
          newRoomName
        );

        console.log(
          "================================="
        );

        setToken(
          validToken
        );

        setSelectedUser(
          user
        );

        // =================================================
        // CLEAR UNREAD FOR THIS USER
        // =================================================

        setUnreadMessages(
          (previous) => {
            const next = {
              ...previous,
            };

            delete next[
              selectedUserId
            ];

            // =============================================
            // SAVE UPDATED UNREAD DATA
            // =============================================

            localStorage.setItem(
              "unread_messages_by_sender",
              JSON.stringify(
                next
              )
            );

            const total =
              Object.values(
                next
              ).reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  Number(
                    item?.count ||
                      0
                  ),
                0
              );

            localStorage.setItem(
              "unread_message_count",
              String(
                total
              )
            );

            return next;
          }
        );
      } catch (error) {
        console.error(
          "User selection error:",
          error
        );
      }
    };

  // =======================================================
  // SELECTED USER ID
  // =======================================================

  const selectedUserId =
    selectedUser
      ? getUserId(
          selectedUser
        )
      : null;

  // =======================================================
  // ROOM NAME
  // =======================================================

  const roomName =
    selectedUserId &&
    currentUserId
      ? getRoomName(
          currentUserId,
          selectedUserId
        )
      : null;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="flex h-[calc(100vh-60px)] bg-white">

      {/* =================================================
          LEFT SIDEBAR
          ================================================= */}

      <div className="flex w-full max-w-sm flex-col border-r border-gray-200">

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="border-b border-gray-200 px-5 py-4">

          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Messages
              </h1>

              <p className="mt-0.5 text-xs text-gray-500">
                Your conversations
              </p>
            </div>

            {/* =============================================
                TOTAL UNREAD
                ============================================= */}

            {totalUnread > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5">

                <span className="h-2 w-2 rounded-full bg-red-500" />

                <span className="text-xs font-semibold text-red-600">
                  {totalUnread > 99
                    ? "99+"
                    : totalUnread}{" "}
                  unread
                </span>

              </div>
            )}

          </div>

        </div>

        {/* =================================================
            USERS
            ================================================= */}

        <div className="flex-1 overflow-y-auto">

          {loading ? (
            <div className="p-5">

              <div className="animate-pulse space-y-4">

                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >

                      <div className="h-12 w-12 rounded-full bg-gray-200" />

                      <div className="flex-1 space-y-2">

                        <div className="h-3 w-28 rounded bg-gray-200" />

                        <div className="h-2 w-20 rounded bg-gray-100" />

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          ) : users.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-5 text-center">

              <div>

                <div className="mb-2 text-3xl">
                  💬
                </div>

                <p className="text-sm font-medium text-gray-700">
                  No users found
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Start following people to chat.
                </p>

              </div>

            </div>
          ) : (
            users.map(
              (user) => {
                const userId =
                  getUserId(user);

                if (!userId) {
                  return null;
                }

                const username =
                  user?.username ||
                  user?.user
                    ?.username ||
                  "User";

                const profileImage =
                  user?.profile_image ||
                  user?.user
                    ?.profile_image ||
                  user?.image ||
                  null;

                const isSelected =
                  selectedUserId ===
                  userId;

                // =========================================
                // UNREAD DATA
                // =========================================

                const unread =
                  unreadMessages[
                    userId
                  ];

                const unreadCount =
                  Number(
                    unread?.count ||
                      0
                  );

                const lastMessage =
                  unread?.lastMessage ||
                  "";

                const hasUnread =
                  unreadCount > 0;

                return (
                  <button
                    key={userId}
                    type="button"
                    onClick={() =>
                      handleUserSelect(
                        user
                      )
                    }
                    className={`
                      group
                      relative
                      flex
                      w-full
                      items-center
                      gap-3
                      border-b
                      border-gray-100
                      px-4
                      py-3.5
                      text-left
                      transition
                      ${
                        isSelected
                          ? "bg-gray-100"
                          : hasUnread
                          ? "bg-blue-50/70 hover:bg-blue-50"
                          : "hover:bg-gray-50"
                      }
                    `}
                  >

                    {/* ===================================
                        UNREAD LEFT BAR
                        =================================== */}

                    {hasUnread && (
                      <span className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-500" />
                    )}

                    {/* ===================================
                        AVATAR
                        =================================== */}

                    <div className="relative h-12 w-12 shrink-0">

                      <div
                        className={`
                          h-12
                          w-12
                          overflow-hidden
                          rounded-full
                          bg-gray-200
                          ${
                            hasUnread
                              ? "ring-2 ring-blue-400 ring-offset-2"
                              : ""
                          }
                        `}
                      >

                        {profileImage ? (
                          <img
                            src={getAvatarUrl(
                              profileImage
                            )}
                            alt={username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xl">
                            👤
                          </div>
                        )}

                      </div>

                      {/* =================================
                          RED BADGE
                          ================================= */}

                      {hasUnread && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                          {unreadCount >
                          99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}

                    </div>

                    {/* ===================================
                        USER INFO
                        =================================== */}

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between gap-2">

                        <p
                          className={`
                            truncate text-sm
                            ${
                              hasUnread
                                ? "font-bold text-gray-900"
                                : "font-semibold text-gray-800"
                            }
                          `}
                        >
                          {username}
                        </p>

                        {hasUnread && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                            New
                          </span>
                        )}

                      </div>

                      {user?.first_name && (
                        <p className="truncate text-xs text-gray-500">
                          {user.first_name}{" "}
                          {user.last_name ||
                            ""}
                        </p>
                      )}

                      {/* =================================
                          MESSAGE PREVIEW
                          ================================= */}

                      {hasUnread ? (
                        <div className="mt-1 flex items-center gap-1.5">

                          <span className="text-xs">
                            💬
                          </span>

                          <p className="truncate text-xs font-semibold text-blue-600">
                            {lastMessage}
                          </p>

                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">
                          Tap to chat
                        </p>
                      )}

                    </div>

                    {/* ===================================
                        ARROW
                        =================================== */}

                    <span
                      className={`
                        text-sm transition
                        ${
                          hasUnread
                            ? "text-blue-500"
                            : "text-gray-300 group-hover:text-gray-500"
                        }
                      `}
                    >
                      ›
                    </span>

                  </button>
                );
              }
            )
          )}

        </div>

      </div>

      {/* =================================================
          CHAT AREA
          ================================================= */}

      <div className="flex min-w-0 flex-1">

        {!selectedUser ? (
          <div className="flex flex-1 items-center justify-center bg-gray-50">

            <div className="text-center">

              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
                💬
              </div>

              <h2 className="text-lg font-semibold text-gray-800">
                Your Messages
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a conversation to start chatting
              </p>

              {totalUnread > 0 && (
                <p className="mt-3 text-xs font-semibold text-blue-600">
                  You have{" "}
                  {totalUnread}{" "}
                  new{" "}
                  {totalUnread ===
                  1
                    ? "message"
                    : "messages"}
                </p>
              )}

            </div>

          </div>
        ) : (
          <ChatWindow
            key={roomName}
            roomName={roomName}
            selectedUser={
              selectedUser
            }
            token={token}
            currentUserId={
              currentUserId
            }
          />
        )}

      </div>

    </div>
  );
}

export default Messages;