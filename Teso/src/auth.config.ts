import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/plan');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnAuth && !nextUrl.pathname.includes('/auth/error')) {
        // Redirect to dashboard if already logged in based on role
        return Response.redirect(new URL('/plan', nextUrl));
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.sub = user.id; // Ensure sub matches DB ID
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
