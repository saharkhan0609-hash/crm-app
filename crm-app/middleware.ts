import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect every route except login, signup, NextAuth API, static files
  matcher: [
    "/((?!login|signup|api/auth|api/register|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
