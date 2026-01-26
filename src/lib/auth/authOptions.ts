import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword, toAuthUser } from './getUsersDb'
import type { AuthUser } from './types'

declare module 'next-auth' {
  interface Session {
    user: AuthUser
  }
  interface User extends AuthUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends AuthUser {}
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserByEmail(credentials.email)
        if (!user) {
          return null
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return toAuthUser(user)
      },
    }),
  ],
  pages: {
    signIn: '/dashboard/login',
    signOut: '/dashboard/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  events: {
    async signOut({ token }) {
      // Clear token on signout
      console.log('User signed out:', token?.email)
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.displayName = user.displayName
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.propertyId = user.propertyId
        token.roomId = user.roomId
        token.landingPageUrl = user.landingPageUrl
        token.phoneNumber = user.phoneNumber
        token.role = user.role
        token.isDemo = user.isDemo
        token.beds24Token = user.beds24Token
        token.beds24RefreshToken = user.beds24RefreshToken
        token.issuedAt = Date.now()
        
        // Debug logging
        console.log('[Auth] JWT callback - Initial sign in:', {
          email: user.email,
          role: user.role
        })
      }
      
      // Handle session updates (from update() call)
      if (trigger === 'update' && session) {
        if (session.displayName) {
          token.displayName = session.displayName
        }
        if (session.firstName !== undefined) {
          token.firstName = session.firstName
        }
        if (session.lastName !== undefined) {
          token.lastName = session.lastName
        }
        if (session.landingPageUrl !== undefined) {
          token.landingPageUrl = session.landingPageUrl
        }
        if (session.phoneNumber !== undefined) {
          token.phoneNumber = session.phoneNumber
        }
        if (session.role !== undefined) {
          token.role = session.role
          console.log('[Auth] JWT callback - Role updated:', session.role)
        }
      }
      
      // Debug: Log current token role on every request
      console.log('[Auth] JWT token role:', token.role)
      
      return token
    },
    async session({ session, token }) {
      if (token && token.id && token.email && token.displayName && token.propertyId && token.roomId && token.role) {
        session.user = {
          id: token.id,
          email: token.email,
          displayName: token.displayName,
          firstName: token.firstName as string | undefined,
          lastName: token.lastName as string | undefined,
          propertyId: token.propertyId,
          roomId: token.roomId,
          landingPageUrl: token.landingPageUrl as string | undefined,
          phoneNumber: token.phoneNumber as string | undefined,
          role: token.role as 'admin' | 'owner',
          isDemo: token.isDemo as boolean | undefined,
          beds24Token: token.beds24Token as string | undefined,
          beds24RefreshToken: token.beds24RefreshToken as string | undefined,
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
