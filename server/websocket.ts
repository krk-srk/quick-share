import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { nanoid } from "nanoid";

/**
 * Real-time WebSocket Server for TrackView
 * Handles device connections, live updates, and command delivery
 */

export interface DeviceConnection {
  id: string;
  deviceId: string;
  deviceToken: string;
  ws: WebSocket;
  connectedAt: number;
  lastHeartbeat: number;
  isOnline: boolean;
  metadata: Record<string, any>;
}

export interface DashboardConnection {
  id: string;
  userId: string;
  ws: WebSocket;
  connectedAt: number;
}

export interface WSMessage {
  type: string;
  payload: any;
  timestamp: number;
}

class TrackViewWebSocketServer {
  private wss: WebSocketServer;
  private devices = new Map<string, DeviceConnection>();
  private dashboards = new Map<string, DashboardConnection>();
  private commandQueue = new Map<string, any[]>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupConnectionHandler();
    this.startHeartbeatMonitor();
  }

  private setupConnectionHandler() {
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const type = url.searchParams.get("type");
      const deviceToken = url.searchParams.get("token");
      const deviceId = url.searchParams.get("deviceId");
      const userId = url.searchParams.get("userId");

      if (type === "device" && deviceToken && deviceId) {
        this.handleDeviceConnection(ws, deviceId, deviceToken);
      } else if (type === "dashboard" && userId) {
        this.handleDashboardConnection(ws, userId);
      } else {
        ws.close(1008, "Invalid connection parameters");
      }
    });
  }

  private handleDeviceConnection(
    ws: WebSocket,
    deviceId: string,
    deviceToken: string
  ) {
    const connectionId = nanoid();
    const connection: DeviceConnection = {
      id: connectionId,
      deviceId,
      deviceToken,
      ws,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isOnline: true,
      metadata: {},
    };

    this.devices.set(connectionId, connection);
    console.log(`📱 Device connected: ${deviceId} (${connectionId})`);

    // Send welcome message
    this.sendToDevice(connectionId, {
      type: "welcome",
      payload: { connectionId, serverId: "trackview-server-1" },
      timestamp: Date.now(),
    });

    // Broadcast device online status to dashboards
    this.broadcastToDashboards({
      type: "device_online",
      payload: { deviceId },
      timestamp: Date.now(),
    });

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        this.handleDeviceMessage(connectionId, message);
      } catch (error) {
        console.error("Failed to parse device message:", error);
      }
    });

    ws.on("close", () => {
      this.devices.delete(connectionId);
      console.log(`📱 Device disconnected: ${deviceId}`);
      this.broadcastToDashboards({
        type: "device_offline",
        payload: { deviceId },
        timestamp: Date.now(),
      });
    });

    ws.on("error", (error: Error) => {
      console.error(`Device connection error (${deviceId}):`, error);
    });
  }

  private handleDashboardConnection(ws: WebSocket, userId: string) {
    const connectionId = nanoid();
    const connection: DashboardConnection = {
      id: connectionId,
      userId,
      ws,
      connectedAt: Date.now(),
    };

    this.dashboards.set(connectionId, connection);
    console.log(`📊 Dashboard connected: ${userId} (${connectionId})`);

    // Send current device list
    const deviceList = Array.from(this.devices.values()).map((d) => ({
      deviceId: d.deviceId,
      isOnline: d.isOnline,
      lastHeartbeat: d.lastHeartbeat,
      metadata: d.metadata,
    }));

    this.sendToDashboard(connectionId, {
      type: "device_list",
      payload: { devices: deviceList },
      timestamp: Date.now(),
    });

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        this.handleDashboardMessage(connectionId, message);
      } catch (error) {
        console.error("Failed to parse dashboard message:", error);
      }
    });

    ws.on("close", () => {
      this.dashboards.delete(connectionId);
      console.log(`📊 Dashboard disconnected: ${userId}`);
    });

    ws.on("error", (error: Error) => {
      console.error(`Dashboard connection error (${userId}):`, error);
    });
  }

  private handleDeviceMessage(connectionId: string, message: WSMessage) {
    const device = this.devices.get(connectionId);
    if (!device) return;

    switch (message.type) {
      case "heartbeat":
        device.lastHeartbeat = Date.now();
        device.isOnline = true;
        this.sendToDevice(connectionId, {
          type: "heartbeat_ack",
          payload: { serverTime: Date.now() },
          timestamp: Date.now(),
        });
        break;

      case "location_update":
        device.metadata.lastLocation = message.payload;
        device.metadata.lastLocationTime = Date.now();
        this.broadcastToDashboards({
          type: "location_update",
          payload: {
            deviceId: device.deviceId,
            location: message.payload,
          },
          timestamp: Date.now(),
        });
        break;

      case "status_update":
        device.metadata.status = message.payload;
        device.metadata.statusTime = Date.now();
        this.broadcastToDashboards({
          type: "status_update",
          payload: {
            deviceId: device.deviceId,
            status: message.payload,
          },
          timestamp: Date.now(),
        });
        break;

      case "alert":
        this.broadcastToDashboards({
          type: "alert",
          payload: {
            deviceId: device.deviceId,
            alert: message.payload,
          },
          timestamp: Date.now(),
        });
        break;

      case "command_ack":
        this.broadcastToDashboards({
          type: "command_executed",
          payload: {
            deviceId: device.deviceId,
            commandId: message.payload.commandId,
            status: message.payload.status,
            result: message.payload.result,
          },
          timestamp: Date.now(),
        });
        break;
    }
  }

  private handleDashboardMessage(connectionId: string, message: WSMessage) {
    const dashboard = this.dashboards.get(connectionId);
    if (!dashboard) return;

    switch (message.type) {
      case "send_command":
        const { deviceId, commandType, commandData } = message.payload;
        this.sendCommandToDevice(deviceId, {
          type: "command",
          payload: {
            commandId: nanoid(),
            commandType,
            commandData,
          },
          timestamp: Date.now(),
        });
        break;

      case "get_device_list":
        const devices = Array.from(this.devices.values()).map((d) => ({
          deviceId: d.deviceId,
          isOnline: d.isOnline,
          lastHeartbeat: d.lastHeartbeat,
          metadata: d.metadata,
        }));
        this.sendToDashboard(connectionId, {
          type: "device_list",
          payload: { devices },
          timestamp: Date.now(),
        });
        break;
    }
  }

  private sendToDevice(connectionId: string, message: WSMessage) {
    const device = this.devices.get(connectionId);
    if (device && device.ws.readyState === WebSocket.OPEN) {
      device.ws.send(JSON.stringify(message));
    }
  }

  private sendCommandToDevice(deviceId: string, message: WSMessage) {
    const device = Array.from(this.devices.values()).find(
      (d) => d.deviceId === deviceId
    );
    if (device && device.ws.readyState === WebSocket.OPEN) {
      device.ws.send(JSON.stringify(message));
      console.log(`📤 Command sent to ${deviceId}`);
    } else {
      console.log(`⚠️  Device ${deviceId} not connected, queuing command`);
      if (!this.commandQueue.has(deviceId)) {
        this.commandQueue.set(deviceId, []);
      }
      this.commandQueue.get(deviceId)!.push(message);
    }
  }

  private sendToDashboard(connectionId: string, message: WSMessage) {
    const dashboard = this.dashboards.get(connectionId);
    if (dashboard && dashboard.ws.readyState === WebSocket.OPEN) {
      dashboard.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToDashboards(message: WSMessage) {
    this.dashboards.forEach((dashboard) => {
      if (dashboard.ws.readyState === WebSocket.OPEN) {
        dashboard.ws.send(JSON.stringify(message));
      }
    });
  }

  private startHeartbeatMonitor() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      this.devices.forEach((device, connectionId) => {
        if (now - device.lastHeartbeat > timeout) {
          device.isOnline = false;
          console.log(`⏱️  Device timeout: ${device.deviceId}`);
          this.broadcastToDashboards({
            type: "device_offline",
            payload: { deviceId: device.deviceId, reason: "timeout" },
            timestamp: Date.now(),
          });
        }
      });
    }, 10000); // Check every 10 seconds
  }

  public getDeviceStatus(deviceId: string) {
    const device = Array.from(this.devices.values()).find(
      (d) => d.deviceId === deviceId
    );
    return device
      ? {
          isOnline: device.isOnline,
          lastHeartbeat: device.lastHeartbeat,
          metadata: device.metadata,
        }
      : null;
  }

  public getConnectedDevices() {
    return Array.from(this.devices.values()).map((d) => ({
      deviceId: d.deviceId,
      isOnline: d.isOnline,
      lastHeartbeat: d.lastHeartbeat,
      metadata: d.metadata,
    }));
  }

  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

export function createWebSocketServer(server: HTTPServer) {
  return new TrackViewWebSocketServer(server);
}
