"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "next-themes";

export function Sidebar({ onSelectConversation }: { onSelectConversation?: (id: Id<"conversations">) => void }) {
  // Queries
  const users = useQuery(api.users.getUsers);
  const conversations = useQuery(api.conversations.getMyConversations);
  const unreadCounts = useQuery(api.conversations.getUnreadCounts) || {};
  
  // Mutations
  const startChat = useMutation(api.conversations.createOrGet);
  const createGroup = useMutation(api.conversations.createGroup);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // 🌟 NEW: Group & New Chat States
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);
  // Listen for hardware back button to close the "New Chat" view
  useEffect(() => {
    const handlePopState = () => {
      if (isCreating) {
        setIsCreating(false);
        setIsSubmitting(false);
        setSelectedUsers([]);
        setGroupName("");
        setError("");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isCreating]);

  // Filter conversations for the main view
  const filteredConversations = conversations?.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter users for the "New Chat/Group" view
  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: Id<"users">) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // 🌟 NEW: Graceful Error Handling & Loading State for Group Creation
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }
    if (selectedUsers.length < 2) {
      setError("Please select at least 2 other people.");
      return;
    }

    setIsSubmitting(true);
    setError(""); // Clear previous errors
    try {
      const convId = await createGroup({ name: groupName.trim(), memberIds: selectedUsers });
      
      // Pop the 'new-chat' state off the phone's history
      window.history.back();
      
      // Open the chat window a split second later
      setTimeout(() => {
        setIsCreating(false);
        setGroupName("");
        setSelectedUsers([]);
        if (onSelectConversation) onSelectConversation(convId);
      }, 50);

    } catch (err) {
      setError("Failed to create group. Please check your connection and try again.");
      setIsSubmitting(false); 
    }
     finally {
      setIsSubmitting(false); // Remove loading spinner
    }
  };

  return (
    <div className="w-full h-full border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-800 flex flex-col transition-colors duration-200 relative shrink-0">
      
      {/* HEADER */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b bg-white dark:bg-gray-950 dark:border-gray-800 transition-colors duration-200 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {isCreating ? "New Chat" : "Chats"}
          </h2>
          
          <div className="flex items-center gap-3">
            {!isCreating && (
              <button 
                // 🌟 FIXED: Push a history state before setting isCreating to true
                onClick={() => {
                  window.history.pushState({ view: "new-chat" }, "");
                  setIsCreating(true);
                }}
                className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                title="New Chat or Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}

            {mounted ? (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                )}
              </button>
            ) : <div className="w-9 h-9"></div>}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <input
          type="text"
          placeholder={isCreating ? "Search contacts..." : "Search chats..."}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-white border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 🌟 MAIN AREA (Toggles between Inbox and "New Chat" view) */}
      <div className="flex-1 overflow-y-auto">
        
        {/* --- VIEW 1: CREATING A NEW CHAT / GROUP --- */}
        {isCreating ? (
          <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200">
            <button 
              onClick={() => window.history.back()} 
              className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 w-fit hover:underline"
            >
              ← Back to Inbox
            </button>

            {/* NEW: Toggle between 1-on-1 and Group Mode */}
            {!isSubmitting && selectedUsers.length === 0 ? (
              <button onClick={() => setIsSubmitting(true)} className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900 border-dashed font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                Create New Group
              </button>
            ) : isSubmitting && selectedUsers.length >= 0 ? (
              // Group Creation Form
              <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border dark:border-gray-800 shadow-sm flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Create a Group</h3>
                <input type="text" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                {error && <p className="text-red-500 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
                <button onClick={handleCreateGroup} disabled={selectedUsers.length < 2 || !groupName.trim()} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all">
                  Confirm Group
                </button>
              </div>
            ) : null}

            <div className="mt-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{isSubmitting ? "Select Members (2+)" : "Start 1-on-1 Chat"}</h3>
              {users === undefined ? (
                [1, 2, 3].map(i => <div key={i} className="flex gap-3 p-2 animate-pulse"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mt-3"></div></div>)
              ) : (
                filteredUsers?.map((user) => (
                  <div 
                    key={user._id} 
                    onClick={async () => {
                      if (isSubmitting) {
                        toggleUserSelection(user._id);
                      } else {
                        const conversationId = await startChat({ otherUserId: user._id });
                        
                        // 🌟 NEW: Pop the state off the history stack
                        window.history.back();
                        
                        setTimeout(() => {
                          setIsCreating(false);
                          if (onSelectConversation) onSelectConversation(conversationId);
                        }, 50);
                      }
                    }} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    {isSubmitting && <input type="checkbox" checked={selectedUsers.includes(user._id)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />}
                    <img src={user.imageUrl || "/placeholder.png"} className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) :

        /* --- VIEW 2: STANDARD INBOX --- */
        conversations === undefined ? (
          // 🌟 NEW: Skeleton Loaders for Conversations
          <div className="p-4 flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800/50 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="font-medium text-gray-700 dark:text-gray-300">No chats yet</p>
            <p className="text-sm mt-1 mb-4">Click the + icon to start a conversation or create a group.</p>
          </div>
        ) : (
          filteredConversations?.map((conv) => (
            <div
              key={conv._id}
              onClick={() => { if (onSelectConversation) onSelectConversation(conv._id); }}
              className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 transition-colors"
            >
              <div className="relative shrink-0">
                {conv.isGroup ? (
                  // Group Icon
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  </div>
                ) : (
                  // User Avatar
                  <>
                    <img src={conv.imageUrl || "/placeholder.png"} className="w-12 h-12 rounded-full object-cover" />
                    {conv.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>}
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col pr-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {conv.name || "Unknown User"}
                  </h3>
                  {unreadCounts[conv._id] > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ml-2 shrink-0">
                      {unreadCounts[conv._id]}
                    </span>
                  )}
                </div>
                {conv.isGroup && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{conv.memberCount} members</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}