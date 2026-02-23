"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function Sidebar({ onSelectConversation }: { onSelectConversation?: (id: Id<"conversations">) => void }) {
  const users = useQuery(api.users.getUsers);
  const startChat = useMutation(api.conversations.createOrGet);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full border-r bg-gray-50 flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
          <UserButton afterSignOutUrl="/" />
        </div>
        <input
          type="text"
          placeholder="Search users..."
          className="w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {users === undefined ? (
          // 1. Loading State
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm">Loading contacts...</p>
          </div>
        ) : users.length === 0 ? (
          // 2. Empty State: No users in the database
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium text-gray-700">No contacts yet</p>
            <p className="text-sm mt-1">When others join the app, they'll appear here.</p>
          </div>
        ) : filteredUsers?.length === 0 ? (
          // 3. Empty State: Search returned no results
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">No results found for "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery("")} 
              className="mt-2 text-blue-600 text-sm hover:underline font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          // 4. Data State: Render the users
          filteredUsers?.map((user) => (
            <div
              key={user._id}
              onClick={async () => {
                const conversationId = await startChat({ otherUserId: user._id });
                if (onSelectConversation) {
                  onSelectConversation(conversationId);
                }
              }}
              className="p-4 border-b hover:bg-gray-100 cursor-pointer flex items-center gap-3 transition-colors"
            >
              <div className="relative">
                <img
                  src={user.imageUrl || "/placeholder.png"}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </h3>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}