import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { InsertUser, users, devices, InsertDevice, locations, InsertLocation, alerts, InsertAlert, recordings, InsertRecording, deviceCommands, InsertDeviceCommand } from "./schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

export async function getDb() {
  if (!_db) {
    try {
      sqlite = new Database('sqlite.db');
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export function initializeDatabase() {
  // Optional explicit init
  getDb();
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId } as InsertUser;
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value !== undefined) {
      values[field as keyof InsertUser] = value as never;
      updateSet[field] = value ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
}
export async function getDeviceById(deviceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
  return result[0];
}
export async function createDevice(data: InsertDevice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(devices).values(data);
  const result = await db.select().from(devices).where(eq(devices.deviceId, data.deviceId)).limit(1);
  return result[0] || null;
}
export async function getLatestLocation(deviceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(locations).where(eq(locations.deviceId, deviceId)).orderBy(desc(locations.createdAt)).limit(1);
  return result[0];
}
export async function getLocationHistory(deviceId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations).where(eq(locations.deviceId, deviceId)).orderBy(desc(locations.createdAt)).limit(limit);
}
export async function createLocation(data: InsertLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(locations).values(data);
}
export async function getDeviceAlerts(deviceId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.deviceId, deviceId)).orderBy(desc(alerts.createdAt)).limit(limit);
}
export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alerts).values(data);
}
export async function getDeviceRecordings(deviceId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recordings).where(eq(recordings.deviceId, deviceId)).orderBy(desc(recordings.createdAt)).limit(limit);
}
export async function createRecording(data: InsertRecording) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(recordings).values(data);
}
export async function createDeviceCommand(data: InsertDeviceCommand) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deviceCommands).values(data);
  const commands = await db.select().from(deviceCommands).where(eq(deviceCommands.deviceId, data.deviceId)).orderBy(desc(deviceCommands.createdAt)).limit(1);
  return commands[0] || null;
}
export async function getDeviceCommandHistory(deviceId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deviceCommands).where(eq(deviceCommands.deviceId, deviceId)).orderBy(desc(deviceCommands.createdAt)).limit(limit);
}
export async function updateDeviceStatus(deviceId: number, isOnline: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(devices).set({ isOnline, lastSeen: new Date() }).where(eq(devices.id, deviceId));
  return getDeviceById(deviceId);
}
export async function getDeviceByDeviceId(deviceId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
  return result[0];
}
