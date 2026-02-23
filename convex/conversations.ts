import { v } from "convex/values";
import { mutation, query} from "./_generated/server";

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

export const setTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    // Find the current user's membership in this chat
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId_and_conversationId", (q) => 
        q.eq("userId", user._id).eq("conversationId", args.conversationId)
      )
      .unique();

    if (membership) {
      // Set the typing expiration to 2 seconds from right now
      await ctx.db.patch(membership._id, { typingUntil: Date.now() + 2000 });
    }
  }
});

export const getTypingStatus = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!currentUser) return 0;

    // Get all members of this chat
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Find the OTHER person
    const otherMember = memberships.find(m => m.userId !== currentUser._id);
    
    // Return their expiration timestamp (or 0 if they haven't typed)
    return otherMember?.typingUntil || 0;
  }
});

export const markRead = mutation({
  args: { 
    conversationId: v.id("conversations"), 
    messageId: v.id("messages") 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId_and_conversationId", (q) => 
        q.eq("userId", user._id).eq("conversationId", args.conversationId)
      )
      .unique();

    if (membership) {
      await ctx.db.patch(membership._id, { lastReadMessageId: args.messageId });
    }
  }
});

export const getUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return {};

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const counts: Record<string, number> = {};

    for (const mem of memberships) {
      const allMembers = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", mem.conversationId))
        .collect();
        
      const otherMember = allMembers.find(m => m.userId !== user._id);
      if (!otherMember) continue;

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", mem.conversationId))
        .collect();

      let unread = 0;
      if (mem.lastReadMessageId) {
        const lastReadMsg = await ctx.db.get(mem.lastReadMessageId);
        if (lastReadMsg) {
          // Count messages sent AFTER your last read message by the OTHER person
          unread = messages.filter(m => m._creationTime > lastReadMsg._creationTime && m.senderId !== user._id).length;
        }
      } else {
        // If never read, all messages from the other person are unread
        unread = messages.filter(m => m.senderId !== user._id).length;
      }
      
      counts[otherMember.userId] = unread;
    }
    
    return counts;
  }
});