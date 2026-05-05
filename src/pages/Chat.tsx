import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Mic, MicOff, Trash2, MessageSquare, PanelLeftClose, Pencil, Check, X, PenLine, Trash, CheckSquare, Square, Copy, RotateCcw, Share2, Settings, Volume2, VolumeX, Sparkles, MoreVertical, Pin, PinOff, Search, History, Image as ImageIcon, Camera, Brain, Globe, Telescope, FileUp, ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
type Session = { id: string; title: string; created_at: string; pinned?: boolean };
type ChatMode = "simple" | "expert" | "creative";
const MAX_PINNED = 10;

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [reactions, setReactions] = useState<Record<number, "up" | "down">>({});
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (data) setSessions(data as Session[]);
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

  const togglePin = async (id: string, current: boolean) => {
    if (!current) {
      const pinnedCount = sessions.filter((s) => s.pinned).length;
      if (pinnedCount >= MAX_PINNED) {
        toast({ title: "Pin limit reached", description: `You can pin up to ${MAX_PINNED} chats.`, variant: "destructive" });
        return;
      }
    }
    await supabase.from("chat_sessions").update({ pinned: !current }).eq("id", id);
    await loadSessions();
  };

  // Filter sessions by search; pinned still listed first because loadSessions ordered them.
  const visibleSessions = sessions.filter((s) =>
    !searchQuery.trim() || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Quick actions for the + tool panel: prefill the input with a directive prompt.
  const handlePlusAction = (kind: "think" | "research" | "web") => {
    setPlusOpen(false);
    const prefix =
      kind === "think"
        ? "[Thinking mode — reason step by step before answering] "
        : kind === "research"
          ? "[Deep research — be thorough, cite reasoning, give detailed structured answer] "
          : "[Web-style answer — give the most current general knowledge you have] ";
    setInput((prev) => prefix + prev);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Image / PDF / camera upload — extract real content the AI can use.
  const handleFile = async (file: File | null, hint: string) => {
    setPlusOpen(false);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files under 10MB.", variant: "destructive" });
      return;
    }
    // ----- IMAGE: attach as data URL for vision -----
    if (file.type.startsWith("image/")) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setAttachedImage({ name: file.name, dataUrl });
      toast({ title: "Image attached", description: `${file.name} — type your question and send.` });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    // ----- PDF: extract real text via pdfjs -----
    if (file.type === "application/pdf") {
      try {
        toast({ title: "Reading PDF...", description: "Extracting text, please wait." });
        const pdfjs = await import("pdfjs-dist");
        // Use the worker bundled with pdfjs-dist
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        (pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl;
        const arrayBuf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise;
        let full = "";
        const maxPages = Math.min(pdf.numPages, 30);
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const txt = content.items.map((it: any) => it.str).join(" ");
          full += `\n--- Page ${p} ---\n${txt}`;
        }
        const snippet = full.slice(0, 12000);
        setInput((prev) => `Based on this PDF "${file.name}" (${pdf.numPages} pages):\n${snippet}\n\nMy question: ` + prev);
        toast({ title: "PDF ready", description: `Read ${maxPages} of ${pdf.numPages} page(s).` });
        setTimeout(() => inputRef.current?.focus(), 0);
      } catch (err) {
        console.error("PDF parse error:", err);
        toast({ title: "Could not read PDF", description: "The file may be scanned or password-protected.", variant: "destructive" });
      }
      return;
    }
    // ----- Text/DOC fallback -----
    if (file.type.startsWith("text/") || /\.(txt|md|csv|json|log)$/i.test(file.name)) {
      const text = await file.text().catch(() => "");
      const snippet = text.slice(0, 8000);
      setInput((prev) => `Based on this document "${file.name}":\n${snippet}\n\nMy question: ` + prev);
      toast({ title: "Document attached", description: `${file.name} added to your prompt.` });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    toast({ title: "Unsupported file", description: "Try an image, PDF, or text file." });
  };

  // Re-ask the last user question with a length directive: short or detailed.
  const reaskWithStyle = async (style: "short" | "explain") => {
    if (loading || messages.length < 2) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const lastUserText = messages[lastUserIdx].content;
    const directive =
      style === "short"
        ? `Answer in 2-3 lines only — concise summary. Question: ${lastUserText}`
        : `Explain in detail with steps, examples and depth. Question: ${lastUserText}`;
    await sendMessage(directive);
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
        body: JSON.stringify({
          messages: attachedImage
            ? [
                ...newMessages.slice(0, -1),
                {
                  role: "user",
                  content: [
                    { type: "text", text: text.trim() || `Describe this image: ${attachedImage.name}` },
                    { type: "image_url", image_url: { url: attachedImage.dataUrl } },
                  ],
                },
              ]
            : newMessages,
          mode,
        }),
      });
      // Image is single-shot — clear after sending so it doesn't get re-sent.
      if (attachedImage) setAttachedImage(null);

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
                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                {visibleSessions.map((s) => {
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
                      ) : s.pinned ? (
                        <Pin className="h-4 w-4 shrink-0 text-primary" />
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
                              onClick={(e) => { e.stopPropagation(); togglePin(s.id, !!s.pinned); }}
                              title={s.pinned ? "Unpin" : "Pin"}
                            >
                              {s.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                            </Button>
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
                {visibleSessions.length === 0 && (
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
                <button
                  disabled={messages.length === 0}
                  onClick={() => {
                    const title = activeSession ? sessions.find((s) => s.id === activeSession)?.title || "chat" : "chat";
                    const md = messages
                      .map((m) => `### ${m.role === "user" ? "You" : "Assistant"}\n\n${m.content}\n`)
                      .join("\n---\n\n");
                    const blob = new Blob([`# ${title}\n\n${md}`], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="h-4 w-4" /> Export chat (.md)
                </button>
              </div>
            </PopoverContent>
          </Popover>
          {/* 3-dot menu: chat history + new chat + clear */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="More">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setSidebarOpen(true)}>
                <History className="h-4 w-4 mr-2" /> Chat history
              </DropdownMenuItem>
              <DropdownMenuItem onClick={createNewChat}>
                <Plus className="h-4 w-4 mr-2" /> New chat
              </DropdownMenuItem>
              {sessions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => { e.preventDefault(); }}
                    onClick={clearAllChats}
                  >
                    <Trash className="h-4 w-4 mr-2" /> Clear all chats
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div
                                className={`select-text rounded-2xl px-4 py-3 text-sm ${
                                  msg.role === "user"
                                    ? "rounded-br-md bg-primary text-primary-foreground"
                                    : "rounded-bl-md bg-secondary text-secondary-foreground"
                                }`}
                                style={{ WebkitTouchCallout: "none" }}
                              >
                                {msg.role === "assistant" ? (
                                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                  </div>
                                ) : (
                                  msg.content
                                )}
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuItem onClick={() => copyToClipboard(msg.content)}>
                                <Copy className="h-4 w-4 mr-2" /> Copy message
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => {
                                  const snippet = msg.content.replace(/\s+/g, " ").trim().slice(0, 240);
                                  setInput(`About this message: "${snippet}" — `);
                                  setTimeout(() => inputRef.current?.focus(), 0);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" /> Ask a follow-up about this
                              </ContextMenuItem>
                              {msg.role === "assistant" && (
                                <ContextMenuItem onClick={() => shareMessage(msg.content)}>
                                  <Share2 className="h-4 w-4 mr-2" /> Share
                                </ContextMenuItem>
                              )}
                              {msg.role === "user" && (
                                <ContextMenuItem
                                  onClick={() => { setEditingMsgIdx(i); setEditMsgContent(msg.content); }}
                                >
                                  <PenLine className="h-4 w-4 mr-2" /> Edit message
                                </ContextMenuItem>
                              )}
                            </ContextMenuContent>
                          </ContextMenu>
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
                                <>
                                  <button
                                    onClick={regenerateLast}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                                    title="Regenerate"
                                  >
                                    <RotateCcw className="h-3 w-3" /> Regenerate
                                  </button>
                                  <button
                                    onClick={() => reaskWithStyle("explain")}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                                    title="Detailed answer"
                                  >
                                    📖 Explain
                                  </button>
                                  <button
                                    onClick={() => reaskWithStyle("short")}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                                    title="Short answer"
                                  >
                                    ⚡ Short
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => shareMessage(msg.content)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                title="Share"
                              >
                                <Share2 className="h-3 w-3" /> Share
                              </button>
                              <button
                                onClick={() => {
                                  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
                                  if (speakingIdx === i) {
                                    window.speechSynthesis.cancel();
                                    setSpeakingIdx(null);
                                    return;
                                  }
                                  window.speechSynthesis.cancel();
                                  const u = new SpeechSynthesisUtterance(msg.content.replace(/[*_`#>[\]()]/g, "").slice(0, 800));
                                  u.onend = () => setSpeakingIdx((cur) => (cur === i ? null : cur));
                                  u.onerror = () => setSpeakingIdx((cur) => (cur === i ? null : cur));
                                  window.speechSynthesis.speak(u);
                                  setSpeakingIdx(i);
                                }}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                title={speakingIdx === i ? "Stop" : "Read aloud"}
                              >
                                {speakingIdx === i ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => setReactions((r) => ({ ...r, [i]: r[i] === "up" ? undefined as any : "up" }))}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${reactions[i] === "up" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                                title="Helpful"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setReactions((r) => ({ ...r, [i]: r[i] === "down" ? undefined as any : "down" }))}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${reactions[i] === "down" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="h-3 w-3" />
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
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">You might also ask:</p>
                      <div className="flex flex-wrap gap-2">
                        {ideas.map((q) => (
                          <button
                            key={q}
                            onClick={() => sendMessage(q)}
                            onMouseMove={handleGlowMove}
                            onMouseDown={triggerRipple}
                            className="ripple-btn glow-follow hover-lift rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            ➤ {q}
                          </button>
                        ))}
                      </div>
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
            {/* Hidden inputs for + panel uploads */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null, "Attached file")}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null, "Camera photo")}
            />
            {/* + Tool panel */}
            <Popover open={plusOpen} onOpenChange={setPlusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 transition-transform data-[state=open]:rotate-45"
                  title="Tools"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-2">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => { setPlusOpen(false); cameraInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <Camera className="h-5 w-5 text-primary" /> Camera
                  </button>
                  <button
                    onClick={() => { setPlusOpen(false); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <ImageIcon className="h-5 w-5 text-primary" /> Image
                  </button>
                  <button
                    onClick={() => { setPlusOpen(false); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <FileUp className="h-5 w-5 text-primary" /> File
                  </button>
                  <button
                    onClick={() => handlePlusAction("think")}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <Brain className="h-5 w-5 text-primary" /> Thinking
                  </button>
                  <button
                    onClick={() => handlePlusAction("research")}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <Telescope className="h-5 w-5 text-primary" /> Research
                  </button>
                  <button
                    onClick={() => handlePlusAction("web")}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-secondary transition-colors"
                  >
                    <Globe className="h-5 w-5 text-primary" /> Web
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={toggleVoice} className={listening ? "text-destructive" : ""}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask anything..."
              className="flex-1"
              disabled={loading}
              spellCheck
              autoCorrect="on"
              autoCapitalize="sentences"
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
