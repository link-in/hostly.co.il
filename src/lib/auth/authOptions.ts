import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { getUserByEmailForAuth, verifyPassword, toAuthUser, findOrCreateGoogleUser } from './getUsersDb'
import { getActiveSubscription } from './subscriptionDb'
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        const user = await getUserByEmailForAuth(credentials.email)
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
    signIn: '/',
    signOut: '/',
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
    async jwt({ token, user, account, profile, trigger, session }) {
      // Initial sign in via Google OAuth
      if (account?.provider === 'google' && profile?.email) {
        const displayName = (profile as { name?: string }).name ?? profile.email
        const authUser = await findOrCreateGoogleUser(profile.email, displayName)
        if (authUser) {
          token.id = authUser.id
          token.email = authUser.email
          token.displayName = authUser.displayName
          token.firstName = authUser.firstName
          token.lastName = authUser.lastName
          token.propertyId = authUser.propertyId
          token.roomId = authUser.roomId
          token.landingPageUrl = authUser.landingPageUrl
          token.phoneNumber = authUser.phoneNumber
          token.role = authUser.role
          token.isDemo = authUser.isDemo
          token.beds24Token = authUser.beds24Token
          token.beds24RefreshToken = authUser.beds24RefreshToken
          token.checkInSettings = authUser.checkInSettings
          token.issuedAt = Date.now()
          // Admins and demo users bypass subscription checks
          if (authUser.role === 'admin' || authUser.isDemo) {
            token.subscriptionStatus = 'active'
            token.trialEndsAt = undefined
            token.subscriptionPlanId = undefined
          } else {
            const sub = await getActiveSubscription(authUser.id)
            token.subscriptionStatus = sub?.status ?? 'expired'
            token.trialEndsAt = sub?.expires_at ?? undefined
            token.subscriptionPlanId = sub?.plan_id ?? undefined
          }
        }
        return token
      }

      // Initial sign in via Credentials
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
        token.checkInSettings = user.checkInSettings
        token.issuedAt = Date.now()
        // Admins and demo users bypass subscription checks
        if (user.role === 'admin' || user.isDemo) {
          token.subscriptionStatus = 'active'
          token.trialEndsAt = undefined
          token.subscriptionPlanId = undefined
        } else {
          const sub = await getActiveSubscription(user.id)
          token.subscriptionStatus = sub?.status ?? 'expired'
          token.trialEndsAt = sub?.expires_at ?? undefined
          token.subscriptionPlanId = sub?.plan_id ?? undefined
        }
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
        }
        if (session.checkInSettings !== undefined) {
          token.checkInSettings = session.checkInSettings
        }
        if (session.propertyId !== undefined) {
          token.propertyId = session.propertyId
        }
        if (session.roomId !== undefined) {
          token.roomId = session.roomId
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Require only id, email, displayName, role so admin users (without propertyId/roomId) can log in
      if (token && token.id && token.email && token.displayName && token.role) {
        session.user = {
          id: token.id,
          email: token.email,
          displayName: token.displayName,
          firstName: token.firstName as string | undefined,
          lastName: token.lastName as string | undefined,
          propertyId: (token.propertyId as string) ?? '',
          roomId: (token.roomId as string) ?? '',
          landingPageUrl: token.landingPageUrl as string | undefined,
          phoneNumber: token.phoneNumber as string | undefined,
          role: token.role as 'admin' | 'owner',
          isDemo: token.isDemo as boolean | undefined,
          beds24Token: token.beds24Token as string | undefined,
          beds24RefreshToken: token.beds24RefreshToken as string | undefined,
          checkInSettings: token.checkInSettings as any,
          subscriptionStatus: token.subscriptionStatus as any,
          trialEndsAt: token.trialEndsAt as string | undefined,
          subscriptionPlanId: token.subscriptionPlanId as string | undefined,
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
