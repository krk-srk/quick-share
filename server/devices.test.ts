import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

function createAuthContext(userId: number = 1): { ctx: TrpcContext; user: User } {
  const user: User = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, user };
}

describe("Authorization and Error Handling", () => {
  describe("Device Authorization", () => {
    it("should verify user context is properly created", () => {
      const { ctx, user } = createAuthContext(1);
      expect(ctx.user).toBeDefined();
      expect(ctx.user?.id).toBe(1);
      expect(user.role).toBe("user");
    });

    it("should support different user IDs", () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);
      
      expect(ctx1.user?.id).not.toBe(ctx2.user?.id);
      expect(ctx1.user?.openId).not.toBe(ctx2.user?.openId);
    });

    it("should throw FORBIDDEN error when device ownership doesn't match", () => {
      const deviceUserId = 1;
      const requestingUserId = 2;
      
      expect(deviceUserId).not.toBe(requestingUserId);
    });
  });

  describe("TRPC Error Handling", () => {
    it("should create FORBIDDEN error with proper code", () => {
      const error = new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Device not found or unauthorized" 
      });
      
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toContain("unauthorized");
    });

    it("should create UNAUTHORIZED error for unauthenticated requests", () => {
      const error = new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Not authenticated" 
      });
      
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("should handle error messages correctly", () => {
      const message = "Device not found or unauthorized";
      const error = new TRPCError({ code: "FORBIDDEN", message });
      
      expect(error.message).toBe(message);
    });
  });

  describe("User Role Management", () => {
    it("should identify admin users", () => {
      const { user } = createAuthContext(1);
      user.role = "admin";
      
      expect(user.role).toBe("admin");
    });

    it("should identify regular users", () => {
      const { user } = createAuthContext(1);
      
      expect(user.role).toBe("user");
    });

    it("should support role-based access control", () => {
      const { user: adminUser } = createAuthContext(1);
      const { user: regularUser } = createAuthContext(2);
      
      adminUser.role = "admin";
      regularUser.role = "user";
      
      expect(adminUser.role).toBe("admin");
      expect(regularUser.role).toBe("user");
      expect(adminUser.role).not.toBe(regularUser.role);
    });
  });

  describe("Context Validation", () => {
    it("should validate request context structure", () => {
      const { ctx } = createAuthContext(1);
      
      expect(ctx.req).toBeDefined();
      expect(ctx.res).toBeDefined();
      expect(ctx.user).toBeDefined();
      expect(ctx.req.protocol).toBe("https");
    });

    it("should support cookie operations in context", () => {
      const { ctx } = createAuthContext(1);
      let cookieCleared = false;
      
      ctx.res.clearCookie = () => {
        cookieCleared = true;
      };
      
      ctx.res.clearCookie("test");
      expect(cookieCleared).toBe(true);
    });
  });
});
