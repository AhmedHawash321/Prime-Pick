"use client";

import { useState, useRef, useEffect } from "react";
import {
  SendIcon,
  BotIcon,
  UserIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from "lucide-react";
import Link from "next/link";
import { useChat } from "@/context/ChatContext";

export default function ContactPage() {
  // Use shared messages and setMessages from ChatContext instead of local state
  const { messages, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Ref for auto-scrolling to bottom
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    // Update the shared global state with the user's message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      // Update the shared global state with the assistant's reply
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ||
            data.message ||
            "I'm having trouble connecting to my brain. Please try again!",
        },
      ]);
    } catch {
      // Update the shared global state with the error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "System error. Make sure the AI Agent server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base-100 flex flex-col items-center py-6 px-4">
      {/* Header Area */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/help" className="btn btn-ghost btn-sm rounded-xl gap-2">
          <ArrowLeftIcon className="size-4" /> Back to Help
        </Link>
        <div className="group flex items-center gap-3 cursor-default">
          {/* Icon Container - Spins around itself on hover */}
          <div className="bg-primary/10 p-2.5 rounded-2xl transition-all duration-700 group-hover:rotate-360 group-hover:bg-primary/20">
            <SparklesIcon className="size-5 text-primary" />
          </div>

          {/* Text - Remains consistent with no color change */}
          <div className="flex flex-col justify-start">
            <h1 className="font-black text-xl uppercase tracking-tighter">
              AI Assistant
            </h1>
            {/* Subtle status indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                Online & Ready
              </span>
            </div>
          </div>
        </div>
        {/* Empty div to maintain the flex spacing since delete button is removed */}
        <div className="w-20 hidden md:block"></div>
      </div>

      {/* Main Chat Container */}
      <div className="w-full max-w-4xl bg-base-200 rounded-[2.5rem] border border-base-content/5 shadow-2xl flex flex-col overflow-hidden h-[70vh]">
        {/* Messages Area - Displaying shared messages from context */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content"
                }`}
              >
                {msg.role === "user" ? (
                  <UserIcon className="size-5" />
                ) : (
                  <BotIcon className="size-5" />
                )}
              </div>

              {/* Bubble */}
              <div
                data-testid="chat-message" // Added test id for Playwright testing
                data-role={msg.role} // Data attribute to identify message role in tests
                className={`max-w-[75%] px-5 py-3 rounded-3xl text-sm md:text-base leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-content rounded-tr-none"
                    : "bg-base-100 text-base-content rounded-tl-none border border-base-content/5"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading Animation */}
          {loading && (
            <div className="flex gap-4 flex-row">
              <div className="size-10 rounded-2xl bg-base-300 flex items-center justify-center animate-pulse">
                <BotIcon className="size-5" />
              </div>
              <div className="bg-base-100 px-6 py-4 rounded-3xl rounded-tl-none border border-base-content/5 shadow-sm">
                <span className="loading loading-dots loading-md text-primary"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-base-300/50 border-t border-base-content/5">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything about our products..."
              className="input input-lg w-full rounded-2xl pr-16 bg-base-100 border-none shadow-inner focus:outline-primary/20"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 btn btn-primary btn-square btn-md rounded-xl shadow-lg shadow-primary/20"
            >
              <SendIcon className="size-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-base-content/40 mt-3 uppercase tracking-widest font-bold">
            Prime-Pick Intelligence Service Layer
          </p>
        </div>
      </div>
    </div>
  );
}
