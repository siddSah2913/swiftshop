// Extra fields we attach to NextAuth's built-in types (user id in the session
// and JWT) so every call site stays fully typed with strict mode on.

import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
  }

  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// Note: `next-auth/jwt` re-exports JWT from @auth/core, so augmenting it does
// not merge — the user id is carried in the built-in `token.sub` instead.