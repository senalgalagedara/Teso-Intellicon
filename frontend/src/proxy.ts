import { auth } from "@/lib/auth/server";

/**
 * Optimistic gate only: it rejects requests with no session before the page
 * renders. It reads the cached session cookie, not the database, so it stays
 * fast and never becomes the place where a role is decided. Every protected
 * page and every Server Action re-checks the role against Postgres.
 */
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/pending/:path*",
  ],
};
