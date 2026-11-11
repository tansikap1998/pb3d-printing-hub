// Server-only Supabase client with the service-role key (bypasses RLS).
// Never import this from a "use client" file.
import { createClient, SupabaseClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const hasServiceRole = !!URL && !!KEY && !URL.includes("placeholder")

let client: SupabaseClient | null = null
export function supabaseAdmin(): SupabaseClient {
  if (!hasServiceRole) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: false } })
  return client
}
