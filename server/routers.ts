const COOKIE_NAME = "session";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { commandsRouter } from "./commands.router";
import { deviceAgentRouter } from "./device-agent.router";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  devices: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserDevices(ctx.user.id)),
    
    getById: protectedProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return device;
      }),
    
    create: protectedProcedure
      .input(z.object({
        deviceId: z.string(),
        deviceName: z.string(),
        deviceModel: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const device = await db.createDevice({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          deviceName: input.deviceName,
          deviceModel: input.deviceModel,
          isOnline: false,
        });
        return device;
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        deviceId: z.number(),
        isOnline: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return await db.updateDeviceStatus(input.deviceId, input.isOnline);
      }),
  }),

  locations: router({
    latest: protectedProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return db.getLatestLocation(input.deviceId);
      }),
    
    history: protectedProcedure
      .input(z.object({ deviceId: z.number(), limit: z.number().default(100) }))
      .query(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return db.getLocationHistory(input.deviceId, input.limit);
      }),
  }),

  alerts: router({
    list: protectedProcedure
      .input(z.object({ deviceId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return db.getDeviceAlerts(input.deviceId, input.limit);
      }),
  }),

  recordings: router({
    list: protectedProcedure
      .input(z.object({ deviceId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device || device.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
        }
        return db.getDeviceRecordings(input.deviceId, input.limit);
      }),
  }),

  commands: commandsRouter,
  deviceAgent: deviceAgentRouter,
});

export type AppRouter = typeof appRouter;
