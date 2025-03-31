import { type NextRequest, NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/settings"]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get("session-id")?.value

  // If there's no session cookie, redirect to login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Continue to the protected route
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}

