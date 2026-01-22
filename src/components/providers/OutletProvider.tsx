/**
 * Outlet Context Provider
 * 
 * Provides outlet context to client components for multi-tenancy.
 * This ensures client-side components have access to outlet information
 * without needing to fetch it on every render.
 * 
 * Following .cursorrules: Client-side components should use outlet context
 * but never trust client-side outlet_id - always verify on server-side.
 */

"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { ExtendedSession } from "@/types/auth";
import { Role } from "@/types/enums/Role";

/**
 * Outlet context type
 */
interface OutletContextType {
  outletId: string | null;
  role: Role | null;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Create outlet context
 */
const OutletContext = createContext<OutletContextType | undefined>(undefined);

/**
 * Outlet Provider Props
 */
interface OutletProviderProps {
  children: React.ReactNode;
}

/**
 * Outlet Provider Component
 * 
 * Wraps the app with outlet context for client components.
 * Provides outlet information from session.
 */
export function OutletProvider({ children }: OutletProviderProps) {
  const { data: session, status } = useSession();
  const extendedSession = session as ExtendedSession | null;

  const contextValue = useMemo<OutletContextType>(() => {
    const isLoading = status === "loading";
    const isAuthenticated = !!extendedSession;
    const outletId = extendedSession?.outletId || null;
    const role = extendedSession?.role || null;

    return {
      outletId,
      role,
      isSuperAdmin: role === Role.SUPERADMIN,
      isOwner: role === Role.OWNER,
      isStaff: role === Role.STAFF,
      isLoading,
      isAuthenticated,
    };
  }, [extendedSession, status]);

  return (
    <OutletContext.Provider value={contextValue}>
      {children}
    </OutletContext.Provider>
  );
}

/**
 * Hook to use outlet context
 * 
 * @returns OutletContextType
 * @throws Error if used outside OutletProvider
 * 
 * @example
 * const { outletId, isOwner } = useOutlet();
 */
export function useOutlet(): OutletContextType {
  const context = useContext(OutletContext);

  if (context === undefined) {
    throw new Error("useOutlet must be used within OutletProvider");
  }

  return context;
}

/**
 * Hook to get outlet ID
 * 
 * @returns outletId string or null
 */
export function useOutletId(): string | null {
  const { outletId } = useOutlet();
  return outletId;
}

/**
 * Hook to check if user is super admin
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = useOutlet();
  return isSuperAdmin;
}

/**
 * Hook to check if user is owner
 */
export function useIsOwner(): boolean {
  const { isOwner } = useOutlet();
  return isOwner;
}

/**
 * Hook to check if user is staff
 */
export function useIsStaff(): boolean {
  const { isStaff } = useOutlet();
  return isStaff;
}
