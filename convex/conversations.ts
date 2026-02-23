import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createOrGet = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // 1. Check if a 1-on-1 conversation already exists
    const existingMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
      .collect();

    for (const membership of existingMemberships) {
      const conversation = await ctx.db.get(membership.conversationId);
      if (conversation && !conversation.isGroup) {
        const otherMember = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
          .filter((q) => q.eq(q.field("userId"), args.otherUserId))
          .unique();

        if (otherMember) return conversation._id;
      }
    }

    // 2. If not, create a new one
    const conversationId = await ctx.db.insert("conversations", { isGroup: false });

    await ctx.db.insert("conversationMembers", {
      userId: currentUser._id,
      conversationId,
    });
    await ctx.db.insert("conversationMembers", {
      userId: args.otherUserId,
      conversationId,
    });

    return conversationId;
  },
});