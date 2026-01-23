/**
 * NextAuth.js v5 API Route Handler
 * 
 * This route handles all NextAuth.js authentication endpoints.
 * In v5, this is simplified to just export the handlers.
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
