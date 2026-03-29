import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Device Agent Input Validation Tests
 * These tests focus on validating input schemas without requiring database
 */

describe("deviceAgent input validation", () => {
  describe("register input", () => {
    const registerSchema = z.object({
      deviceId: z.string().min(1),
      deviceName: z.string().min(1),
      deviceModel: z.string().optional(),
      osVersion: z.string().optional(),
      appVersion: z.string().optional(),
      registrationToken: z.string(),
    });

    it("should accept valid registration input", () => {
      const input = {
        deviceId: "device-001",
        deviceName: "Test Device",
        deviceModel: "Test Model",
        osVersion: "17.0",
        appVersion: "1.0.0",
        registrationToken: "test-token-123",
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty deviceId", () => {
      const input = {
        deviceId: "",
        deviceName: "Test Device",
        registrationToken: "test-token",
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty deviceName", () => {
      const input = {
        deviceId: "device-001",
        deviceName: "",
        registrationToken: "test-token",
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing registrationToken", () => {
      const input = {
        deviceId: "device-001",
        deviceName: "Test Device",
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("updateLocation input", () => {
    const locationSchema = z.object({
      deviceToken: z.string(),
      deviceId: z.string(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().optional(),
      altitude: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      timestamp: z.number(),
    });

    it("should accept valid location input", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5.0,
        altitude: 10.5,
        speed: 0.0,
        heading: 0.0,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject latitude > 90", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: 91,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject latitude < -90", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: -91,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject longitude > 180", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: 37.7749,
        longitude: 181,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject longitude < -180", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: 37.7749,
        longitude: -181,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept valid boundary coordinates", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        latitude: 90,
        longitude: 180,
        timestamp: Date.now(),
      };

      const result = locationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("updateStatus input", () => {
    const statusSchema = z.object({
      deviceToken: z.string(),
      deviceId: z.string(),
      isOnline: z.boolean(),
      batteryLevel: z.number().min(0).max(100),
      batteryState: z.enum(["charging", "discharging", "full"]),
      storageUsed: z.number(),
      storageTotal: z.number(),
      connectivity: z.enum(["wifi", "cellular", "offline"]),
      timestamp: z.number(),
    });

    it("should accept valid status input", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        isOnline: true,
        batteryLevel: 85,
        batteryState: "charging" as const,
        storageUsed: 45.2,
        storageTotal: 128.0,
        connectivity: "wifi" as const,
        timestamp: Date.now(),
      };

      const result = statusSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject batteryLevel > 100", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        isOnline: true,
        batteryLevel: 150,
        batteryState: "charging" as const,
        storageUsed: 45.2,
        storageTotal: 128.0,
        connectivity: "wifi" as const,
        timestamp: Date.now(),
      };

      const result = statusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject batteryLevel < 0", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        isOnline: true,
        batteryLevel: -5,
        batteryState: "charging" as const,
        storageUsed: 45.2,
        storageTotal: 128.0,
        connectivity: "wifi" as const,
        timestamp: Date.now(),
      };

      const result = statusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid batteryState", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        isOnline: true,
        batteryLevel: 85,
        batteryState: "unknown",
        storageUsed: 45.2,
        storageTotal: 128.0,
        connectivity: "wifi" as const,
        timestamp: Date.now(),
      };

      const result = statusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid connectivity", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        isOnline: true,
        batteryLevel: 85,
        batteryState: "charging" as const,
        storageUsed: 45.2,
        storageTotal: 128.0,
        connectivity: "bluetooth",
        timestamp: Date.now(),
      };

      const result = statusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept all valid battery states", () => {
      const states = ["charging", "discharging", "full"] as const;

      states.forEach((state) => {
        const input = {
          deviceToken: "token-123",
          deviceId: "device-001",
          isOnline: true,
          batteryLevel: 85,
          batteryState: state,
          storageUsed: 45.2,
          storageTotal: 128.0,
          connectivity: "wifi" as const,
          timestamp: Date.now(),
        };

        const result = statusSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all valid connectivity types", () => {
      const types = ["wifi", "cellular", "offline"] as const;

      types.forEach((type) => {
        const input = {
          deviceToken: "token-123",
          deviceId: "device-001",
          isOnline: true,
          batteryLevel: 85,
          batteryState: "charging" as const,
          storageUsed: 45.2,
          storageTotal: 128.0,
          connectivity: type,
          timestamp: Date.now(),
        };

        const result = statusSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("reportAlert input", () => {
    const alertSchema = z.object({
      deviceToken: z.string(),
      deviceId: z.string(),
      alertType: z.enum(["motion", "sound", "offline", "online", "custom"]),
      title: z.string(),
      description: z.string().optional(),
      severity: z.enum(["low", "medium", "high"]),
      timestamp: z.number(),
    });

    it("should accept valid alert input", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        alertType: "motion" as const,
        title: "Motion Detected",
        description: "Motion detected in living room",
        severity: "high" as const,
        timestamp: Date.now(),
      };

      const result = alertSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid alertType", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        alertType: "invalid",
        title: "Test Alert",
        severity: "high" as const,
        timestamp: Date.now(),
      };

      const result = alertSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid severity", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        alertType: "motion" as const,
        title: "Test Alert",
        severity: "critical",
        timestamp: Date.now(),
      };

      const result = alertSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept all valid alert types", () => {
      const types = ["motion", "sound", "offline", "online", "custom"] as const;

      types.forEach((type) => {
        const input = {
          deviceToken: "token-123",
          deviceId: "device-001",
          alertType: type,
          title: "Test Alert",
          severity: "high" as const,
          timestamp: Date.now(),
        };

        const result = alertSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all valid severity levels", () => {
      const levels = ["low", "medium", "high"] as const;

      levels.forEach((level) => {
        const input = {
          deviceToken: "token-123",
          deviceId: "device-001",
          alertType: "motion" as const,
          title: "Test Alert",
          severity: level,
          timestamp: Date.now(),
        };

        const result = alertSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("acknowledgeCommand input", () => {
    const commandSchema = z.object({
      deviceToken: z.string(),
      deviceId: z.string(),
      commandId: z.number(),
      status: z.enum(["received", "executing", "executed", "failed"]),
      result: z.record(z.string(), z.any()).optional(),
      error: z.string().optional(),
    });

    it("should accept valid command acknowledgment", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        commandId: 123,
        status: "executed" as const,
        result: { success: true, recordingId: "rec-456" },
      };

      const result = commandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid command status", () => {
      const input = {
        deviceToken: "token-123",
        deviceId: "device-001",
        commandId: 123,
        status: "unknown",
      };

      const result = commandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept all valid command statuses", () => {
      const statuses = ["received", "executing", "executed", "failed"] as const;

      statuses.forEach((status) => {
        const input = {
          deviceToken: "token-123",
          deviceId: "device-001",
          commandId: 123,
          status: status,
        };

        const result = commandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});
