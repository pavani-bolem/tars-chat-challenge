import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users Table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    clerkId: v.string(), // Links Convex user to Clerk auth
    isOnline: v.boolean(),
  }).index("by_clerk_id", ["clerkId"]),

  // 2. Conversations Table
  conversations: defineTable({
    isGroup: v.boolean(),
    name: v.optional(v.string()), // Only used if it's a group chat
  }),

  // 3. Conversation Members Table (Links Users to Conversations)
  conversationMembers: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    lastReadMessageId: v.optional(v.id("messages")), // Helps calculate unread badges later
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_conversationId", ["userId", "conversationId"]),

  // 4. Messages Table
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    isDeleted: v.boolean(), // Soft delete requirement
  }).index("by_conversationId", ["conversationId"]),
});