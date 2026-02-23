"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";

export function ChatWindow({ 
  conversationId,
  onBack 
}: { 
  conversationId: Id<"conversations">;
  onBack?: () => void;
}) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🌟 NEW: Track which message is currently clicked/selected
  const [selectedMessageId, setSelectedMessageId] = useState<Id<"messages"> | null>(null);
  
  // Fetch messages, the current user, AND the other user
  const messages = useQuery(api.messages.list, { conversationId });
  const me = useQuery(api.users.getMe);
  const otherUser = useQuery(api.users.getOtherUser, { conversationId });
  
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.remove);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper function to format the timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage({ content: newMessage, conversationId });
    setNewMessage(""); 
    setSelectedMessageId(null); // Hide any open delete buttons when sending a new message
  };

  return (
    // If the user clicks anywhere else in the chat window, deselect the message
    <div className="flex flex-col h-full w-full bg-white" onClick={() => setSelectedMessageId(null)}>
      
      {/* 🌟 CHAT HEADER 🌟 */}
      <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm z-10">
        
        {/* Mobile Back Button */}
        {onBack && (
          <button 
            onClick={onBack}
            className="md:hidden p-2 -ml-2 mr-1 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        {otherUser === undefined ? (
          // Loading skeleton while fetching user data
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : otherUser === null ? (
          <h3 className="font-semibold text-lg text-gray-800">User Not Found</h3>
        ) : (
          <>
            {/* Avatar with Online Indicator */}
            <div className="relative">
              <img
                src={otherUser.imageUrl || "/placeholder.png"}
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {otherUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            
            {/* Name and Status Text */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-gray-800 leading-tight">{otherUser.name}</h3>
              <span className="text-xs text-gray-500">
                {otherUser.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        
        {messages === undefined || me === undefined ? (
          // Loading State
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          // Empty State: No messages in this conversation
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-gray-800 font-semibold text-lg mb-1">It's quiet here...</h3>
              <p className="text-gray-500 text-sm">Say hello to start the conversation with {otherUser?.name || "them"}!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === me?._id;
            // Check if THIS specific message is the one that was clicked
            const isSelected = selectedMessageId === msg._id;

            return (
              <div 
                key={msg._id} 
                className={`flex w-full items-center ${isMe ? "justify-end" : "justify-start"}`}
              >
                {/* 🌟 DELETE BUTTON: Only shows if it's your message, not deleted, and CURRENTLY CLICKED */}
                {isMe && !msg.isDeleted && isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents the click from instantly deselecting the message
                      deleteMessage({ messageId: msg._id });
                      setSelectedMessageId(null);
                    }}
                    className="mr-2 px-3 py-1.5 bg-red-100 text-red-600 font-medium rounded-lg text-xs hover:bg-red-200 transition-colors shadow-sm"
                  >
                    Delete
                  </button>
                )}

                <div 
                  // Toggle selection when the message bubble is clicked
                  onClick={(e) => {
                    e.stopPropagation(); // Keep click from reaching the main container
                    setSelectedMessageId(isSelected ? null : msg._id);
                  }}
                  className={`p-3 rounded-2xl max-w-[70%] text-sm shadow-sm flex flex-col cursor-pointer transition-transform active:scale-[0.98] ${
                    msg.isDeleted
                      ? "bg-gray-100 text-gray-500 italic" 
                      : isMe 
                      ? "bg-blue-600 text-white rounded-br-sm" 
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm" 
                  }`}
                >
                  <p>{msg.isDeleted ? "This message was deleted" : msg.content}</p>
                  
                  {/* The Timestamp */}
                  <span 
                    className={`text-[10px] self-end mt-1 ${
                      msg.isDeleted 
                        ? "text-gray-400" 
                        : isMe 
                        ? "text-blue-200" 
                        : "text-gray-400" 
                    }`}
                  >
                    {formatTime(msg._creationTime)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="p-4 bg-white border-t" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setSelectedMessageId(null)} // Hide delete button if they start typing
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 bg-gray-100 border-transparent rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}