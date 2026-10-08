import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/host') || nextUrl.pathname.startsWith('/candidate');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnAuth && !nextUrl.pathname.includes('/auth/error')) {
        return Response.redirect(new URL('/host', nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
        if (user) {
            token.role = (user as any).role;
            token.sub = user.id;
        }
        return token;
    },
    async session({ session, token }) {
        if (token && session.user) {
            if (token.sub) {
                session.user.id = token.sub;
            }
            (session.user as any).role = token.role;
        }
        return session;
    }
  },
} satisfies NextAuthConfig
