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
  const [isSending, setIsSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<Id<"messages"> | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  
  const lastTypedRef = useRef<number>(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  
  const messages = useQuery(api.messages.list, { conversationId });
  const me = useQuery(api.users.getMe);
  const convDetails = useQuery(api.conversations.getDetails, { conversationId });
  const allUsers = useQuery(api.users.getUsers);
  const otherTypingUntil = useQuery(api.conversations.getTypingStatus, { conversationId });
  
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.remove);
  const setTyping = useMutation(api.conversations.setTyping);
  const markRead = useMutation(api.conversations.markRead);
  const toggleReaction = useMutation(api.messages.toggleReaction);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (me && lastMessage.senderId !== me._id) {
        markRead({ conversationId, messageId: lastMessage._id });
      }
    }
  }, [messages, me, conversationId, markRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessageButton(false);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = isBottom;
    if (isBottom && showNewMessageButton) setShowNewMessageButton(false);
  };

  useEffect(() => {
    if (!messages) return;
    const isNewMessageArrived = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;
    if (isNewMessageArrived) {
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = me && lastMessage.senderId === me._id;
      if (isAtBottomRef.current || isMyMessage) {
        setTimeout(() => scrollToBottom(), 50);
      } else {
        setShowNewMessageButton(true);
      }
    }
  }, [messages, me]);

  useEffect(() => {
    if (!otherTypingUntil) { setIsOtherTyping(false); return; }
    const now = Date.now();
    if (otherTypingUntil > now) {
      setIsOtherTyping(true);
      const timeout = setTimeout(() => setIsOtherTyping(false), otherTypingUntil - now);
      return () => clearTimeout(timeout);
    } else { setIsOtherTyping(false); }
  }, [otherTypingUntil]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setSelectedMessageId(null);
    const now = Date.now();
    if (now - lastTypedRef.current > 1500) {
      setTyping({ conversationId });
      lastTypedRef.current = now;
    }
  };

  // 🌟 FIXED: Graceful error handling and retry logic
  const handleSend = async (e?: React.FormEvent, retryText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = retryText || newMessage;
    if (!textToSend.trim() || isSending) return;

    setIsSending(true);
    if (!retryText) setNewMessage(""); // Clear input immediately for smooth UI
    setFailedMessage(null); // Clear previous errors

    try {
      await sendMessage({ content: textToSend, conversationId });
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      // If it fails, save the text so the user can retry!
      setFailedMessage(textToSend);
      scrollToBottom();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-950 relative overflow-hidden" onClick={() => setSelectedMessageId(null)}>
      
      {/* HEADER */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center gap-3 z-10 shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
        )}
        
        {/* 🌟 FIXED: Using !convDetails instead of convDetails === undefined */}
        {!convDetails ? (
           <div className="animate-pulse flex gap-3"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div><div className="w-24 h-4 mt-3 bg-gray-200 dark:bg-gray-800 rounded"></div></div>
        ) : (
          <>
            <div className="relative">
              {convDetails.isGroup ? (
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                </div>
              ) : (
                <img src={convDetails.imageUrl || "/placeholder.png"} className="w-10 h-10 rounded-full object-cover" />
              )}
              {!convDetails.isGroup && convDetails.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-950"></div>}
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 leading-tight">{convDetails.name}</h3>
              <span className={`text-xs ${isOtherTyping ? "text-blue-500 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                {isOtherTyping ? "someone is typing..." : convDetails.isGroup ? "Group Chat" : convDetails.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* FLOATING BUTTON */}
      {showNewMessageButton && (
        <button onClick={scrollToBottom} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          New messages
        </button>
      )}

      {/* MESSAGES AREA */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-gray-50 dark:bg-gray-900">
        {messages?.map((msg) => {
          const isMe = msg.senderId === me?._id;
          const isSelected = selectedMessageId === msg._id;
          const sender = allUsers?.find(u => u._id === msg.senderId); // Find sender details
          const reactionCounts = (msg.reactions || []).reduce((acc, curr) => {
            acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-full`}>
              
              {/* EMOJI BAR */}
              {isSelected && !msg.isDeleted && (
                <div className="flex gap-1 mb-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 p-1 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-1">
                  {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction({ messageId: msg._id, emoji }); }} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Show Sender Name in Groups */}
              {convDetails?.isGroup && !isMe && !msg.isDeleted && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-10 mb-1">{sender?.name || "User"}</span>
              )}

              <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                
                {/* DELETE BUTTON */}
                {isMe && isSelected && !msg.isDeleted && (
                  <button onClick={(e) => { e.stopPropagation(); deleteMessage({ messageId: msg._id }); setSelectedMessageId(null); }} className="mb-1 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
                    Delete
                  </button>
                )}

                {/* BUBBLE */}
                <div className={`flex gap-2 items-end ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Show Sender Avatar in Groups */}
                  {convDetails?.isGroup && !isMe && !msg.isDeleted && (
                    <img src={sender?.imageUrl || "/placeholder.png"} className="w-8 h-8 rounded-full object-cover shrink-0 mb-1" />
                  )}
                  
                  <div 
                    onClick={(e) => { e.stopPropagation(); setSelectedMessageId(isSelected ? null : msg._id); }}
                    className={`p-3 rounded-2xl shadow-sm flex flex-col cursor-pointer break-words min-w-[60px] ${
                      msg.isDeleted ? "bg-gray-100 dark:bg-gray-800 text-gray-400 italic" :
                      isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.isDeleted ? "This message was deleted" : msg.content}</p>
                    <span className={`text-[10px] self-end mt-1 opacity-70 ${isMe ? "text-blue-100" : "text-gray-400"}`}>
                      {formatTime(msg._creationTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* REACTION CHIPS */}
              {Object.keys(reactionCounts).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1.5 ${convDetails?.isGroup && !isMe ? "ml-10" : ""}`}>
                  {Object.entries(reactionCounts).map(([emoji, count]) => (
                    <div key={emoji} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-full px-2 py-0.5 text-[11px] flex items-center gap-1 shadow-sm">
                      <span>{emoji}</span> <span className="font-semibold text-gray-600 dark:text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 🌟 NEW: Failed Message Bubble */}
        {failedMessage && (
          <div className="flex flex-col items-end max-w-full animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-end gap-2 max-w-[85%] flex-row">
              <div className="p-3 rounded-2xl shadow-sm flex flex-col bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-br-none text-red-900 dark:text-red-100">
                <p className="text-sm leading-relaxed">{failedMessage}</p>
                <div className="flex items-center justify-end gap-3 mt-2 border-t border-red-200 dark:border-red-800/50 pt-1.5">
                  <span className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    Failed to send
                  </span>
                  <button onClick={() => handleSend(undefined, failedMessage)} className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline">
                    Retry
                  </button>
                  <button onClick={() => setFailedMessage(null)} className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* TYPING INDICATOR */}
        {isOtherTyping && (
          <div className="flex w-full justify-start items-center">
            <div className="px-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-white dark:bg-gray-950 border-t dark:border-gray-800 shrink-0" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto">
          <input
            type="text" 
            value={newMessage} 
            onChange={handleTyping} 
            placeholder="Type your message..."
            // 🌟 FIXED: Added text-gray-900 and explicitly styled the placeholder
            className="flex-1 px-5 py-3 bg-gray-100 text-gray-900 placeholder-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isSending} 
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {isSending ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}