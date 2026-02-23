import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const send = mutation({
  args: { 
    content: v.string(), 
    conversationId: v.id("conversations") 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.insert("messages", {
      content: args.content,
      senderId: user._id,
      conversationId: args.conversationId,
      isDeleted: false,
    });
  },
});

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // 1. Find the message
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // 2. Security Check: Only the sender can delete their own message
    if (message.senderId !== user._id) {
      throw new Error("Unauthorized");
    }

    // 3. Soft Delete: Update the boolean instead of deleting the row
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
    });
  },
});