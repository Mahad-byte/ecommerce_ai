import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }
}
