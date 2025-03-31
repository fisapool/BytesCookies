import { type NextRequest, NextResponse } from "next/server"
import { storeCookies, getSession } from "@/server/session-store"

export async function POST(request: NextRequest) {
  try {
    const cookieData = await request.json()

    // Store cookies in the database session
    await storeCookies(cookieData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error syncing cookies:", error)
    return NextResponse.json({ success: false, error: "Failed to sync cookies" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get the current session with cookie data
    const session = await getSession()

    if (!session || !session.cookieData) {
      return NextResponse.json({ cookies: {} })
    }

    return NextResponse.json({ cookies: session.cookieData })
  } catch (error) {
    console.error("Error retrieving cookies:", error)
    return NextResponse.json({ success: false, error: "Failed to retrieve cookies" }, { status: 500 })
  }
}

