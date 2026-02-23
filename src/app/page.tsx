"use client";

import { Sidebar } from "../components/sidebar";
import { SignInButton, SignedIn, SignedOut, ClerkLoading } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ChatWindow } from "../components/chat-window";

export default function Home() {
  const [activeConversation, setActiveConversation] = useState<Id<"conversations"> | null>(null);

  return (
    <main className="flex h-screen w-full bg-white overflow-hidden">
      
      <ClerkLoading>
        <div className="flex w-full h-full items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ClerkLoading>

      <SignedOut>
        <div className="flex w-full h-full items-center justify-center bg-gray-50">
          <div className="p-8 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold mb-4">Welcome to Tars Chat</h1>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Sign In to Continue
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex h-screen w-full">
          
          {/* LEFT SIDE: Sidebar */}
          {/* Mobile: Hidden if chat is active. Desktop: Always block, fixed 80 width */}
          <div className={`${activeConversation ? "hidden md:block" : "block"} w-full md:w-80 h-full shrink-0`}>
            <Sidebar onSelectConversation={(id) => setActiveConversation(id)} />
          </div>

          {/* RIGHT SIDE: Chat Area */}
          {/* Mobile: Hidden if NO chat is active. Desktop: Always flex */}
          <div className={`${activeConversation ? "flex" : "hidden md:flex"} flex-1 flex-col bg-gray-50 h-full`}>
            {activeConversation ? (
              <ChatWindow 
                conversationId={activeConversation} 
                onBack={() => setActiveConversation(null)} // This clears the state, bringing the sidebar back!
              />
            ) : (
              <div className="flex-1 hidden md:flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-medium">Welcome!</h3>
                  <p className="mt-1">Select a user from the sidebar to start a conversation.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </SignedIn>
    </main>
  );
}