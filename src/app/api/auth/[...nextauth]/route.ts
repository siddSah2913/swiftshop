// NextAuth API route — shadows all /api/auth/* requests (signin, signout, session).
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;