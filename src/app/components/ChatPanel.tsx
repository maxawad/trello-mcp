"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "./types";
import type { ChatMessage } from "../hooks/useRealtimeVoice";
import { generateDigest } from "./digest";

interface ChatPanelProps {
  project: Project;
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  isAISpeaking: boolean;
  inputLevel: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendText: (text: string) => void;
}

export default function ChatPanel({
  project,
  messages,
  isConnected,
  isConnecting,
  isAISpeaking,
  inputLevel,
  onConnect,
  onDisconnect,
  onSendText,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [digestOpen, setDigestOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const digest = generateDigest(project);

  function handleSend() {
    if (!input.trim()) return;
    onSendText(input);
    setInput("");
  }

  return (
    <aside className="w-[380px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? isAISpeaking
                  ? "bg-purple-400 animate-pulse"
                  : "bg-green-400"
                : "bg-[var(--text-muted)]"
            }`}
          />
          <h3 className="text-sm font-semibold">Agent</h3>
        </div>
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isConnecting}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isConnected
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : isConnecting
                ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-wait"
                : "bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30"
          }`}
        >
          {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Connect Voice"}
        </button>
      </div>

      <div className="border-b border-[var(--border)]">
        <button
          onClick={() => setDigestOpen(!digestOpen)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <span>Project Digest</span>
          <span className="text-[var(--text-muted)]">
            {digestOpen ? "▼" : "▶"}
          </span>
        </button>
        {digestOpen && (
          <pre className="px-4 pb-3 text-[11px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
            {digest}
          </pre>
        )}
      </div>

      {isConnected && (
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isAISpeaking ? 'bg-purple-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {isAISpeaking ? 'AI speaking · mic muted' : 'Listening'}
            </span>
          </div>
          <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isAISpeaking ? 'bg-[var(--text-muted)] opacity-30' : 'bg-[var(--accent)]'
              }`}
              style={{ width: `${Math.min(inputLevel * 500, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-xs mt-8">
            <p>Connect voice or type a message.</p>
            <p className="mt-1">
              Try: &ldquo;Move the MCP task to Done&rdquo;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white rounded-br-sm"
                  : msg.role === "system"
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs font-mono rounded-bl-sm"
                    : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isAISpeaking && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl rounded-bl-sm px-3 py-2 flex gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" />
              <span
                className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isConnected
                ? "Type or speak..."
                : "Connect voice to enable tools..."
            }
            className="flex-1 min-w-0 bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] px-3 py-2 rounded-lg outline-none border border-[var(--border)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            className="px-3 py-2 bg-[var(--accent)] text-white text-sm rounded-lg disabled:opacity-30 hover:bg-[var(--accent-hover)] transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
