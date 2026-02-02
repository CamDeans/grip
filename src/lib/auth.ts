import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { getServerSession, type NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import clientPromise from './db'
import { compare } from "bcryptjs"
import { Adapter } from "next-auth/adapters"
import { ObjectId } from "mongodb"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === "production") {
            console.warn("[Auth] Credentials callback: missing email or password")
          }
          return null
        }

        try {
          const client = await clientPromise
          // Use same DB as register (lib/mongodb uses DB_NAME 'test')
          const db = client.db(process.env.MONGODB_DB_NAME || "test")
          const user = await db.collection("users").findOne({ email: credentials.email })

          if (!user) {
            if (process.env.NODE_ENV === "production") {
              console.warn("[Auth] Credentials: user not found for email (check MONGODB_URI and DB)")
            }
            return null
          }

          if (!user.password) {
            if (process.env.NODE_ENV === "production") {
              console.warn("[Auth] Credentials: user has no password (OAuth-only account?)")
            }
            return null
          }

          const passwordMatch = await compare(credentials.password, user.password)
          if (!passwordMatch) {
            if (process.env.NODE_ENV === "production") {
              console.warn("[Auth] Credentials: invalid password")
            }
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          }
        } catch (err) {
          console.error("[Auth] Credentials: authorize error", err instanceof Error ? err.message : "unknown")
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // Resolve admin: from DB (user.role / user.isAdmin) or from ADMIN_EMAILS env
        try {
          const client = await clientPromise
          const db = client.db(process.env.MONGODB_DB_NAME || "test")
          const uid = token.id as string
          if (uid) {
            const dbUser = await db.collection('users').findOne({
              _id: new ObjectId(uid)
            }) as { role?: string; isAdmin?: boolean; email?: string } | null
            if (dbUser?.role === 'admin' || dbUser?.isAdmin === true) {
              (session.user as { role?: string }).role = 'admin'
            } else if (
              process.env.ADMIN_EMAILS &&
              session.user?.email &&
              process.env.ADMIN_EMAILS.split(',').map((e: string) => e.trim().toLowerCase()).includes(session.user.email.trim().toLowerCase())
            ) {
              (session.user as { role?: string }).role = 'admin'
            }
          }
        } catch {
          // ignore; session stays without role
        }
      }
      return session
    }
  }
}

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}
