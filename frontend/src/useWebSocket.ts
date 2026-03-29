import { useEffect, useRef, useCallback, useState } from "react";

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export function useWebSocket(userId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [updates, setUpdates] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?type=dashboard&userId=${userId}`;

    console.log("Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("WebSocket message:", message.type, message.payload);

        // Handle different message types
        switch (message.type) {
          case "device_list":
            setDevices(message.payload.devices || []);
            break;

          case "device_online":
            setDevices((prev) =>
              prev.map((d) =>
                d.deviceId === message.payload.deviceId
                  ? { ...d, isOnline: true }
                  : d
              )
            );
            break;

          case "device_offline":
            setDevices((prev) =>
              prev.map((d) =>
                d.deviceId === message.payload.deviceId
                  ? { ...d, isOnline: false }
                  : d
              )
            );
            break;

          case "location_update":
          case "status_update":
          case "alert":
          case "command_executed":
            // Broadcast all updates so components can react
            setUpdates(message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not connected");
    }
  }, []);

  const sendCommand = useCallback(
    (deviceId: string, commandType: string, commandData?: any) => {
      sendMessage({
        type: "send_command",
        payload: {
          deviceId,
          commandType,
          commandData,
        },
        timestamp: Date.now(),
      });
    },
    [sendMessage]
  );

  const getDeviceList = useCallback(() => {
    sendMessage({
      type: "get_device_list",
      payload: {},
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  return {
    isConnected,
    devices,
    updates,
    sendMessage,
    sendCommand,
    getDeviceList,
  };
}
