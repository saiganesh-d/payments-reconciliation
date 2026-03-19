import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import { sessionConfig, getMaxDevices } from "./config";

export interface SessionData {
  id: string;
  username: string;
  name: string;
  role: "MASTER" | "B_ACCOUNT";
  bAccountId: string | null;
}

// Generate a secure random token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Get current session from cookie + validate against DB
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();

  // Clean up legacy cookie from old session system
  if (cookieStore.get("pc_session")) {
    cookieStore.delete("pc_session");
  }

  const tokenCookie = cookieStore.get("pc_session_token");
  if (!tokenCookie) return null;

  try {
    const session = await prisma.pc_sessions.findUnique({
      where: { token: tokenCookie.value },
      include: { user: true },
    });

    if (!session) {
      // Token not in DB — stale cookie
      cookieStore.delete("pc_session_token");
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      await prisma.pc_sessions.delete({ where: { id: session.id } });
      cookieStore.delete("pc_session_token");
      return null;
    }

    // Check inactivity timeout
    const timeoutMs = sessionConfig.sessionTimeoutHours * 60 * 60 * 1000;
    const lastActive = session.lastActiveAt.getTime();
    if (Date.now() - lastActive > timeoutMs) {
      await prisma.pc_sessions.delete({ where: { id: session.id } });
      cookieStore.delete("pc_session_token");
      return null;
    }

    // Update last active timestamp (don't await — fire and forget)
    prisma.pc_sessions.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role as "MASTER" | "B_ACCOUNT",
      bAccountId: session.user.bAccountId,
    };
  } catch {
    return null;
  }
}

// Create a new session — enforces device limits
export async function createSession(
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    bAccountId: string | null;
  },
  deviceInfo?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const maxDevices = getMaxDevices(user.role);

  // Clean up expired/inactive sessions for this user first
  const timeoutMs = sessionConfig.sessionTimeoutHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - timeoutMs);
  await prisma.pc_sessions.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { expiresAt: { lt: new Date() } },
        { lastActiveAt: { lt: cutoff } },
      ],
    },
  });

  // Count active sessions
  const activeSessions = await prisma.pc_sessions.findMany({
    where: { userId: user.id },
    orderBy: { lastActiveAt: "asc" },
  });

  if (activeSessions.length >= maxDevices) {
    // Remove oldest sessions to make room
    const sessionsToRemove = activeSessions.slice(0, activeSessions.length - maxDevices + 1);
    await prisma.pc_sessions.deleteMany({
      where: { id: { in: sessionsToRemove.map((s) => s.id) } },
    });
  }

  // Create new session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days max

  await prisma.pc_sessions.create({
    data: {
      userId: user.id,
      token,
      deviceInfo: deviceInfo || null,
      lastActiveAt: new Date(),
      expiresAt,
    },
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set("pc_session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return { success: true };
}

// Destroy current session
export async function destroySession() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("pc_session_token");

  if (tokenCookie) {
    await prisma.pc_sessions.deleteMany({
      where: { token: tokenCookie.value },
    }).catch(() => {});
    cookieStore.delete("pc_session_token");
  }
}

// Get active session count for a user
export async function getActiveSessionCount(userId: string): Promise<number> {
  const timeoutMs = sessionConfig.sessionTimeoutHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - timeoutMs);

  return prisma.pc_sessions.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      lastActiveAt: { gt: cutoff },
    },
  });
}
