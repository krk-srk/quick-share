import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const commandsRouter = router({
  history: protectedProcedure
    .input(z.object({ deviceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }
      return db.getDeviceCommandHistory(input.deviceId, input.limit);
    }),

  startRecording: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "start_recording",
        status: "pending",
        commandData: {},
      });

      return command;
    }),

  stopRecording: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "stop_recording",
        status: "pending",
        commandData: {},
      });

      return command;
    }),

  triggerBuzz: protectedProcedure
    .input(z.object({ deviceId: z.number(), duration: z.number().default(3) }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "buzz",
        status: "pending",
        commandData: { duration: input.duration },
      });

      return command;
    }),

  toggleFlashlight: protectedProcedure
    .input(z.object({ deviceId: z.number(), state: z.enum(["on", "off"]) }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "toggle_flashlight",
        status: "pending",
        commandData: { state: input.state },
      });

      return command;
    }),

  startTwoWayAudio: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "two_way_audio",
        status: "pending",
        commandData: {},
      });

      return command;
    }),

  sendCustomCommand: protectedProcedure
    .input(z.object({ deviceId: z.number(), commandData: z.record(z.string(), z.any()) }))
    .mutation(async ({ input, ctx }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device || device.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Device not found or unauthorized" });
      }

      if (!device.isOnline) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Device is offline" });
      }

      const command = await db.createDeviceCommand({
        deviceId: input.deviceId,
        commandType: "custom",
        status: "pending",
        commandData: input.commandData,
      });

      return command;
    }),
});
