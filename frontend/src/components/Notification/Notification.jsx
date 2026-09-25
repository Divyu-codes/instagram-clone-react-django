import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getValidAccessToken } from "../../utils/auth";

const UNREAD_COUNT_KEY = "unread_message_count";
const UNREAD_BY_SENDER_KEY = "unread_messages_by_sender";

function getCurrentUserId() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    return Number(JSON.parse(atob(token.split(".")[1])).user_id);
  } catch {
    return null;
  }
}

function Notification() {
  const [notification, setNotification] = useState(null);
  const audioRef = useRef(null);
  const location = useLocation();

  const playNotificationSound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch((error) => {
      console.warn("Notification sound needs a browser interaction first:", error);
    });
  };

  useEffect(() => {
    let isMounted = true;

    const setupSocket = async () => {
      const token = await getValidAccessToken();
      const currentUserId = getCurrentUserId();
      if (!token || !currentUserId || !isMounted) return;

      const audio = new Audio("/notification.wav");
      audio.preload = "auto";
      audioRef.current = audio;

      const enableSound = () => {
        audio.muted = true;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }).catch(() => { audio.muted = false; });
      };
      window.addEventListener("pointerdown", enableSound, { once: true });
      window.addEventListener("keydown", enableSound, { once: true });

      const socket = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "notification") {
            playNotificationSound();
            setNotification({ id: data.id || Date.now(), message: data.message || "You have a new notification", kind: "social" });
            return;
          }

          if (data.type !== "new_message" || Number(data.sender_id) === currentUserId) return;

          playNotificationSound();

          const unreadCount = (Number(localStorage.getItem(UNREAD_COUNT_KEY)) || 0) + 1;
          localStorage.setItem(UNREAD_COUNT_KEY, String(unreadCount));
          const unreadBySender = JSON.parse(localStorage.getItem(UNREAD_BY_SENDER_KEY) || "{}");
          const senderId = String(data.sender_id);
          unreadBySender[senderId] = (Number(unreadBySender[senderId]) || 0) + 1;
          localStorage.setItem(UNREAD_BY_SENDER_KEY, JSON.stringify(unreadBySender));
          window.dispatchEvent(new CustomEvent("unread-message-count", {
            detail: { total: unreadCount, senderId },
          }));
          setNotification({ id: data.id, message: data.message, kind: "message" });
        } catch (error) {
          console.error("Notification parse error:", error);
        }
      };

      socket.onerror = () => {
        console.warn("Notification socket error");
      };

      return () => {
        socket.close();
        window.removeEventListener("pointerdown", enableSound);
        window.removeEventListener("keydown", enableSound);
        audioRef.current = null;
      };
    };

    const cleanup = setupSocket();

    return () => {
      isMounted = false;
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((dispose) => dispose && dispose());
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex w-80 items-center gap-3 rounded-2xl border bg-white p-4 shadow-2xl">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xl text-white">
        {notification.kind === "message" ? "💬" : "🔔"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-800">{notification.kind === "message" ? "New message" : "New notification"}</p>
        <p className="truncate text-sm text-gray-600">{notification.message}</p>
      </div>
      <button onClick={() => setNotification(null)} className="text-xl font-bold text-gray-400 hover:text-gray-700" aria-label="Close notification">×</button>
    </div>
  );
}

export default Notification;
