import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// Core user table backing auth flow
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Device management table
export const devices = sqliteTable("devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  deviceId: text("deviceId").notNull().unique(),
  deviceName: text("deviceName").notNull(),
  deviceModel: text("deviceModel"),
  isOnline: integer("isOnline", { mode: "boolean" }).default(false).notNull(),
  lastSeen: integer("lastSeen", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// Real-time location tracking
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: integer("deviceId").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  altitude: real("altitude"),
  speed: real("speed"),
  heading: real("heading"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

// Alerts and notifications
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: integer("deviceId").notNull(),
  alertType: text("alertType", { enum: ["motion", "sound", "offline", "online", "custom"] }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
  severity: text("severity", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// Recording metadata
export const recordings = sqliteTable("recordings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: integer("deviceId").notNull(),
  recordingName: text("recordingName").notNull(),
  duration: integer("duration"),
  fileSize: integer("fileSize"),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: text("mimeType"),
  recordingType: text("recordingType", { enum: ["video", "audio", "mixed"] }).default("video").notNull(),
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = typeof recordings.$inferInsert;

// Device commands and control history
export const deviceCommands = sqliteTable("deviceCommands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: integer("deviceId").notNull(),
  commandType: text("commandType", { enum: ["start_recording", "stop_recording", "buzz", "toggle_flashlight", "two_way_audio", "custom"] }).notNull(),
  commandData: text("commandData", { mode: "json" }),
  status: text("status", { enum: ["pending", "sent", "executed", "failed"] }).default("pending").notNull(),
  result: text("result"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  executedAt: integer("executedAt", { mode: "timestamp" }),
});

export type DeviceCommand = typeof deviceCommands.$inferSelect;
export type InsertDeviceCommand = typeof deviceCommands.$inferInsert;