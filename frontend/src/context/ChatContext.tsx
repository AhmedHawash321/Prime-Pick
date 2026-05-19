"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType>({
  messages: [],
  setMessages: () => {},
});

const STORAGE_KEY = "prime_pick_chat_messages";

const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content: "Welcome to Prime-Pick Support! How can I help you today?",
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with default message
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const isInitialized = useRef(false);

  // Load from sessionStorage on mount using a timeout to avoid synchronous setState warning
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (parsed.length > 0) {
          // Use setTimeout to move setState out of the effect's synchronous execution
          setTimeout(() => {
            setMessages(parsed);
          }, 0);
        }
      }
    } catch {
      // sessionStorage unavailable — keep default
    }
  }, []);

  // Save to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, [messages]);

  return (
    <ChatContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);