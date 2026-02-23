import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get the authenticated user's identity from the Clerk token
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store user without authentication present");
    }

    // 2. Check if we've already saved this user to our Convex database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user !== null) {
      // If the user exists but their name or avatar changed in Clerk, update it
      if (user.name !== identity.name || user.imageUrl !== identity.pictureUrl) {
        await ctx.db.patch(user._id, { 
          name: identity.name ?? "User",
          imageUrl: identity.pictureUrl 
        });
      }
      return user._id;
    }

    // 3. If it's a completely new user, insert them into the database
    return await ctx.db.insert("users", {
      name: identity.name ?? "User",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      clerkId: identity.subject,
      isOnline: true, // We'll handle real-time online status later
    });
  },
});

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    // 1. Get the current logged-in user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // If not logged in, return an empty list
    }

    // 2. Fetch all users from the database
    const users = await ctx.db.query("users").collect();

    // 3. Return everyone EXCEPT the currently logged-in user
    return users.filter((user) => user.clerkId !== identity.subject);
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getOtherUser = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // 1. Get the current logged-in user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return null;

    // 2. Get all members of this specific conversation
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // 3. Find the member who is NOT the current user
    const otherMembership = memberships.find((m) => m.userId !== currentUser._id);
    if (!otherMembership) return null;

    // 4. Return that other user's full profile
    return await ctx.db.get(otherMembership.userId);
  },
});

export const markOnline = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { isOnline: true });
    }
  },
});

export const markOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { isOnline: false });
    }
  },
});