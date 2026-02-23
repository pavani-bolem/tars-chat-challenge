import { clerkMiddleware } from "@clerk/nextjs/server";

// The simplest setup: runs Clerk on all routes but doesn't force redirects.
// We let the <SignedIn> and <SignedOut> components handle the UI instead.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};