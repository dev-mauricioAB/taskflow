import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const roles: string[] = token?.roles ?? [];
    const path = req.nextUrl.pathname;

    // Extra guard (authorized already checked token != null)
    if (path.startsWith("/admin") && !roles.includes("admin")) {
      // redirect logged-in non-admins
      return NextResponse.redirect(new URL("/no-permission", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Require auth for all matched routes
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/admin/:path*", // admin area (needs admin)
    "/((?!api/auth|_next|favicon.ico).*)", // everything else, just needs auth
  ],
};
