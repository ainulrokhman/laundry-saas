/**
 * Tests for Tenant Isolation Helpers
 * 
 * These tests verify that tenant isolation works correctly:
 * 1. Tenant filtering prevents cross-tenant data access
 * 2. SUPERADMIN can access all outlets
 * 3. OWNER and STAFF can only access their own outlet
 * 4. Missing outletId throws appropriate errors
 * 
 * To run these tests, setup a testing framework (Jest/Vitest) and run:
 * npm test tenant-helpers.test.ts
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  getTenantFilter,
  buildTenantWhere,
  verifyTenantAccess,
  requireOutletId,
  canAccessOutlet,
} from "../tenant-helpers";
import { Role } from "@/types/enums/Role";
import type { ExtendedSession } from "@/types/auth";

// Mock session data
const createMockSession = (
  role: Role,
  outletId: string | null
): ExtendedSession => {
  return {
    user: {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role,
      outletId: outletId || "",
    },
    outletId: outletId || "",
    role,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } as ExtendedSession;
};

describe("Tenant Isolation Helpers", () => {
  describe("getTenantFilter", () => {
    it("should return null for SUPERADMIN (no filter needed)", () => {
      const session = createMockSession(Role.SUPERADMIN, null);
      const filter = getTenantFilter(session);
      expect(filter).toBeNull();
    });

    it("should return outletId filter for OWNER", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      const filter = getTenantFilter(session);
      expect(filter).toEqual({
        outletId: "outlet-1",
        role: Role.OWNER,
      });
    });

    it("should return outletId filter for STAFF", () => {
      const session = createMockSession(Role.STAFF, "outlet-1");
      const filter = getTenantFilter(session);
      expect(filter).toEqual({
        outletId: "outlet-1",
        role: Role.STAFF,
      });
    });

    it("should throw error if OWNER missing outletId", () => {
      const session = createMockSession(Role.OWNER, null);
      expect(() => getTenantFilter(session)).toThrow("Missing outletId");
    });

    it("should throw error if STAFF missing outletId", () => {
      const session = createMockSession(Role.STAFF, null);
      expect(() => getTenantFilter(session)).toThrow("Missing outletId");
    });

    it("should return null for null session", () => {
      const filter = getTenantFilter(null);
      expect(filter).toBeNull();
    });
  });

  describe("buildTenantWhere", () => {
    it("should add outletId filter for OWNER", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      const where = buildTenantWhere(session, { status: "ACTIVE" });
      expect(where).toEqual({
        status: "ACTIVE",
        outletId: "outlet-1",
      });
    });

    it("should add outletId filter for STAFF", () => {
      const session = createMockSession(Role.STAFF, "outlet-2");
      const where = buildTenantWhere(session, { status: "PENDING" });
      expect(where).toEqual({
        status: "PENDING",
        outletId: "outlet-2",
      });
    });

    it("should not add outletId filter for SUPERADMIN", () => {
      const session = createMockSession(Role.SUPERADMIN, null);
      const where = buildTenantWhere(session, { status: "ACTIVE" });
      expect(where).toEqual({
        status: "ACTIVE",
      });
      expect(where.outletId).toBeUndefined();
    });

    it("should work with empty additional where", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      const where = buildTenantWhere(session);
      expect(where).toEqual({
        outletId: "outlet-1",
      });
    });
  });

  describe("verifyTenantAccess", () => {
    it("should allow SUPERADMIN to access any outlet", () => {
      const session = createMockSession(Role.SUPERADMIN, null);
      expect(() => verifyTenantAccess(session, "outlet-1")).not.toThrow();
      expect(() => verifyTenantAccess(session, "outlet-2")).not.toThrow();
    });

    it("should allow OWNER to access their own outlet", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      expect(() => verifyTenantAccess(session, "outlet-1")).not.toThrow();
    });

    it("should deny OWNER access to other outlets", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      expect(() => verifyTenantAccess(session, "outlet-2")).toThrow(
        "Cannot access this outlet"
      );
    });

    it("should allow STAFF to access their own outlet", () => {
      const session = createMockSession(Role.STAFF, "outlet-1");
      expect(() => verifyTenantAccess(session, "outlet-1")).not.toThrow();
    });

    it("should deny STAFF access to other outlets", () => {
      const session = createMockSession(Role.STAFF, "outlet-1");
      expect(() => verifyTenantAccess(session, "outlet-2")).toThrow(
        "Cannot access this outlet"
      );
    });

    it("should throw error for null session", () => {
      expect(() => verifyTenantAccess(null, "outlet-1")).toThrow(
        "Authentication required"
      );
    });
  });

  describe("requireOutletId", () => {
    it("should return outletId for OWNER", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      const outletId = requireOutletId(session);
      expect(outletId).toBe("outlet-1");
    });

    it("should return outletId for STAFF", () => {
      const session = createMockSession(Role.STAFF, "outlet-2");
      const outletId = requireOutletId(session);
      expect(outletId).toBe("outlet-2");
    });

    it("should return empty string for SUPERADMIN without outletId", () => {
      const session = createMockSession(Role.SUPERADMIN, null);
      const outletId = requireOutletId(session);
      expect(outletId).toBe("");
    });

    it("should throw error for OWNER without outletId", () => {
      const session = createMockSession(Role.OWNER, null);
      expect(() => requireOutletId(session)).toThrow("Missing outletId");
    });

    it("should throw error for null session", () => {
      expect(() => requireOutletId(null)).toThrow("Authentication required");
    });
  });

  describe("canAccessOutlet", () => {
    it("should return true for SUPERADMIN accessing any outlet", () => {
      const session = createMockSession(Role.SUPERADMIN, null);
      expect(canAccessOutlet(session, "outlet-1")).toBe(true);
      expect(canAccessOutlet(session, "outlet-2")).toBe(true);
    });

    it("should return true for OWNER accessing their own outlet", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      expect(canAccessOutlet(session, "outlet-1")).toBe(true);
    });

    it("should return false for OWNER accessing other outlet", () => {
      const session = createMockSession(Role.OWNER, "outlet-1");
      expect(canAccessOutlet(session, "outlet-2")).toBe(false);
    });

    it("should return true for STAFF accessing their own outlet", () => {
      const session = createMockSession(Role.STAFF, "outlet-1");
      expect(canAccessOutlet(session, "outlet-1")).toBe(true);
    });

    it("should return false for STAFF accessing other outlet", () => {
      const session = createMockSession(Role.STAFF, "outlet-1");
      expect(canAccessOutlet(session, "outlet-2")).toBe(false);
    });

    it("should return false for null session", () => {
      expect(canAccessOutlet(null, "outlet-1")).toBe(false);
    });
  });
});
