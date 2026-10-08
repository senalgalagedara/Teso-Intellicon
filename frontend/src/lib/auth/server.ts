import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

// Fallback is provided so Next.js static build workers do not fail during module evaluation
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://placeholder.neonauth.tech/neondb/auth",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "default_build_secret_must_be_at_least_32_chars_long_123456",
  },
});
