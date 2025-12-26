import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'openid email profile',
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            console.log('NextAuth signIn callback triggered')
            console.log('Account provider:', account?.provider)
            console.log('Account has id_token:', !!account?.id_token)
            console.log('Account keys:', Object.keys(account || {}))

            if (account?.provider === "google" && account.id_token) {
                try {
                    console.log('Calling backend authentication with id_token')
                    // Call backend to authenticate and get JWT
                    // Backend will automatically create user account if it doesn't exist
                    const response = await fetch("http://localhost:8080/api/auth/google", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            idToken: account.id_token,
                        }),
                    })

                    if (!response.ok) {
                        const errorText = await response.text()
                        console.error("Backend authentication failed:", response.status, errorText)
                        // Log more details for debugging
                        console.error("Response status:", response.status)
                        console.error("Response headers:", Object.fromEntries(response.headers.entries()))
                        return false
                    }

                    const data = await response.json()
                    console.log("Backend auth response:", data)

                    if (data.success && data.data) {
                        // Store JWT token in user object
                        user.accessToken = data.data.token
                        user.userId = data.data.userId
                        return true
                    }

                    console.error("Unexpected response format:", data)
                    return false
                } catch (error) {
                    console.error("Error during sign in:", error)
                    if (error instanceof Error) {
                        console.error("Error message:", error.message)
                        console.error("Error stack:", error.stack)
                    }
                    return false
                }
            }
            console.error("Missing Google account or id_token")
            return false
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user && user.accessToken) {
                token.accessToken = user.accessToken
                token.userId = user.userId
            }
            return token
        },
        async session({ session, token }) {
            // Send properties to the client
            if (session.user) {
                session.user.accessToken = token.accessToken as string
                session.user.userId = token.userId as string
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // After successful sign-in, redirect to home page
            if (url === baseUrl || url.startsWith(baseUrl + "/")) {
                return url
            }
            return baseUrl
        },
    },
    pages: {
        signIn: "/login",
        error: "/login", // Redirect errors back to login page
    },
    secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Extend NextAuth types
declare module "next-auth" {
    interface User {
        accessToken?: string
        userId?: string
    }
    interface Session {
        user: {
            name?: string | null
            email?: string | null
            image?: string | null
            accessToken?: string
            userId?: string
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string
        userId?: string
    }
}

