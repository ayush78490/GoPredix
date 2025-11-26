import { NextAuthOptions } from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

export const authOptions: NextAuthOptions = {
    providers: [
        TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            version: '2.0', // Use OAuth 2.0
            authorization: {
                url: 'https://twitter.com/i/oauth2/authorize',
                params: {
                    scope: 'tweet.read users.read offline.access',
                }
            },
            // Explicitly set the token endpoint
            token: 'https://api.twitter.com/2/oauth2/token',
            // User info endpoint
            userinfo: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Store Twitter data in session
            if (account?.provider === 'twitter' && profile) {
                return true
            }
            return true
        },
        async session({ session, token }) {
            // Add Twitter data to session
            if (token.twitter) {
                session.twitter = token.twitter
            }
            return session
        },
        async jwt({ token, account, profile }) {
            // Persist Twitter data in JWT token
            if (account?.provider === 'twitter' && profile) {
                const twitterProfile = profile as any
                token.twitter = {
                    id: twitterProfile.data?.id || twitterProfile.id || '',
                    username: twitterProfile.data?.username || twitterProfile.username || '',
                    name: twitterProfile.data?.name || twitterProfile.name || '',
                    profile_image_url: twitterProfile.data?.profile_image_url || twitterProfile.profile_image_url || '',
                }
            }
            return token
        },
    },
    pages: {
        signIn: '/profile', // Redirect to profile page after sign in
        error: '/auth/error', // Custom error page
    },
    secret: process.env.NEXTAUTH_SECRET,
    // Add debug mode for development
    debug: process.env.NODE_ENV === 'development',
}

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        twitter?: {
            id: string
            username: string
            name: string
            profile_image_url: string
        }
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        twitter?: {
            id: string
            username: string
            name: string
            profile_image_url: string
        }
    }
}
