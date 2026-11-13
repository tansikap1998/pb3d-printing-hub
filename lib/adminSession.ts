import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

/** True when the request comes from a signed-in admin (env admin or "Admins" tab). */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return !!session?.user?.email && (session.user as any).role === "admin"
}
