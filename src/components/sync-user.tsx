"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export function SyncUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const storeUser = useMutation(api.users.store);
  const markOnline = useMutation(api.users.markOnline);
  const markOffline = useMutation(api.users.markOffline);

  // 1. Initial User Sync
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      storeUser().catch(console.error);
    }
  }, [isLoaded, isSignedIn, storeUser, user]);

  // 2. Presence System (Online/Offline Tracking)
  useEffect(() => {
    if (!isSignedIn) return;

    // Mark online when component mounts
    markOnline();

    // Listen for tab switching / minimizing
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      } else {
        markOnline();
      }
    };

    // Listen for the browser window closing or refreshing
    const handleBeforeUnload = () => {
      markOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup and mark offline when the component unmounts (e.g., logging out)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      markOffline();
    };
  }, [isSignedIn, markOnline, markOffline]);

  return null;
}