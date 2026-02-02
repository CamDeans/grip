import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      /** Set by auth callbacks when user is admin (from DB or ADMIN_EMAILS). */
      role?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name?: string
  }
}
