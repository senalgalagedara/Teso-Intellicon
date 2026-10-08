import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  // adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  debug: true,
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
        async authorize(credentials) {
          const validatedFields = LoginSchema.safeParse(credentials);
  
          if (validatedFields.success) {
            const { email, password } = validatedFields.data;
            
            const user = await prisma.user.findUnique({
              where: { email }
            });
            
            if (!user || !user.password) return null;
  
            const passwordsMatch = await bcrypt.compare(password, user.password);
  
            if (passwordsMatch) return user;
          }
  
          return null;
        }
      })
  ],
})
