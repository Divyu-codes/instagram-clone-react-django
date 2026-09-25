import { useEffect, useRef } from "react";

export default function useWebsocket(
  url,
  onMessage,
  onOpen
) {
  const wsRef = useRef(null);
  const pendingMessagesRef = useRef([]);

  useEffect(() => {
    if (!url) {
      return;
    }

    console.log("Creating WebSocket:", url);

    const ws = new WebSocket(url);

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket OPEN");

      /*
       * Send messages that were queued
       * while socket was connecting.
       */
      if (pendingMessagesRef.current.length > 0) {
        console.log(
          "Sending queued messages:",
          pendingMessagesRef.current.length
        );

        pendingMessagesRef.current.forEach(
          (data) => {
            ws.send(JSON.stringify(data));
          }
        );

        pendingMessagesRef.current = [];
      }

      if (onOpen) {
        onOpen();
      }
    };

    ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    console.log("========== WS RECEIVED ==========");
    console.log("TYPE:", data.type);
    console.log("DATA:", data);
    console.log("MESSAGE:", data.message);
    console.log("CONTENT:", data.content);
    console.log("SENDER:", data.sender_id);
    console.log("=================================");

    if (onMessage) {
      onMessage(data);
    }
  } catch (error) {
    console.error("Invalid WebSocket message:", error);
  }
};

    ws.onerror = (error) => {
      console.error(
        "WebSocket ERROR:",
        error
      );
    };

    ws.onclose = (event) => {
      console.log(
        "WebSocket CLOSED:",
        event.code,
        event.reason
      );
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }

      wsRef.current = null;
    };
  }, [url]);

  const send = (data) => {
    const ws = wsRef.current;

    if (!ws) {
      console.warn(
        "WebSocket not initialized. Queueing message."
      );

      pendingMessagesRef.current.push(data);

      return false;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      console.log(
        "WebSocket connecting. Queueing message."
      );

      pendingMessagesRef.current.push(data);

      return true;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket is not open. State:",
        ws.readyState
      );

      return false;
    }

    console.log("WS SEND:", data);

    ws.send(JSON.stringify(data));

    return true;
  };

  return {
    send,
  };
}