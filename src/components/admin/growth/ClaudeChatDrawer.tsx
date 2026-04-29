import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/growth-ai`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: { users: number; pending_tasks: number; pace: string };
  onTaskCreated?: () => void;
}

type Msg = { role: "user" | "assistant"; content: string; created_at?: string };

export function ClaudeChatDrawer({ open, onOpenChange, context, onTaskCreated }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger l'historique à l'ouverture
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    const loadHistory = async () => {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("growth_chat_messages")
        .select("role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!error && data) setMessages(data as Msg[]);
      setLoadingHistory(false);
    };
    loadHistory();
  }, [open]);

  // Auto-scroll en bas
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const persistMessage = async (msg: Msg) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("growth_chat_messages").insert({
      user_id: userData.user.id,
      role: msg.role,
      content: msg.content,
    });
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const promptText = input;
    setInput("");
    setLoading(true);
    persistMessage(userMsg);

    const ac = new AbortController();
    abortRef.current = ac;
    let acc = "";
    try {
      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: ac.signal,
        body: JSON.stringify({
          mode: "chat",
          context,
          history: messages,
          prompt: promptText,
        }),
      });
      if (resp.status === 429) { toast({ title: "Trop de requêtes", variant: "destructive" }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "Crédits IA épuisés", variant: "destructive" }); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      setMessages(m => [...m, { role: "assistant", content: "" }]);
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: acc } : msg));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      if (acc) await persistMessage({ role: "assistant", content: acc });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ title: "Erreur IA", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addAsTask = async (text: string) => {
    const title = text.slice(0, 80);
    const { error } = await supabase.from("growth_tasks").insert({
      title,
      description: text,
      type: "Produit",
      priority: "Normal",
      due_date: new Date().toISOString().slice(0, 10),
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Tâche créée" }); onTaskCreated?.(); }
  };

  const clearHistory = async () => {
    if (!confirm("Effacer tout l'historique de la conversation ?")) return;
    const { error } = await supabase.from("growth_chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { setMessages([]); toast({ title: "Historique effacé" }); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Demander à Claude
            </span>
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearHistory} className="h-7 text-xs gap-1 text-muted-foreground">
                <Trash2 className="h-3 w-3" /> Effacer
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto my-4 space-y-3">
          {loadingHistory && (
            <div className="flex justify-center p-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <p className="text-sm text-muted-foreground p-3">Posez votre question — contexte injecté automatiquement. L'historique est conservé.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/40 mr-8"}`}>
              <div className="whitespace-pre-wrap">{m.content || <Loader2 className="h-4 w-4 animate-spin" />}</div>
              {m.created_at && (
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              {m.role === "assistant" && m.content && (
                <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs gap-1" onClick={() => addAsTask(m.content)}>
                  <Plus className="h-3 w-3" /> Ajouter comme tâche
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Posez votre question à Claude…"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
