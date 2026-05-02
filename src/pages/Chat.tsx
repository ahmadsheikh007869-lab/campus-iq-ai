import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Mic, MicOff, Trash2, MessageSquare, PanelLeftClose, PanelLeft, Pencil, Check, X, PenLine, Trash, CheckSquare, Square, Copy, RotateCcw, Share2, Settings, Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Message = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; created_at: string };
type ChatMode = "simple" | "expert" | "creative";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_HISTORY = 30;

// Generate 3 quick follow-up suggestions client-side from the assistant text + last user query.
function generateFollowUps(userQ: string, _assistantA: string): string[] {
  const q = (userQ || "").trim();
  if (!q) return [];
  return [
    `Explain this in simpler words`,
    `Give me a real-world example of "${q.slice(0, 60)}"`,
    `What should I learn next about this?`,
  ];
}

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editMsgContent, setEditMsgContent] = useState("");
  const [tappedSession, setTappedSession] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ChatMode>(() => (localStorage.getItem("iu_chat_mode") as ChatMode) || "expert");
  const [readAloud, setReadAloud] = useState<boolean>(() => localStorage.getItem("iu_read_aloud") === "1");
  const [scrollPct, setScrollPct] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>("");

  // Persist mode + read-aloud
  useEffect(() => { localStorage.setItem("iu_chat_mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("iu_read_aloud", readAloud ? "1" : "0"); }, [readAloud]);

  // Speak the latest assistant message when read-aloud is on (only when it's complete = not loading)
  useEffect(() => {
    if (!readAloud || loading || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenRef.current === last.content) return;
    lastSpokenRef.current = last.content;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(last.content.replace(/[*_`#>[\]()]/g, "").slice(0, 600));
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch {/* no-op */}
  }, [messages, loading, readAloud]);

  // Premium UI helpers — pure visual, no layout impact.
  const triggerRipple = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(span);
    setTimeout(() => span.remove(), 650);
  };

  const handleGlowMove = (e: React.MouseEvent<HTMLElement>) => {
    const t = e.currentTarget as HTMLElement;
    const rect = t.getBoundingClientRect();
    t.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    t.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Message copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Couldn't access clipboard.", variant: "destructive" });
    }
  };

  const shareMessage = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "IU Assistant", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Link sharing not supported", description: "Message copied instead." });
      }
    } catch {/* user cancelled */}
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setSessions(data);
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  };

  const selectSession = async (id: string) => {
    setActiveSession(id);
    await loadMessages(id);
    inputRef.current?.focus();
  };

  const createNewChat = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat" })
      .select()
      .single();
    if (data && !error) {
      setActiveSession(data.id);
      setMessages([]);
      await loadSessions();
      inputRef.current?.focus();
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("session_id", id);
    await supabase.from("chat_sessions").delete().eq("id", id);
    if (activeSession === id) {
      setActiveSession(null);
      setMessages([]);
    }
    await loadSessions();
  };


  const clearAllChats = async () => {
    for (const s of sessions) {
      await supabase.from("chat_messages").delete().eq("session_id", s.id);
      await supabase.from("chat_sessions").delete().eq("id", s.id);
    }
    setActiveSession(null);
    setMessages([]);
    setSessions([]);
    setSelectMode(false);
    setSelectedSessions(new Set());
  };

  const deleteSelectedSessions = async () => {
    for (const id of selectedSessions) {
      await supabase.from("chat_messages").delete().eq("session_id", id);
      await supabase.from("chat_sessions").delete().eq("id", id);
      if (activeSession === id) {
        setActiveSession(null);
        setMessages([]);
      }
    }
    setSelectedSessions(new Set());
    setSelectMode(false);
    await loadSessions();
  };

  const toggleSessionSelection = (id: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const renameSession = async (id: string) => {
    if (!editTitle.trim()) return;
    await supabase.from("chat_sessions").update({ title: editTitle.trim() }).eq("id", id);
    setEditingId(null);
    await loadSessions();
  };

  const editMessage = async (msgIdx: number) => {
    if (!editMsgContent.trim() || !activeSession || loading) return;
    
    // Keep messages up to the edited one (replace it), remove everything after
    const updatedMessages = messages.slice(0, msgIdx);
    const editedMsg: Message = { role: "user", content: editMsgContent.trim() };
    updatedMessages.push(editedMsg);
    
    setMessages(updatedMessages);
    setEditingMsgIdx(null);
    setEditMsgContent("");
    setLoading(true);

    // Delete all messages for this session and re-insert the kept ones
    await supabase.from("chat_messages").delete().eq("session_id", activeSession);
    for (const msg of updatedMessages) {
      await supabase.from("chat_messages").insert({
        session_id: activeSession,
        role: msg.role,
        content: msg.content,
      });
    }

    // Now get AI response for the edited message
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: updatedMessages, mode }),
      });

      if (!resp.ok || !resp.body) {
        const errMsg = resp.status === 429
          ? "Too many requests. Please wait a moment."
          : "Could not connect to AI. Please try again.";
        const finalMsgs = [...updatedMessages, { role: "assistant" as const, content: errMsg }];
        setMessages(finalMsgs);
        await supabase.from("chat_messages").insert({ session_id: activeSession, role: "assistant", content: errMsg });
        setLoading(false);
        return;
      }

      let assistantSoFar = "";
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > updatedMessages.length) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        await supabase.from("chat_messages").insert({
          session_id: activeSession,
          role: "assistant",
          content: assistantSoFar,
        });
      }
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    let sessionId = activeSession;
    if (!sessionId) {
      const { data } = await supabase
        .from("chat_sessions")
        .insert({ title: text.trim().slice(0, 50) })
        .select()
        .single();
      if (!data) return;
      sessionId = data.id;
      setActiveSession(sessionId);
      await loadSessions();
    }

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: text.trim(),
    });

    if (messages.length === 0) {
      await supabase
        .from("chat_sessions")
        .update({ title: text.trim().slice(0, 50) })
        .eq("id", sessionId);
      loadSessions();
    }

    // Enforce 3-message limit
    try {
      const { data: allMsgs } = await supabase
        .from("chat_messages")
        .select("id, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (allMsgs && allMsgs.length > MAX_HISTORY) {
        const toDelete = allMsgs.slice(0, allMsgs.length - MAX_HISTORY).map((m) => m.id);
        await supabase.from("chat_messages").delete().in("id", toDelete);
      }
    } catch (e) {
      console.error("Message cleanup error:", e);
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, mode }),
      });

      if (!resp.ok || !resp.body) {
        const errMsg =
          resp.status === 429
            ? "Too many requests. Please wait a moment."
            : resp.status === 402
              ? "Service credits needed. Please contact the administrator."
              : "Could not connect to AI. Please try again.";
        setMessages([...newMessages, { role: "assistant", content: errMsg }]);
        await supabase.from("chat_messages").insert({ session_id: sessionId, role: "assistant", content: errMsg });
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > newMessages.length) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: assistantSoFar,
        });
        try {
          const { data: allMsgs } = await supabase
            .from("chat_messages")
            .select("id, created_at")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });
          if (allMsgs && allMsgs.length > MAX_HISTORY) {
            const toDelete = allMsgs.slice(0, allMsgs.length - MAX_HISTORY).map((m) => m.id);
            await supabase.from("chat_messages").delete().in("id", toDelete);
          }
        } catch (e) {
          console.error("Message cleanup error:", e);
        }
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }, [activeSession, messages, loading, mode]);

  // Regenerate the last assistant reply by re-sending the prior user message.
  const regenerateLast = useCallback(async () => {
    if (loading || !activeSession || messages.length < 2) return;
    // Find last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const trimmed = messages.slice(0, lastUserIdx + 1);
    const lastUserText = trimmed[trimmed.length - 1].content;
    setMessages(trimmed);
    // Remove old assistant rows after this user msg in DB by clearing & re-inserting trimmed set
    await supabase.from("chat_messages").delete().eq("session_id", activeSession);
    for (const m of trimmed) {
      await supabase.from("chat_messages").insert({ session_id: activeSession, role: m.role, content: m.content });
    }
    // Re-trigger send by removing the last user msg from state then calling sendMessage
    setMessages(trimmed.slice(0, -1));
    await sendMessage(lastUserText);
  }, [messages, activeSession, loading, sendMessage]);

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r; r.start(); setListening(true);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return "Today";
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-r bg-secondary/30 overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h2 className="font-semibold text-sm">{selectMode ? `${selectedSessions.size} selected` : "Chat History"}</h2>
              <div className="flex gap-1">
                {selectMode ? (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete Selected" disabled={selectedSessions.size === 0}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete {selectedSessions.size} selected chat(s)? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteSelectedSessions}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectMode(false); setSelectedSessions(new Set()); }} title="Cancel">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {sessions.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectMode(true)} title="Select">
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {sessions.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Clear History">
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear History</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete all {sessions.length} chat(s)? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={clearAllChats}>Delete All</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createNewChat} title="New Chat">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((s) => {
                  const showActions = tappedSession === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                        activeSession === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"
                      }`}
                      onClick={() => {
                        if (selectMode) {
                          toggleSessionSelection(s.id);
                          return;
                        }
                        if (editingId === s.id) return;
                        setTappedSession(showActions ? null : s.id);
                        selectSession(s.id);
                      }}
                    >
                      {selectMode ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleSessionSelection(s.id); }} className="shrink-0">
                          {selectedSessions.has(s.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <MessageSquare className="h-4 w-4 shrink-0" />
                      )}
                      {editingId === s.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && renameSession(s.id)}
                            className="h-6 text-xs"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => renameSession(s.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground/60">{formatTime(s.created_at)}</p>
                          </div>
                          <div className={`flex gap-0.5 transition-all duration-200 ${showActions ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"}`}>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 transition-colors"
                              onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{s.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSession(s.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {sessions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
                )}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="relative flex items-center gap-2 border-b px-4 py-2">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-sm font-semibold">
              {activeSession ? sessions.find((s) => s.id === activeSession)?.title || "Chat" : "Integral University AI Assistant"}
            </h1>
          </div>
          {/* Mode switch */}
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-secondary p-0.5 text-xs" role="tablist" aria-label="Response mode">
            {(["simple", "expert", "creative"] as ChatMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-full transition-all capitalize ${mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={mode === m}
              >
                {m === "creative" ? <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{m}</span> : m}
              </button>
            ))}
          </div>
          {/* Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <div className="text-sm font-semibold">Settings</div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="read-aloud" className="text-sm flex items-center gap-2">
                    {readAloud ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    Read replies aloud
                  </Label>
                  <Switch id="read-aloud" checked={readAloud} onCheckedChange={(v) => {
                    setReadAloud(v);
                    if (!v && typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                  }} />
                </div>
                <div className="sm:hidden space-y-1.5">
                  <Label className="text-sm">Mode</Label>
                  <div className="flex gap-1 rounded-full bg-secondary p-0.5 text-xs">
                    {(["simple", "expert", "creative"] as ChatMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 px-2 py-1 rounded-full transition-all capitalize ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {activeSession && (
            <Button variant="ghost" size="sm" onClick={createNewChat} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
            </Button>
          )}
          {/* Scroll progress bar */}
          <div
            className="absolute left-0 bottom-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary transition-[width] duration-150"
            style={{ width: `${scrollPct}%` }}
            aria-hidden
          />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" onScrollCapture={(e) => {
          const t = e.currentTarget.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
          if (!t) return;
          const max = t.scrollHeight - t.clientHeight;
          setScrollPct(max > 0 ? Math.min(100, (t.scrollTop / max) * 100) : 0);
        }}>
          <div ref={scrollRootRef} className="mx-auto max-w-3xl px-4 py-6">
            {!activeSession && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to IU Assistant</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Ask me anything about Integral University — admissions, courses, fees, campus life, research, and more.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    "What courses does Integral University offer?",
                    "Tell me about the admission process",
                    "What are the fee structures?",
                    "What facilities are available on campus?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      onMouseMove={handleGlowMove}
                      onMouseDown={triggerRipple}
                      className="ripple-btn glow-follow hover-lift rounded-xl border bg-card p-3 text-left text-sm text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className={`animate-msg-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="group relative max-w-[80%]">
                      {editingMsgIdx === i && msg.role === "user" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editMsgContent}
                            onChange={(e) => setEditMsgContent(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && editMessage(i)}
                            className="flex-1 text-sm"
                            autoFocus
                          />
                          <Button size="icon" className="h-8 w-8" onClick={() => editMessage(i)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMsgIdx(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                              msg.role === "user"
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                          {msg.role === "user" && !loading && (
                            <button
                              onClick={() => { setEditingMsgIdx(i); setEditMsgContent(msg.content); }}
                              className="absolute -bottom-5 right-0 hidden group-hover:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <PenLine className="h-3 w-3" /> Edit
                            </button>
                          )}
                          {msg.role === "assistant" && !(loading && i === messages.length - 1) && (
                            <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyToClipboard(msg.content)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                title="Copy"
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                              {i === messages.length - 1 && (
                                <button
                                  onClick={regenerateLast}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                                  title="Regenerate"
                                >
                                  <RotateCcw className="h-3 w-3" /> Regenerate
                                </button>
                              )}
                              <button
                                onClick={() => shareMessage(msg.content)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                title="Share"
                              >
                                <Share2 className="h-3 w-3" /> Share
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Smart follow-up suggestions */}
                {!loading && messages.length >= 2 && messages[messages.length - 1]?.role === "assistant" && (() => {
                  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
                  const ideas = generateFollowUps(lastUser, messages[messages.length - 1].content);
                  if (ideas.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ideas.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          onMouseMove={handleGlowMove}
                          onMouseDown={triggerRipple}
                          className="ripple-btn glow-follow hover-lift rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ✨ {q}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleVoice} className={listening ? "text-destructive" : ""}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about Integral University..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={(e) => { triggerRipple(e); sendMessage(input); }}
              onMouseMove={handleGlowMove}
              disabled={loading || !input.trim()}
              className={`ripple-btn glow-follow anim-border ${input.trim() && !loading ? "glow-pulse" : ""}`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
