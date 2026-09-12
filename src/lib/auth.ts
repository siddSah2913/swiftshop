// NextAuth v5 — email + password login (JWT sessions).
//
// NOTE: the Prisma adapter is intentionally NOT wired in yet. With a
// Credentials provider + JWT session strategy the adapter is not needed
// (we look up the user ourselves in authorize()), which also avoids the
// Prisma-7 / @auth-adapter import friction. Revisit in Phase 5 only if we
// add OAuth providers. See docs/DECISIONS.md.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // self-hosted dev; drop this on Vercel (it sets its own trust)
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // sessions expire after 7 days
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        // Returns the identity object on success, null on failure.
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Persist the user id in the JWT's built-in `sub` field, then expose it on
    // the session. (`sub` is a standard JWT claim — no custom type plumbing.)
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});