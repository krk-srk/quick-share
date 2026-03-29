import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { nanoid } from "nanoid";

/**
 * Device Agent Router - Handles communication from remote devices
 * These endpoints are called by the device agent running on Android/iOS devices
 */
export const deviceAgentRouter = router({
  /**
   * Device Registration
   * Called when a device first connects to the system
   */
  register: publicProcedure
    .input(
      z.object({
        deviceId: z.string().min(1),
        deviceName: z.string().min(1),
        deviceModel: z.string().optional(),
        osVersion: z.string().optional(),
        appVersion: z.string().optional(),
        registrationToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify registration token (in production, validate against OAuth)
      if (!input.registrationToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid registration token" });
      }

      // Check if device already registered
      const existingDevice = await db.getDeviceByDeviceId(input.deviceId);
      if (existingDevice) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device already registered" });
      }

      // Create device with default user (in production, extract from token)
      const device = await db.createDevice({
        userId: 1, // TODO: Extract from registration token
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        deviceModel: input.deviceModel,
        isOnline: true,
      });

      // Generate device auth token
      const deviceToken = nanoid(32);

      return {
        success: true,
        deviceToken,
        deviceId: device.id,
        serverId: "trackview-server-1",
      };
    }),

  /**
   * Location Update
   * Called periodically by device to send GPS location
   */
  updateLocation: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        altitude: z.number().optional(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify device token (in production, validate against stored token)
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      // Get device
      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Store location
      await db.createLocation({
        deviceId: device.id,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        accuracy: input.accuracy?.toString(),
        altitude: input.altitude?.toString(),
        speed: input.speed?.toString(),
        heading: input.heading?.toString(),
      });

      // Update device last seen
      await db.updateDeviceStatus(device.id, true);

      return {
        success: true,
        nextUpdateInterval: 30000, // 30 seconds
      };
    }),

  /**
   * Status Update
   * Called periodically by device to send status information
   */
  updateStatus: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        isOnline: z.boolean(),
        batteryLevel: z.number().min(0).max(100),
        batteryState: z.enum(["charging", "discharging", "full"]),
        storageUsed: z.number(),
        storageTotal: z.number(),
        connectivity: z.enum(["wifi", "cellular", "offline"]),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Update device status
      await db.updateDeviceStatus(device.id, input.isOnline);

      // Get pending commands for this device
      const commands = await db.getDeviceCommandHistory(device.id, 10);
      const pendingCommands = commands.filter((cmd) => cmd.status === "pending");

      return {
        success: true,
        commands: pendingCommands.map((cmd) => ({
          commandId: cmd.id,
          commandType: cmd.commandType,
          parameters: cmd.commandData,
        })),
      };
    }),

  /**
   * Command Acknowledgment
   * Called by device to acknowledge command receipt
   */
  acknowledgeCommand: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        commandId: z.number(),
        status: z.enum(["received", "executing", "executed", "failed"]),
        result: z.record(z.string(), z.any()).optional(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Update command status (in production, implement command update in db.ts)
      // For now, just return success
      return {
        success: true,
        message: `Command ${input.commandId} acknowledged with status: ${input.status}`,
      };
    }),

  /**
   * Alert Report
   * Called by device to send alerts (motion, sound, etc.)
   */
  reportAlert: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        alertType: z.enum(["motion", "sound", "offline", "online", "custom"]),
        title: z.string(),
        description: z.string().optional(),
        severity: z.enum(["low", "medium", "high"]),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Create alert
      await db.createAlert({
        deviceId: device.id,
        alertType: input.alertType,
        title: input.title,
        description: input.description,
        severity: input.severity,
      });

      return {
        success: true,
        alertId: nanoid(16),
      };
    }),

  /**
   * Recording Start
   * Called by device when recording starts
   */
  recordingStart: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        recordingId: z.string(),
        recordingType: z.enum(["video", "audio", "mixed"]),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Create recording entry
      await db.createRecording({
        deviceId: device.id,
        recordingName: `Recording ${input.recordingId}`,
        recordingType: input.recordingType,
        fileUrl: "",
        fileKey: input.recordingId,
        startTime: new Date(input.timestamp),
      });

      return {
        success: true,
        message: "Recording started",
      };
    }),

  /**
   * Heartbeat
   * Called periodically to keep connection alive
   */
  heartbeat: publicProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceId: z.string(),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.deviceToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device token" });
      }

      const device = await db.getDeviceByDeviceId(input.deviceId);
      if (!device) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      // Update device last seen
      await db.updateDeviceStatus(device.id, true);

      return {
        success: true,
        serverTime: Date.now(),
      };
    }),
});
