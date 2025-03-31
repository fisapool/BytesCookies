import "server-only"
import { cookies } from "next/headers"

// Database connection - replace with your actual database client
import { db } from "./db"

// Types for our session
export interface SessionData {
  userId?: string
  preferences?: Record<string, any>
  cookieData?: Record<string, any>
  expiresAt: Date
}

// Generate a unique session ID
function generateSessionId(): string {
  return crypto.randomUUID()
}

// Get the current session ID from cookies
export async function getSessionId(): Promise<string | undefined> {
  const cookieStore = cookies()
  return cookieStore.get("session-id")?.value
}

// Set a session ID in cookies
export async function setSessionId(sessionId: string): Promise<void> {
  const cookieStore = cookies()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + oneWeek)

  cookieStore.set("session-id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  })
}

// Get or create a session ID
export async function getOrCreateSessionId(): Promise<string> {
  const sessionId = await getSessionId()
  if (!sessionId) {
    const newSessionId = generateSessionId()
    await setSessionId(newSessionId)
    return newSessionId
  }
  return sessionId
}

// Create a new session in the database
export async function createSession(data: Partial<SessionData> = {}): Promise<string> {
  const sessionId = await getOrCreateSessionId()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + oneWeek)

  await db.sessions.upsert({
    where: { id: sessionId },
    update: {
      ...data,
      expiresAt,
      updatedAt: new Date(),
    },
    create: {
      id: sessionId,
      ...data,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return sessionId
}

// Get session data from the database
export async function getSession(): Promise<SessionData | null> {
  const sessionId = await getSessionId()
  if (!sessionId) return null

  const session = await db.sessions.findUnique({
    where: { id: sessionId },
  })

  if (!session) return null

  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    await destroySession()
    return null
  }

  return session as SessionData
}

// Update session data in the database
export async function updateSession(data: Partial<SessionData>): Promise<void> {
  const sessionId = await getSessionId()
  if (!sessionId) return

  await db.sessions.update({
    where: { id: sessionId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })
}

// Store cookie data in the session
export async function storeCookies(cookieData: Record<string, any>): Promise<void> {
  const sessionId = await getOrCreateSessionId()

  await db.sessions.upsert({
    where: { id: sessionId },
    update: {
      cookieData,
      updatedAt: new Date(),
    },
    create: {
      id: sessionId,
      cookieData,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

// Destroy the current session
export async function destroySession(): Promise<void> {
  const sessionId = await getSessionId()
  if (!sessionId) return

  await db.sessions.delete({
    where: { id: sessionId },
  })

  const cookieStore = cookies()
  cookieStore.delete("session-id")
}

