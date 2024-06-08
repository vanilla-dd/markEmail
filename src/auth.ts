import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import { db } from "./db/index";
import { accounts } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "https://www.googleapis.com/auth/gmail.readonly profile email",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const [googleAccount] = await db.query.accounts.findMany({
        where: (accounts, { eq }) =>
          eq(accounts.userId, user.id) && eq(accounts.provider, "google"),
      });
      console.log(googleAccount);
      if (googleAccount.expires_at! * 1000 < Date.now()) {
        // If the access token has expired, try to refresh it
        try {
          // https://accounts.google.com/.well-known/openid-configuration
          // We need the `token_endpoint`.
          const response = await fetch("https://oauth2.googleapis.com/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.AUTH_GOOGLE_ID!,
              client_secret: process.env.AUTH_GOOGLE_SECRET!,
              grant_type: "refresh_token",
              refresh_token: googleAccount.refresh_token!,
            }),
            method: "POST",
          });

          const responseTokens = await response.json();

          if (!response.ok) throw responseTokens;

          await db
            .update(accounts)
            .set({
              access_token: responseTokens.access_token,
              expires_at: Math.floor(
                Date.now() / 1000 + responseTokens.expires_in
              ),
              refresh_token:
                responseTokens.refresh_token ?? googleAccount.refresh_token,
            })
            .where(
              eq(accounts.providerAccountId, googleAccount.providerAccountId)
            );
        } catch (error) {
          console.error("Error refreshing access token", error);
          // The error property can be used client-side to handle the refresh token error
          session.error = "RefreshAccessTokenError";
        }
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET!,
});
declare module "next-auth" {
  interface Session {
    error?: "RefreshAccessTokenError";
  }
}
