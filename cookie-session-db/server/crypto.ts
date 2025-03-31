import "server-only"
import { SignJWT, jwtVerify } from "jose"

const secretKey = process.env.SESSION_SECRET || "your-secret-key-at-least-32-chars-long"
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey)
}

export async function decrypt(token: string | undefined = "") {
  try {
    if (!token) return null
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    })
    return payload
  } catch (error) {
    console.error("Failed to decrypt token:", error)
    return null
  }
}

