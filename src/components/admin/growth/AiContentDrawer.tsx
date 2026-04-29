import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/growth-ai`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  type?: string;
  taskTitle?: string;
  taskDescription?: string;
  onMarkDone?: () => void;
}

export function AiContentDrawer({ open, onOpenChange, title, type, taskTitle, taskDescription, onMarkDone }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    setContent("");
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: ac.signal,
        body: JSON.stringify({
          mode: "content",
          context: { task_type: type, task_title: taskTitle, task_description: taskDescription },
        }),
      });
      if (resp.status === 429) { toast({ title: "Trop de requêtes", description: "Réessayez dans un instant", variant: "destructive" }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "Crédits IA épuisés", description: "Ajoutez des crédits dans Workspace > Usage", variant: "destructive" }); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
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
            if (c) { acc += c; setContent(acc); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
        toast({ title: "Erreur IA", description: String(e), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !content) generate();
    if (!open) abortRef.current?.abort();
  }, [open]);

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast({ title: "Copié", description: "Contenu dans le presse-papier" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </SheetTitle>
          {type && <Badge variant="secondary" className="w-fit">{type}</Badge>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto my-4 p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap font-mono">
          {content || (loading ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</span> : <span className="text-muted-foreground">En attente…</span>)}
        </div>
        <div className="flex gap-2 mt-auto">
          <Button onClick={copy} disabled={!content} variant="outline" className="flex-1 gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copier
          </Button>
          {onMarkDone && (
            <Button onClick={() => { onMarkDone(); onOpenChange(false); }} disabled={!content} variant="default" className="flex-1">
              Marquer fait
            </Button>
          )}
          <Button onClick={generate} disabled={loading} variant="ghost" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
