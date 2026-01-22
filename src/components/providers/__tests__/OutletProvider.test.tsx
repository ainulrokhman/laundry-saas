/**
 * Tests for Outlet Provider
 * 
 * These tests verify that OutletProvider correctly:
 * 1. Provides outlet context to child components
 * 2. Handles loading states
 * 3. Handles authentication states
 * 4. Provides correct role flags
 * 
 * To run these tests, setup React Testing Library and run:
 * npm test OutletProvider.test.tsx
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { OutletProvider, useOutlet } from "../OutletProvider";
import { Role } from "@/types/enums/Role";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

describe("OutletProvider", () => {
  const TestComponent = () => {
    const { outletId, role, isSuperAdmin, isOwner, isStaff } = useOutlet();
    return (
      <div>
        <div data-testid="outlet-id">{outletId || "null"}</div>
        <div data-testid="role">{role || "null"}</div>
        <div data-testid="is-super-admin">{isSuperAdmin ? "true" : "false"}</div>
        <div data-testid="is-owner">{isOwner ? "true" : "false"}</div>
        <div data-testid="is-staff">{isStaff ? "true" : "false"}</div>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should provide outlet context for OWNER", () => {
    const { useSession } = require("next-auth/react");
    useSession.mockReturnValue({
      data: {
        outletId: "outlet-1",
        role: Role.OWNER,
      },
      status: "authenticated",
    });

    render(
      <OutletProvider>
        <TestComponent />
      </OutletProvider>
    );

    expect(screen.getByTestId("outlet-id")).toHaveTextContent("outlet-1");
    expect(screen.getByTestId("role")).toHaveTextContent(Role.OWNER);
    expect(screen.getByTestId("is-owner")).toHaveTextContent("true");
    expect(screen.getByTestId("is-super-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-staff")).toHaveTextContent("false");
  });

  it("should provide outlet context for STAFF", () => {
    const { useSession } = require("next-auth/react");
    useSession.mockReturnValue({
      data: {
        outletId: "outlet-1",
        role: Role.STAFF,
      },
      status: "authenticated",
    });

    render(
      <OutletProvider>
        <TestComponent />
      </OutletProvider>
    );

    expect(screen.getByTestId("outlet-id")).toHaveTextContent("outlet-1");
    expect(screen.getByTestId("role")).toHaveTextContent(Role.STAFF);
    expect(screen.getByTestId("is-staff")).toHaveTextContent("true");
    expect(screen.getByTestId("is-owner")).toHaveTextContent("false");
    expect(screen.getByTestId("is-super-admin")).toHaveTextContent("false");
  });

  it("should handle loading state", () => {
    const { useSession } = require("next-auth/react");
    useSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    render(
      <OutletProvider>
        <TestComponent />
      </OutletProvider>
    );

    // During loading, values should be null/false
    expect(screen.getByTestId("outlet-id")).toHaveTextContent("null");
  });

  it("should throw error when useOutlet used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useOutlet must be used within OutletProvider");

    consoleSpy.mockRestore();
  });
});
