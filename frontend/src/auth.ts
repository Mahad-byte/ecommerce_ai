import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { API_URL } from "@/lib/api";

interface DjangoTokens {
  access: string;
  refresh: string;
}

interface DjangoUser {
  id: number;
  username: string;
  email: string;
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<DjangoTokens | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { access: data.access, refresh: refreshToken };
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Django",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const tokenRes = await fetch(`${API_URL}/auth/token/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!tokenRes.ok) return null;
        const tokens: DjangoTokens = await tokenRes.json();

        const meRes = await fetch(`${API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${tokens.access}` },
        });
        if (!meRes.ok) return null;
        const user: DjangoUser = await meRes.json();

        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      const exp = token.accessToken ? decodeJwtExp(token.accessToken) : null;
      const expired = exp !== null && Date.now() / 1000 > exp;
      if (token.refreshToken && expired) {
        return refreshAccessToken(token.refreshToken).then((fresh) => {
          if (fresh) {
            token.accessToken = fresh.access;
            token.refreshToken = fresh.refresh;
          } else {
            token.error = "RefreshTokenError";
          }
          return token;
        });
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
