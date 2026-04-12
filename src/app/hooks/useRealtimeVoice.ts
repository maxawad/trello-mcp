"use client";

import { useRef, useState, useCallback } from "react";
import type { Project } from "../components/types";
import { TOOL_DEFINITIONS, executeTool } from "../components/tools";
import { generateDigest } from "../components/digest";
import { AGENTS } from "../data/agents";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
}

interface UseRealtimeVoiceOptions {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const SAMPLE_RATE = 24000;

export function useRealtimeVoice({
  project,
  onProjectUpdate,
}: UseRealtimeVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputLevel, setInputLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const projectRef = useRef(project);
  projectRef.current = project;

  const currentTranscript = useRef("");
  const currentUserTranscript = useRef("");
  const aiSpeakingRef = useRef(false);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const unmuteMicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const sendJSON = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const updateSystemInstructions = useCallback(
    (proj: Project) => {
      const digest = generateDigest(proj);
      const agentList = AGENTS.map((a) => `${a.id}: ${a.name} (${a.title})`).join(", ");
      sendJSON({
        type: "session.update",
        session: {
          instructions: `You are a project management assistant for "${proj.name}". You help the user manage their Kanban board by moving tasks, editing details, adding new tasks, assigning agents to tasks, and providing summaries. Be concise and conversational. When the user asks to move, edit, or create tasks, use the available tools. When the user wants to assign work to someone, use the assign_task tool. When the user gives feedback or suggestions about the app's UI or features, use the submit_feedback tool to save it.\n\nAvailable agents: ${agentList}\n\nCurrent project state:\n\n${digest}`,
          tools: TOOL_DEFINITIONS,
        },
      });
    },
    [sendJSON]
  );

  const startPlayback = useCallback(
    (base64Audio: string) => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (unmuteMicTimeoutRef.current) {
        clearTimeout(unmuteMicTimeoutRef.current);
        unmuteMicTimeoutRef.current = null;
      }

      setIsAISpeaking(true);
      aiSpeakingRef.current = true;

      const raw = atob(base64Audio);
      const buf = new ArrayBuffer(raw.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

      const int16 = new Int16Array(buf);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      const audioBuffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    },
    []
  );

  const interruptPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try { source.stop(); } catch {}
    }
    activeSourcesRef.current = [];

    if (unmuteMicTimeoutRef.current) {
      clearTimeout(unmuteMicTimeoutRef.current);
      unmuteMicTimeoutRef.current = null;
    }

    nextPlayTimeRef.current = 0;
    setIsAISpeaking(false);
    aiSpeakingRef.current = false;
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "session.created":
          updateSystemInstructions(projectRef.current);
          break;

        case "session.updated":
          setIsConnected(true);
          setIsConnecting(false);
          break;

        case "input_audio_buffer.speech_started":
          interruptPlayback();
          break;

        case "response.audio.delta":
          if (data.delta) startPlayback(data.delta);
          break;

        case "response.audio.done": {
          const ctx = audioContextRef.current;
          if (ctx) {
            const remaining = Math.max(0, nextPlayTimeRef.current - ctx.currentTime);
            if (unmuteMicTimeoutRef.current) {
              clearTimeout(unmuteMicTimeoutRef.current);
            }
            unmuteMicTimeoutRef.current = setTimeout(() => {
              setIsAISpeaking(false);
              aiSpeakingRef.current = false;
              unmuteMicTimeoutRef.current = null;
            }, remaining * 1000 + 250);
          } else {
            setIsAISpeaking(false);
            aiSpeakingRef.current = false;
          }
          break;
        }

        case "response.audio_transcript.delta":
          currentTranscript.current += data.delta || "";
          break;

        case "response.audio_transcript.done":
          if (currentTranscript.current.trim()) {
            addMessage("assistant", currentTranscript.current.trim());
          }
          currentTranscript.current = "";
          break;

        case "response.text.delta":
          currentTranscript.current += data.delta || "";
          break;

        case "response.text.done":
          if (currentTranscript.current.trim()) {
            addMessage("assistant", currentTranscript.current.trim());
          }
          currentTranscript.current = "";
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (data.transcript?.trim()) {
            addMessage("user", data.transcript.trim());
          }
          break;

        case "response.function_call_arguments.done": {
          const toolName = data.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(data.arguments || "{}");
          } catch {
            args = {};
          }

          const result = executeTool(
            toolName,
            args,
            projectRef.current
          );

          if (result.updatedProject) {
            projectRef.current = result.updatedProject;
            onProjectUpdate(result.updatedProject);
            setTimeout(
              () => updateSystemInstructions(result.updatedProject!),
              100
            );
          }

          addMessage("system", `Tool: ${toolName} → ${result.output}`);

          sendJSON({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: result.output,
            },
          });
          sendJSON({ type: "response.create" });
          break;
        }

        case "error":
          console.error("Realtime API error:", data.error);
          addMessage("system", `Error: ${data.error?.message || "Unknown"}`);
          break;
      }
    },
    [
      addMessage,
      sendJSON,
      startPlayback,
      interruptPlayback,
      onProjectUpdate,
      updateSystemInstructions,
    ]
  );

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setIsConnecting(true);

    try {
      const tokenRes = await fetch("/api/realtime/session", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to get session token");
      const session = await tokenRes.json();

      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`,
        ["realtime", `openai-insecure-api-key.${session.client_secret.value}`, "openai-beta.realtime-v1"]
      );

      ws.onopen = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);

          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
          setInputLevel(Math.sqrt(sum / input.length));

          if (aiSpeakingRef.current) return;

          const int16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          sendJSON({
            type: "input_audio_buffer.append",
            audio: base64,
          });
        };

        source.connect(processor);
        processor.connect(ctx.destination);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        cleanup();
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onerror = () => {
        cleanup();
        setIsConnected(false);
        setIsConnecting(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Connection error:", err);
      setIsConnecting(false);
      addMessage(
        "system",
        `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }, [handleMessage, sendJSON, addMessage]);

  function cleanup() {
    for (const source of activeSourcesRef.current) {
      try { source.stop(); } catch {}
    }
    activeSourcesRef.current = [];

    if (unmuteMicTimeoutRef.current) {
      clearTimeout(unmuteMicTimeoutRef.current);
      unmuteMicTimeoutRef.current = null;
    }

    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    wsRef.current = null;
    nextPlayTimeRef.current = 0;
  }

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    cleanup();
    setIsConnected(false);
    setIsAISpeaking(false);
  }, []);

  const sendText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      addMessage("user", text.trim());
      sendJSON({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: text.trim() }],
        },
      });
      sendJSON({ type: "response.create" });
    },
    [sendJSON, addMessage]
  );

  const refreshDigest = useCallback(() => {
    if (isConnected) {
      updateSystemInstructions(projectRef.current);
    }
  }, [isConnected, updateSystemInstructions]);

  return {
    connect,
    disconnect,
    sendText,
    refreshDigest,
    isConnected,
    isConnecting,
    isAISpeaking,
    messages,
    inputLevel,
  };
}
