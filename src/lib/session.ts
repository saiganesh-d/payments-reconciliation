import { cookies } from "next/headers";
import { prisma } from "./prisma";

// Simple session using a cookie with user ID (for MVP; replace with JWT/NextAuth for production)
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("pc_session");
  if (!sessionCookie) return null;

  try {
    const data = JSON.parse(sessionCookie.value);
    return data as {
      id: string;
      email: string;
      name: string;
      role: "MASTER" | "B_ACCOUNT";
      bAccountId: string | null;
    };
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  bAccountId: string | null;
}) {
  const cookieStore = await cookies();
  cookieStore.set("pc_session", JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("pc_session");
}
