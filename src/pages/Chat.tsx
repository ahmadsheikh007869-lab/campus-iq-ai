import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Mic, MicOff, Trash2, MessageSquare, PanelLeftClose, PanelLeft, Pencil, Check, X, Eraser, PenLine, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const clearChat = async () => {
    if (!activeSession) return;
    await supabase.from("chat_messages").delete().eq("session_id", activeSession);
    setMessages([]);
  };

  const clearAllChats = async () => {
    for (const s of sessions) {
      await supabase.from("chat_messages").delete().eq("session_id", s.id);
      await supabase.from("chat_sessions").delete().eq("id", s.id);
    }
    setActiveSession(null);
    setMessages([]);
    setSessions([]);
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
        body: JSON.stringify({ messages: updatedMessages }),
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
      if (allMsgs && allMsgs.length > 3) {
        const toDelete = allMsgs.slice(0, allMsgs.length - 3).map((m) => m.id);
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
        body: JSON.stringify({ messages: newMessages }),
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
          if (allMsgs && allMsgs.length > 3) {
            const toDelete = allMsgs.slice(0, allMsgs.length - 3).map((m) => m.id);
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
  }, [activeSession, messages, loading]);

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
              <h2 className="font-semibold text-sm">Chat History</h2>
              <div className="flex gap-1">
                {sessions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Clear All Chats">
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Chats</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete all {sessions.length} chat(s)? This action cannot be undone.
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
                        if (editingId === s.id) return;
                        setTappedSession(showActions ? null : s.id);
                        selectSession(s.id);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
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
        <div className="flex items-center gap-2 border-b px-4 py-2">
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
          <div className="flex gap-1">
            {activeSession && messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Eraser className="h-3.5 w-3.5 mr-1" /> Clear Chat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to clear all messages in this conversation? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearChat}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {activeSession && (
              <Button variant="ghost" size="sm" onClick={createNewChat} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">
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
                      className="rounded-xl border bg-card p-3 text-left text-sm text-muted-foreground hover:bg-secondary transition-colors"
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
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
            <Button size="icon" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
