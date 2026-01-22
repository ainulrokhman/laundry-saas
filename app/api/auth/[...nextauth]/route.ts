/**
 * NextAuth.js API Route Handler
 * Handles all authentication endpoints (/api/auth/signin, /api/auth/signout, etc.)
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
