"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "next-themes"; 

export function Sidebar({ onSelectConversation }: { onSelectConversation?: (id: Id<"conversations">) => void }) {
  const users = useQuery(api.users.getUsers);
  const unreadCounts = useQuery(api.conversations.getUnreadCounts) || {};
  const startChat = useMutation(api.conversations.createOrGet);
  const [searchQuery, setSearchQuery] = useState("");
  
  // 🌟 FIX: Use resolvedTheme to accurately detect system preferences
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-800 flex flex-col transition-colors duration-200">
      <div className="p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Chats</h2>
          
          <div className="flex items-center gap-4">
            {/* The Theme Toggle Button */}
            {mounted ? (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {resolvedTheme === "dark" ? (
                  // Sun Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  // Moon Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
            ) : (
              // Placeholder to prevent layout shift before mounting
              <div className="w-9 h-9"></div>
            )}
            
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
        <input
          type="text"
          placeholder="Search users..."
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-white border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {users === undefined ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm">Loading contacts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium text-gray-700 dark:text-gray-300">No contacts yet</p>
            <p className="text-sm mt-1">When others join the app, they'll appear here.</p>
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">No results found for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="mt-2 text-blue-600 dark:text-blue-400 text-sm hover:underline font-medium">
              Clear search
            </button>
          </div>
        ) : (
          filteredUsers?.map((user) => (
            <div
              key={user._id}
              onClick={async () => {
                const conversationId = await startChat({ otherUserId: user._id });
                if (onSelectConversation) {
                  onSelectConversation(conversationId);
                }
              }}
              className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3 transition-colors"
            >
              <div className="relative">
                <img
                  src={user.imageUrl || "/placeholder.png"}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex justify-between items-center pr-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.name}
                </h3>
                
                {unreadCounts[user._id] > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCounts[user._id]}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}