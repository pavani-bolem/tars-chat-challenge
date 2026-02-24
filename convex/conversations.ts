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

// 🌟 FIXED: Group-Aware Typing Indicator
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

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Find the latest typing timestamp from ANYONE else in the chat
    const otherMembers = memberships.filter(m => m.userId !== currentUser._id);
    const latestTyping = Math.max(...otherMembers.map(m => m.typingUntil || 0), 0);
    
    return latestTyping;
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

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User not found");

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      groupName: args.name,
      adminId: me._id,
    });

    await ctx.db.insert("conversationMembers", {
      userId: me._id,
      conversationId,
      typingUntil: 0,
    });

    for (const memberId of args.memberIds) {
      await ctx.db.insert("conversationMembers", {
        userId: memberId,
        conversationId,
        typingUntil: 0,
      });
    }

    return conversationId;
  },
});

export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();

    const conversationsWithDetails = await Promise.all(
      memberships.map(async (m) => {
        const conversation = await ctx.db.get(m.conversationId);
        if (!conversation) return null;

        const allMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
          .collect();

        if (conversation.isGroup) {
          return {
            _id: conversation._id,
            isGroup: true,
            name: conversation.groupName ?? "Unnamed Group",
            memberCount: allMembers.length,
            imageUrl: null, 
          };
        }

        const otherMember = allMembers.find((mem) => mem.userId !== me._id);
        if (!otherMember) return null;

        const otherUser = await ctx.db.get(otherMember.userId);
        
        return {
          _id: conversation._id,
          isGroup: false,
          name: otherUser?.name ?? "Unknown User",
          imageUrl: otherUser?.imageUrl ?? null,
          isOnline: otherUser?.isOnline ?? false,
        };
      })
    );

    return conversationsWithDetails.filter((conv) => conv !== null);
  },
});

// 🌟 NEW: Get details for the Chat Header (Works for 1-on-1 AND Groups)
export const getDetails = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    if (conversation.isGroup) {
      return {
        name: conversation.groupName ?? "Group Chat",
        isGroup: true,
        imageUrl: null,
      };
    }

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
      .collect();
      
    const otherMember = memberships.find((m) => m.userId !== me._id);
    if (!otherMember) return null;

    const otherUser = await ctx.db.get(otherMember.userId);
    return {
      name: otherUser?.name ?? "Unknown User",
      isGroup: false,
      imageUrl: otherUser?.imageUrl ?? null,
      isOnline: otherUser?.isOnline ?? false,
    };
  }
});