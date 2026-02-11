import { useEffect } from "react";
import { API_BASE_URL } from "../constants";

export function useWebSocket(onMessage: (data: unknown) => void) {
  useEffect(() => {
    const wsBase = API_BASE_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/ws/feed`);

    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed payloads
      }
    };

    return () => {
      ws.close();
    };
  }, [onMessage]);
}
