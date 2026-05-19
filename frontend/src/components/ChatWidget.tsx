"use client";

import { useState, useEffect, useRef } from "react"; // Added useEffect and useRef
import { MessageCircleIcon, XIcon, SendIcon, BotIcon } from "lucide-react";
import { useChat } from "@/context/ChatContext"; 

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Reference for the bottom of the messages list
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to scroll the view to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Trigger scroll whenever messages change or loading state starts/ends
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Sorry, I couldn't process that.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle btn-lg shadow-2xl"
      >
        {isOpen ? (
          <XIcon className="size-6" />
        ) : (
          <MessageCircleIcon className="size-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-125 bg-base-200 rounded-4xl shadow-2xl border border-base-content/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center gap-3 shrink-0">
            <BotIcon className="size-6 text-primary-content" />
            <div>
              <p className="font-black text-primary-content text-sm">
                Prime-Pick Assistant
              </p>
              <p className="text-primary-content/70 text-xs">
                Powered by Ollama AI
              </p>
            </div>
          </div>

          {/* Messages display area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  data-testid="chat-message"
                  data-role={msg.role}
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm font-medium ${
                    msg.role === "user"
                      ? "bg-primary text-primary-content rounded-br-none"
                      : "bg-base-300 text-base-content rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-base-300 px-4 py-3 rounded-2xl rounded-bl-none">
                  <span className="loading loading-dots loading-sm" />
                </div>
              </div>
            )}
            {/* Invisible element to serve as scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-base-content/10 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about products..."
              className="input input-bordered flex-1 input-sm rounded-xl"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="btn btn-primary btn-sm btn-square rounded-xl"
            >
              <SendIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}