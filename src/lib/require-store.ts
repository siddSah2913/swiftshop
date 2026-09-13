// The multi-tenant boundary. Every dashboard page and action that touches a
// Store's data runs through requireStore(): it guarantees a session, then
// loads ONLY the session owner's store. See webplan.md §5.4 / spec §4.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { StoreModel } from "@/generated/prisma/models";

export type SessionUser = { id: string; name?: string | null; email?: string | null };

export interface AuthContext {
  session: { user: SessionUser };
  store: StoreModel;
}

/** Session + the caller's own store, or a redirect (throws, never returns). */
export async function requireStore(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!store) redirect("/dashboard/onboarding");

  return { session: { user: session.user }, store };
}
