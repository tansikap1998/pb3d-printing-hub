import { getServerSession } from "next-auth"
import { authOptions, ALLOWED_EMAILS } from "./auth"

/** True when the request comes from a signed-in admin. */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  return !!email && ALLOWED_EMAILS.includes(email)
}
