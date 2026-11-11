// Shared between NextAuth (lib/auth.ts) and the edge middleware so that
// tokens signed by one can always be verified by the other — even when
// NEXTAUTH_SECRET is not set in the environment.
export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || "pb3d-hub-fallback-secret-yjMFxp52e4QJ5adoXkE4MTfOfm4tlp8bGIjcwUbXizQ"
